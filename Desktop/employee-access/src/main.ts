import { app, BrowserWindow, ipcMain } from "electron";
import os from "node:os";
import path from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import started from "electron-squirrel-startup";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
	app.quit();
}

// Enable Chromium's FaceDetector API (Shape Detection) for renderer-side face detection.
app.commandLine.appendSwitch('enable-experimental-web-platform-features');
console.log("App launched with --enable-experimental-web-platform-features flag for FaceDetector support.");

// NOTE: Hardware acceleration is intentionally left enabled for
// performant video rendering and canvas operations.
// Only disable if you hit GPU driver crashes on specific hardware.

if (!app.isPackaged) {
	app.commandLine.appendSwitch("no-sandbox");
}

const createWindow = () => {
	const mainWindow = new BrowserWindow({
		width: 720,
		height: 1280,
		minWidth: 420,
		minHeight: 740,
		autoHideMenuBar: true,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
		},
	});

	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
	} else {
		mainWindow.loadFile(
			path.join(
				__dirname,
				`../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`,
			),
		);
	}

	mainWindow.webContents.session.setPermissionRequestHandler(
		(_, permission, callback) => {
			const allowedPermissions = new Set(["media"]);
			callback(allowedPermissions.has(permission));
		},
	);

	mainWindow.setKiosk(true);

	let allowWindowClose = false;
	mainWindow.on("close", (event) => {
		if (allowWindowClose) {
			return;
		}

		event.preventDefault();
		mainWindow.webContents.send("app:closing");

		setTimeout(() => {
			if (mainWindow.isDestroyed()) {
				return;
			}

			allowWindowClose = true;
			mainWindow.close();
		}, 450);
	});
};

// Ping health endpoint on app start to warm up the API and verify connectivity.
void (async () => {
	const baseUrl =
		import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
	const apiKey = import.meta.env.VITE_API_KEY ?? "";
	try {
		const url = new URL("/health", baseUrl);
		const secure = url.protocol === "https:" ? await import("node:https") : await import("node:http");
		const req = secure.request(
			url,
			{
				method: "GET",
				headers: { "X-API-Key": apiKey },
				timeout: 5000,
			},
			(res) => {
				let body = "";
				res.on("data", (chunk: Buffer) => {
					body += chunk.toString();
				});
				res.on("end", () => {
					try {
						const data = JSON.parse(body);
						if (data.status !== "healthy") {
							console.error(
								"API health check returned unhealthy status:",
								data,
							);
						} else {
							console.log("API health check successful:", data);
						}
					} catch {
						console.error(
							"API health check returned non-JSON response.",
						);
					}
				});
			},
		);
		req.on("error", (err: Error) => {
			console.error(
				"API health check failed on initial load:",
				err.message,
			);
		});
		req.end();
	} catch (err) {
		console.error(
			"API health check failed on initial load. Please check backend connectivity.",
			err,
		);
	}
})();

// ─── WebSocket Relay Server (Mobile Camera Fallback) ───
let relayPort = 0;
let relayServer: WebSocketServer | null = null;

const startRelayServer = (): void => {
	if (relayServer) return;

	relayServer = new WebSocketServer({ port: 0, host: "0.0.0.0" });

	relayServer.on("listening", () => {
		const addr = relayServer?.address();
		if (addr && typeof addr === "object") {
			relayPort = addr.port;
			console.log(
				`Relay WebSocket server listening on port ${relayPort}`,
			);
		}
	});

	relayServer.on("connection", (socket: WebSocket) => {
		console.log("Mobile device connected to relay.");

		socket.on("message", (data: Buffer | string) => {
			const payload =
				typeof data === "string"
					? data
					: data.toString("utf-8");

			for (const win of BrowserWindow.getAllWindows()) {
				win.webContents.send("relay:photo", payload);
			}

			if (socket.readyState === WebSocket.OPEN) {
				socket.send(
					JSON.stringify({ status: "received" }),
				);
			}
		});

		socket.on("error", (err: Error) => {
			console.error("Relay socket error:", err.message);
		});
	});

	relayServer.on("error", (err: Error) => {
		console.error("Relay server error:", err.message);
		relayServer = null;
	});
};

const getLocalIpAddress = (): string => {
	const interfaces = os.networkInterfaces();
	for (const name of Object.keys(interfaces)) {
		const entries = interfaces[name];
		if (!entries) continue;
		for (const entry of entries) {
			if (entry.family === "IPv4" && !entry.internal) {
				return entry.address;
			}
		}
	}
	return "127.0.0.1";
};

ipcMain.handle("relay:getPort", (): number => {
	if (!relayServer) {
		startRelayServer();
	}
	return relayPort;
});

ipcMain.handle("relay:getLocalIp", (): string => {
	return getLocalIpAddress();
});

app.on("ready", () => {
	startRelayServer();
	createWindow();
});

app.on("window-all-closed", () => {
	if (relayServer) {
		relayServer.close();
		relayServer = null;
	}
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});
