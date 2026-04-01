import { View, navigate } from "../../renderer";
import { createKioskScanScreen } from "./scan";
import { createAdminPinModal } from "./pin-modal";

const createSvgIcon = (svgPath: string, viewBox = "0 0 24 24") => {
	const svg = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"svg",
	);
	svg.setAttribute("viewBox", viewBox);
	svg.setAttribute("class", "kiosk-icon");

	const path = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"path",
	);
	path.setAttribute("d", svgPath);
	path.setAttribute("fill", "currentColor");

	svg.appendChild(path);
	return svg;
};

// Icons
const visitorIconPath =
	"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z";
const checkInIconPath =
	"M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33L4 19l6.74 6.74c.27.27.64.44 1.05.44h7.05c.78 0 1.44-.58 1.54-1.36l.54-5.46c.03-.28 0-.55-.1-.81l-1.98-2.68z";
const checkOutIconPath =
	"M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z";

export const createKioskIdleScreen = (): View => {
	const container = document.createElement("div");
	container.className = "kiosk-idle";

	// --- Header ---
	const header = document.createElement("header");
	header.className = "kiosk-header";

	const logoGroup = document.createElement("div");
	logoGroup.className = "logo-group";

	const logo = document.createElement("h1");
	logo.className = "company-logo";
	logo.textContent = "EmployeeAccess";

	// Hidden 5-tap gesture
	let tapCount = 0;
	let tapTimeout: null | NodeJS.Timeout = null;
	logo.addEventListener("click", () => {
		tapCount++;
		if (tapTimeout) clearTimeout(tapTimeout);

		if (tapCount >= 5) {
			tapCount = 0;
			// Trigger Admin PIN Modal Overlay
			document.body.appendChild(
				createAdminPinModal().element,
			);
		} else {
			tapTimeout = setTimeout(() => {
				tapCount = 0;
			}, 2000);
		}
	});

	const separator = document.createElement("span");
	separator.className = "header-separator";

	const statusEl = document.createElement("div");
	statusEl.className = "system-status";
	statusEl.innerHTML = '<span class="status-dot"></span> SYSTEM ONLINE';

	logoGroup.append(logo, separator, statusEl);

	const timeGroup = document.createElement("div");
	timeGroup.className = "time-group";

	const clockContainer = document.createElement("div");
	clockContainer.className = "clock-container";
	const timeEl = document.createElement("h2");
	timeEl.className = "current-time";
	const dateEl = document.createElement("p");
	dateEl.className = "current-date";

	const updateClock = () => {
		const now = new Date();
		timeEl.textContent = now.toLocaleTimeString("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
		});
		dateEl.textContent = now
			.toLocaleDateString("en-US", {
				weekday: "long",
				month: "short",
				day: "numeric",
			})
			.toUpperCase();
	};
	updateClock();
	const clockInterval = setInterval(updateClock, 1000);

	clockContainer.append(timeEl, dateEl);
	timeGroup.append(clockContainer); // Icons omitted for brevity

	header.append(logoGroup, timeGroup);

	// --- Main Content ---
	const main = document.createElement("main");
	main.className = "kiosk-main";

	const titleGroup = document.createElement("div");
	titleGroup.className = "kiosk-titles";
	const mainTitle = document.createElement("h1");
	mainTitle.className = "kiosk-h1";
	mainTitle.innerHTML = "Employee <span>Access</span>";
	const subTitle = document.createElement("p");
	subTitle.className = "kiosk-subtitle";
	subTitle.textContent =
		"Please tap below to start your shift or manage your visitor status.";

	titleGroup.append(mainTitle, subTitle);

	const actionGroup = document.createElement("div");
	actionGroup.className = "kiosk-actions";

	// Visitor Btn
	const visitorBtn = document.createElement("button");
	visitorBtn.className = "kiosk-btn secondary";
	visitorBtn.innerHTML = `
    <div class="icon-wrap">${createSvgIcon(visitorIconPath).outerHTML}</div>
    <h3>Visitor?</h3>
    <p>Register for a pass here.</p>
  `;

	// CheckIn Btn
	const checkInBtn = document.createElement("button");
	checkInBtn.className = "kiosk-btn primary";
	checkInBtn.innerHTML = `
    <div class="icon-wrap primary-icon">${createSvgIcon(checkInIconPath).outerHTML}</div>
    <h2>Tap to Check-In</h2>
  `;
	checkInBtn.addEventListener("click", () => {
		void navigate(() => createKioskScanScreen("check-in"));
	});

	// CheckOut Btn
	const checkOutBtn = document.createElement("button");
	checkOutBtn.className = "kiosk-btn secondary";
	checkOutBtn.innerHTML = `
    <div class="icon-wrap">${createSvgIcon(checkOutIconPath).outerHTML}</div>
    <h3>Checking Out?</h3>
    <p>Swipe your card to exit.</p>
  `;
	checkOutBtn.addEventListener("click", () => {
		void navigate(() => createKioskScanScreen("check-out"));
	});

	actionGroup.append(visitorBtn, checkInBtn, checkOutBtn);
	main.append(titleGroup, actionGroup);

	// --- Footer ---
	const footer = document.createElement("footer");
	footer.className = "kiosk-footer";

	const weather = document.createElement("div");
	weather.className = "footer-weather";
	weather.innerHTML = `☀️ <strong>12ºC</strong> PARTLY CLOUDY`;

	const version = document.createElement("div");
	version.className = "footer-version";
	version.innerHTML = `🛡️ Secure Kiosk Beta v0.0.5`;

	footer.append(weather, version);

	container.append(header, main, footer);

	return {
		element: container,
		onHide: () => {
			clearInterval(clockInterval);
		},
	};
};
