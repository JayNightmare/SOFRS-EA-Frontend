import { View, navigate } from "../../renderer";
import { createKioskScanScreen } from "./scan";
import { createAdminPinModal } from "./pin-modal";
import {
	createEmployeeFaceRegisterScreen,
	createVisitorRegisterScreen,
} from "./register";
import { createSvgIcon, ICON_PATHS, svgIconHtml } from "../../components/icons";
import { fetchWeather } from "../../services/weather";

// Read version from package.json at build time via Vite's JSON import
import packageJson from "../../../package.json";

const APP_VERSION = packageJson.version;

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
	timeGroup.append(clockContainer);

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
		"Please tap below to check in, register a visitor, or enroll an employee face profile.";

	titleGroup.append(mainTitle, subTitle);

	const actionGroup = document.createElement("div");
	actionGroup.className = "kiosk-actions";

	// Visitor Btn
	const visitorBtn = document.createElement("button");
	visitorBtn.className = "kiosk-btn secondary";
	visitorBtn.innerHTML = `
    <div class="icon-wrap">${createSvgIcon(ICON_PATHS.people).outerHTML}</div>
    <h3>Visitor?</h3>
    <p>Register for a pass here.</p>
  `;
	visitorBtn.addEventListener("click", () => {
		void navigate(createVisitorRegisterScreen);
	});

	// CheckIn Btn
	const checkInBtn = document.createElement("button");
	checkInBtn.className = "kiosk-btn primary";
	checkInBtn.innerHTML = `
    <div class="icon-wrap primary-icon">${createSvgIcon(ICON_PATHS.checkIn).outerHTML}</div>
    <h2>Tap to Check-In</h2>
  `;
	checkInBtn.addEventListener("click", () => {
		void navigate(() => createKioskScanScreen("check-in"));
	});

	// Employee Register Btn
	const employeeRegisterBtn = document.createElement("button");
	employeeRegisterBtn.className = "kiosk-btn secondary";
	employeeRegisterBtn.innerHTML = `
    <div class="icon-wrap">${createSvgIcon(ICON_PATHS.fingerprint).outerHTML}</div>
    <h3>Employee?</h3>
    <p>Register your face profile here.</p>
  `;
	employeeRegisterBtn.addEventListener("click", () => {
		void navigate(createEmployeeFaceRegisterScreen);
	});

	actionGroup.append(visitorBtn, checkInBtn, employeeRegisterBtn);
	main.append(titleGroup, actionGroup);

	// --- Footer ---
	const footer = document.createElement("footer");
	footer.className = "kiosk-footer";

	const weather = document.createElement("div");
	weather.className = "footer-weather";
	weather.innerHTML = `${svgIconHtml("cloudy")} <strong>--ºC</strong> LOADING...`;

	const version = document.createElement("div");
	version.className = "footer-version";
	version.innerHTML = `${svgIconHtml("shieldCheck")} <strong>v${APP_VERSION}</strong> <span class="footer-desc">Secure Kiosk</span>`;

	footer.append(weather, version);

	container.append(header, main, footer);

	// Fetch real weather data asynchronously
	void fetchWeather().then((data) => {
		weather.innerHTML = `${svgIconHtml(data.iconKey)} <strong>${data.temperatureC}ºC</strong> <span class="footer-desc">${data.description}</span>`;
	});

	return {
		element: container,
		onHide: () => {
			clearInterval(clockInterval);
		},
	};
};
