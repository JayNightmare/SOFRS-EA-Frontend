import { app, BrowserWindow, ipcMain } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import started from "electron-squirrel-startup";
// Health check is performed inline using node:http (import.meta.env is unavailable in main).

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
	app.quit();
}

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-sandbox");

if (!app.isPackaged) {
	app.commandLine.appendSwitch("no-sandbox");
}

const createWindow = () => {
	// Create the browser window.
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

	// and load the index.html of the app.
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

	// Lock the application into kiosk mode
	mainWindow.setKiosk(true);
};

// Ping health endpoint on app start to warm up the API and verify connectivity.
void (async () => {
	const baseUrl =
		process.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
	const apiKey = process.env.VITE_API_KEY ?? "";
	try {
		const http = await import("node:http");
		const url = new URL("/health", baseUrl);
		const req = http.request(
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

type FaceDetectionRequest = {
	tensor: number[];
	width: number;
	height: number;
	threshold?: number;
};

type FaceReasonCode =
	| "ok"
	| "no-face"
	| "multiple-faces"
	| "face-out-of-zone"
	| "model-error"
	| "invalid-input";

type FaceBox = {
	x: number;
	y: number;
	width: number;
	height: number;
	confidence: number;
};

type FaceDetectionResponse = {
	detected: boolean;
	confidence: number;
	modelReady: boolean;
	message: string;
	faceCount: number;
	reasonCode: FaceReasonCode;
	hasSingleForegroundFace: boolean;
	primaryFace: FaceBox | null;
	faces: FaceBox[];
};

type OnnxTensor = {
	data: Float32Array | Int32Array | Uint8Array;
	dims: number[];
};

type OnnxSession = {
	inputNames: string[];
	outputNames: string[];
	run: (
		feeds: Record<string, unknown>,
	) => Promise<Record<string, OnnxTensor>>;
};

type OnnxModule = {
	Tensor: new (
		type: string,
		data: Float32Array,
		dims: number[],
	) => unknown;
	InferenceSession: {
		create: (
			modelPath: string,
			options?: Record<string, unknown>,
		) => Promise<OnnxSession>;
	};
};

let faceSessionPromise: Promise<OnnxSession> | null = null;
let onnxModulePromise: Promise<OnnxModule> | null = null;

const loadOnnxModule = async (): Promise<OnnxModule> => {
	if (onnxModulePromise) {
		return onnxModulePromise;
	}

	const moduleName = "onnxruntime-node";
	onnxModulePromise = import(moduleName) as Promise<OnnxModule>;
	return onnxModulePromise;
};

const resolveModelPath = (): string => {
	if (process.env.YOLO_FACE_MODEL_PATH) {
		return process.env.YOLO_FACE_MODEL_PATH;
	}

	if (app.isPackaged) {
		return path.join(
			process.resourcesPath,
			"YOLOv26",
			"yolo26s.onnx",
		);
	}

	return path.join(app.getAppPath(), "YOLOv26", "yolo26s.onnx");
};

const ensureFaceSession = async (): Promise<OnnxSession> => {
	if (faceSessionPromise) {
		return faceSessionPromise;
	}

	faceSessionPromise = (async () => {
		const onnx = await loadOnnxModule();
		const modelPath = resolveModelPath();

		if (!fs.existsSync(modelPath)) {
			throw new Error(
				`ONNX model not found at: ${modelPath}`,
			);
		}

		return onnx.InferenceSession.create(modelPath, {
			executionProviders: ["cpu"],
			graphOptimizationLevel: "all",
		});
	})();

	try {
		return await faceSessionPromise;
	} catch (error) {
		faceSessionPromise = null;
		throw error;
	}
};

const getCandidateScore = (attributes: number[]): number => {
	if (attributes.length <= 4) {
		return 0;
	}

	if (attributes.length === 5) {
		return attributes[4];
	}

	const tail = attributes.slice(4);
	const rawMax = Math.max(...tail);
	const objectness = tail[0] ?? 0;
	const classMax =
		tail.length > 1 ? Math.max(...tail.slice(1)) : objectness;

	return Math.max(rawMax, objectness * classMax);
};

const sigmoid = (value: number): number => {
	if (!Number.isFinite(value)) {
		return 0;
	}

	return 1 / (1 + Math.exp(-value));
};

const normalizeScore = (value: number): number => {
	if (!Number.isFinite(value)) {
		return 0;
	}

	// Some YOLO exports emit logits; convert those to probabilities.
	if (value < 0 || value > 1) {
		return clamp01(sigmoid(value));
	}

	return clamp01(value);
};

const clamp01 = (value: number): number => {
	if (!Number.isFinite(value)) {
		return 0;
	}

	if (value < 0) {
		return 0;
	}

	if (value > 1) {
		return 1;
	}

	return value;
};

const getIntersectionOverUnion = (a: FaceBox, b: FaceBox): number => {
	const aRight = a.x + a.width;
	const aBottom = a.y + a.height;
	const bRight = b.x + b.width;
	const bBottom = b.y + b.height;

	const intersectX = Math.max(a.x, b.x);
	const intersectY = Math.max(a.y, b.y);
	const intersectRight = Math.min(aRight, bRight);
	const intersectBottom = Math.min(aBottom, bBottom);

	const intersectWidth = Math.max(0, intersectRight - intersectX);
	const intersectHeight = Math.max(0, intersectBottom - intersectY);
	const intersectArea = intersectWidth * intersectHeight;

	const aArea = a.width * a.height;
	const bArea = b.width * b.height;
	const union = aArea + bArea - intersectArea;

	if (union <= 0) {
		return 0;
	}

	return intersectArea / union;
};

const applyNms = (boxes: FaceBox[], iouThreshold = 0.45): FaceBox[] => {
	const sorted = [...boxes].sort(
		(left, right) => right.confidence - left.confidence,
	);
	const selected: FaceBox[] = [];

	for (const candidate of sorted) {
		const overlaps = selected.some(
			(chosen) =>
				getIntersectionOverUnion(candidate, chosen) >
				iouThreshold,
		);

		if (!overlaps) {
			selected.push(candidate);
		}
	}

	return selected;
};

const normalizeCandidateBox = (
	cx: number,
	cy: number,
	w: number,
	h: number,
	inputWidth: number,
	inputHeight: number,
): FaceBox => {
	const isAbsolute =
		Math.max(Math.abs(cx), Math.abs(cy), Math.abs(w), Math.abs(h)) >
		2;
	const nCx = isAbsolute ? cx / inputWidth : cx;
	const nCy = isAbsolute ? cy / inputHeight : cy;
	const nW = clamp01(Math.abs(isAbsolute ? w / inputWidth : w));
	const nH = clamp01(Math.abs(isAbsolute ? h / inputHeight : h));

	const boxLeft = clamp01(nCx - nW / 2);
	const boxTop = clamp01(nCy - nH / 2);

	return {
		x: boxLeft,
		y: boxTop,
		width: Math.min(nW, clamp01(1 - boxLeft)),
		height: Math.min(nH, clamp01(1 - boxTop)),
		confidence: 0,
	};
};

const extractFaceCandidates = (
	output: OnnxTensor,
	threshold: number,
	inputWidth: number,
	inputHeight: number,
): FaceBox[] => {
	const dims = output.dims;
	const data = output.data;

	if (
		!(data instanceof Float32Array) ||
		dims.length !== 3 ||
		dims[0] !== 1
	) {
		return [];
	}

	const dimensionA = dims[1];
	const dimensionB = dims[2];
	const candidates: FaceBox[] = [];

	if (dimensionA > dimensionB) {
		for (
			let candidate = 0;
			candidate < dimensionA;
			candidate += 1
		) {
			const offset = candidate * dimensionB;
			const x = data[offset] ?? 0;
			const y = data[offset + 1] ?? 0;
			const width = data[offset + 2] ?? 0;
			const height = data[offset + 3] ?? 0;
			const attributes = Array.from(
				data.slice(offset, offset + dimensionB),
			);
			const score = normalizeScore(
				getCandidateScore(attributes),
			);

			if (score >= threshold) {
				const box = normalizeCandidateBox(
					x,
					y,
					width,
					height,
					inputWidth,
					inputHeight,
				);
				box.confidence = score;
				candidates.push(box);
			}
		}

		return applyNms(candidates).slice(0, 5);
	}

	for (let candidate = 0; candidate < dimensionB; candidate += 1) {
		const attributes: number[] = [];

		for (let index = 0; index < dimensionA; index += 1) {
			attributes.push(
				data[index * dimensionB + candidate] ?? 0,
			);
		}

		const score = normalizeScore(getCandidateScore(attributes));

		if (score >= threshold) {
			const box = normalizeCandidateBox(
				attributes[0] ?? 0,
				attributes[1] ?? 0,
				attributes[2] ?? 0,
				attributes[3] ?? 0,
				inputWidth,
				inputHeight,
			);
			box.confidence = score;
			candidates.push(box);
		}
	}

	return applyNms(candidates).slice(0, 5);
};

const isForegroundFace = (face: FaceBox): boolean => {
	const area = face.width * face.height;
	const centerX = face.x + face.width / 2;
	const centerY = face.y + face.height / 2;
	const inFocusZone =
		centerX >= 0.18 &&
		centerX <= 0.82 &&
		centerY >= 0.15 &&
		centerY <= 0.85;

	return area >= 0.08 && inFocusZone;
};

const isPlausibleFaceCandidate = (face: FaceBox): boolean => {
	const area = face.width * face.height;
	const aspectRatio = face.width > 0 ? face.height / face.width : 0;
	const centerX = face.x + face.width / 2;
	const centerY = face.y + face.height / 2;
	const inBroadZone =
		centerX >= 0.08 &&
		centerX <= 0.92 &&
		centerY >= 0.08 &&
		centerY <= 0.92;

	if (!inBroadZone) {
		return false;
	}

	if (area < 0.04 || area > 0.72) {
		return false;
	}

	return aspectRatio >= 0.7 && aspectRatio <= 1.8;
};

const rankFaceCandidates = (faces: FaceBox[]): FaceBox[] => {
	const scored = faces.map((face) => {
		const area = face.width * face.height;
		const centerX = face.x + face.width / 2;
		const centerY = face.y + face.height / 2;
		const dx = centerX - 0.5;
		const dy = centerY - 0.5;
		const centerDistance = Math.sqrt(dx * dx + dy * dy);
		const centerScore = clamp01(1 - centerDistance / 0.72);
		const areaScore = clamp01(area / 0.18);
		const aspectRatio =
			face.width > 0 ? face.height / face.width : 0;
		const aspectScore = clamp01(
			1 - Math.abs(aspectRatio - 1) / 1.2,
		);
		const score =
			face.confidence * 0.55 +
			areaScore * 0.25 +
			centerScore * 0.15 +
			aspectScore * 0.05;

		return { face, score };
	});

	scored.sort((left, right) => right.score - left.score);
	return scored.map((entry) => entry.face);
};

const selectFaceCandidates = (faces: FaceBox[]): FaceBox[] => {
	const plausible = faces.filter(isPlausibleFaceCandidate);

	if (plausible.length > 0) {
		return rankFaceCandidates(plausible);
	}

	return rankFaceCandidates(faces);
};

const runFaceDetection = async (
	request: FaceDetectionRequest,
): Promise<FaceDetectionResponse> => {
	if (
		!request.tensor ||
		!Array.isArray(request.tensor) ||
		request.tensor.length === 0
	) {
		return {
			detected: false,
			confidence: 0,
			modelReady: false,
			message: "Invalid tensor payload.",
			faceCount: 0,
			reasonCode: "invalid-input",
			hasSingleForegroundFace: false,
			primaryFace: null,
			faces: [],
		};
	}

	const expectedLength = request.width * request.height * 3;

	if (request.tensor.length !== expectedLength) {
		return {
			detected: false,
			confidence: 0,
			modelReady: false,
			message: `Invalid tensor size. Expected ${expectedLength}, received ${request.tensor.length}.`,
			faceCount: 0,
			reasonCode: "invalid-input",
			hasSingleForegroundFace: false,
			primaryFace: null,
			faces: [],
		};
	}

	const session = await ensureFaceSession();
	const onnx = await loadOnnxModule();

	const inputName = session.inputNames[0];

	if (!inputName) {
		return {
			detected: false,
			confidence: 0,
			modelReady: false,
			message: "Model input is unavailable.",
			faceCount: 0,
			reasonCode: "model-error",
			hasSingleForegroundFace: false,
			primaryFace: null,
			faces: [],
		};
	}

	const inputTensor = new onnx.Tensor(
		"float32",
		Float32Array.from(request.tensor),
		[1, 3, request.height, request.width],
	);
	const outputs = await session.run({ [inputName]: inputTensor });
	const firstOutputName = session.outputNames[0];
	const firstOutput = firstOutputName
		? outputs[firstOutputName]
		: undefined;

	if (!firstOutput) {
		return {
			detected: false,
			confidence: 0,
			modelReady: false,
			message: "Model output is unavailable.",
			faceCount: 0,
			reasonCode: "model-error",
			hasSingleForegroundFace: false,
			primaryFace: null,
			faces: [],
		};
	}

	const threshold = request.threshold ?? 0.35;
	const detectedFaces = extractFaceCandidates(
		firstOutput,
		threshold,
		request.width,
		request.height,
	);
	const faces = selectFaceCandidates(detectedFaces).slice(0, 5);
	const primaryFace = faces[0] ?? null;
	const confidence = primaryFace?.confidence ?? 0;
	const hasSingleForegroundFace =
		primaryFace !== null &&
		faces.length === 1 &&
		isForegroundFace(primaryFace);

	let reasonCode: FaceReasonCode = "ok";
	let message = "Face detected";

	if (faces.length === 0) {
		reasonCode = "no-face";
		message = "No face detected";
	} else if (faces.length > 1) {
		reasonCode = "multiple-faces";
		message = "Multiple faces detected";
	} else if (!hasSingleForegroundFace) {
		reasonCode = "face-out-of-zone";
		message = "Move closer and center your face in frame";
	}

	return {
		detected: faces.length > 0,
		confidence,
		modelReady: true,
		message,
		faceCount: faces.length,
		reasonCode,
		hasSingleForegroundFace,
		primaryFace,
		faces,
	};
};

ipcMain.handle(
	"detector:face",
	async (
		_event,
		request: FaceDetectionRequest,
	): Promise<FaceDetectionResponse> => {
		try {
			return await runFaceDetection(request);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Unknown detection error";

			return {
				detected: false,
				confidence: 0,
				modelReady: false,
				message,
				faceCount: 0,
				reasonCode: "model-error",
				hasSingleForegroundFace: false,
				primaryFace: null,
				faces: [],
			};
		}
	},
);

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

			// Forward photo to all renderer windows
			for (const win of BrowserWindow.getAllWindows()) {
				win.webContents.send("relay:photo", payload);
			}

			// Acknowledge receipt to mobile
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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
	startRelayServer();
	createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
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
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});
