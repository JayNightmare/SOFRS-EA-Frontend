import { navigate } from "../renderer";
// eslint-disable-next-line import/no-unresolved
import { createKioskHelpScreen } from "../pages/kiosk/help";
import { createKioskIdleScreen } from "../pages/kiosk/idle";
// eslint-disable-next-line import/no-unresolved
import { createKioskRegisterLandingScreen } from "../pages/kiosk/register";
// eslint-disable-next-line import/no-unresolved
import { createKioskSettingsScreen } from "../pages/kiosk/settings";
import { createSvgIcon, ICON_PATHS, svgIconHtml } from "./icons";

type KioskNavMode = "check-in" | "check-out" | "register" | "help";

const openHomeScreen = (): void => {
	void navigate(createKioskIdleScreen);
};

const openRegisterScreen = (): void => {
	void navigate(createKioskRegisterLandingScreen);
};

const openHelpScreen = (): void => {
	void navigate(createKioskHelpScreen);
};

const openSettingsScreen = (): void => {
	void navigate(createKioskSettingsScreen);
};

/**
 * Creates a sidebar navigation button with an SVG icon.
 */
const createSidebarItem = (
	label: string,
	iconPath: string,
	isActive = false,
): HTMLButtonElement => {
	const item = document.createElement("button");
	item.className = `sidebar-item ${isActive ? "active" : ""}`;

	const iconSpan = document.createElement("span");
	iconSpan.className = "icon";
	iconSpan.appendChild(createSvgIcon(iconPath, "0 0 24 24", "kiosk-icon", 22));

	const labelSpan = document.createElement("span");
	labelSpan.className = "label";
	labelSpan.textContent = label;

	item.append(iconSpan, labelSpan);
	return item;
};

export interface SidebarNavElements {
	sidebar: HTMLElement;
	navHome: HTMLButtonElement;
	navRegister: HTMLButtonElement;
	navHelp: HTMLButtonElement;
}

/**
 * Builds the kiosk sidebar with SVG navigation items.
 */
export const createKioskSidebar = (
	mode: KioskNavMode,
): SidebarNavElements => {
	const sidebar = document.createElement("aside");
	sidebar.className = "kiosk-sidebar";

	const navHome = createSidebarItem(
		"Check In",
		ICON_PATHS.doorOpen,
		mode === "check-in" || mode === "check-out",
	);
	const navRegister = createSidebarItem("Register", ICON_PATHS.people, mode === "register");
	const navHelp = createSidebarItem("Help", ICON_PATHS.info, mode === "help");

	const spacer = document.createElement("div");
	sidebar.append(navHome, navRegister, spacer, navHelp);

	return { sidebar, navHome, navRegister, navHelp };
};

/**
 * Builds the topbar header used inside the kiosk main content area.
 */
export const createKioskTopbar = (options?: {
	showSystemStatus?: boolean;
}): HTMLElement => {
	const topBar = document.createElement("header");
	topBar.className = "scan-topbar";

	const statusHtml = options?.showSystemStatus
		? '<div class="system-status"><span class="status-dot"></span> SYSTEM ONLINE</div>'
		: "";

	topBar.innerHTML = `
    <h1 class="company-logo">EmployeeAccess</h1>
    <div class="status-group">
      ${statusHtml}
			<button class="icon-btn" type="button" data-role="help">${svgIconHtml("help", "kiosk-icon", 18)}</button>
			<button class="icon-btn" type="button" data-role="settings">${svgIconHtml("settings", "kiosk-icon", 18)}</button>
      <div class="avatar-placeholder"></div>
    </div>
  `;

	return topBar;
};

export interface KioskLayoutShell {
	container: HTMLDivElement;
	main: HTMLElement;
	sidebar: SidebarNavElements;
	topBar: HTMLElement;
}

/**
 * Assembles the full kiosk page shell: sidebar + main area with topbar.
 * Each screen only needs to populate the main body content.
 */
export const createKioskLayoutShell = (
	mode: KioskNavMode,
	options?: { showSystemStatus?: boolean },
): KioskLayoutShell => {
	const container = document.createElement("div");
	container.className = "kiosk-scan-layout";

	const sidebar = createKioskSidebar(mode);
	const topBar = createKioskTopbar({
		showSystemStatus: options?.showSystemStatus,
	});

	const logo = topBar.querySelector<HTMLElement>(".company-logo");
	logo?.addEventListener("click", openHomeScreen);

	sidebar.navHome.addEventListener("click", openHomeScreen);
	sidebar.navRegister.addEventListener("click", openRegisterScreen);
	sidebar.navHelp.addEventListener("click", openHelpScreen);

	const helpButton = topBar.querySelector<HTMLButtonElement>(
		'button[data-role="help"]',
	);
	helpButton?.addEventListener("click", openHelpScreen);

	const settingsButton = topBar.querySelector<HTMLButtonElement>(
		'button[data-role="settings"]',
	);
	settingsButton?.addEventListener("click", openSettingsScreen);

	const main = document.createElement("main");
	main.className = "kiosk-scan-main";
	main.append(topBar);

	container.append(sidebar.sidebar, main);

	return { container, main, sidebar, topBar };
};
