import { navigate } from "../renderer";
import { createKioskIdleScreen } from "../pages/kiosk/idle";
import { createSvgIcon, ICON_PATHS, svgIconHtml } from "./icons";

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
	iconSpan.appendChild(createSvgIcon(iconPath));

	const labelSpan = document.createElement("span");
	labelSpan.className = "label";
	labelSpan.textContent = label;

	item.append(iconSpan, labelSpan);
	return item;
};

export interface SidebarNavElements {
	sidebar: HTMLElement;
	navHome: HTMLButtonElement;
	navCheckOut: HTMLButtonElement;
	navVisitor: HTMLButtonElement;
	navHelp: HTMLButtonElement;
}

/**
 * Builds the kiosk sidebar with SVG navigation items.
 */
export const createKioskSidebar = (
	mode: "check-in" | "check-out",
): SidebarNavElements => {
	const sidebar = document.createElement("aside");
	sidebar.className = "kiosk-sidebar";

	const navHome = createSidebarItem("Check In", ICON_PATHS.doorOpen, mode === "check-in");
	const navCheckOut = createSidebarItem("Check Out", ICON_PATHS.home, mode === "check-out");
	const navVisitor = createSidebarItem("Visitor", ICON_PATHS.people);
	const navHelp = createSidebarItem("Help", ICON_PATHS.info);

	const spacer = document.createElement("div");
	sidebar.append(navHome, navCheckOut, navVisitor, spacer, navHelp);

	return { sidebar, navHome, navCheckOut, navVisitor, navHelp };
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
      <button class="icon-btn">${svgIconHtml("help")}</button>
      <button class="icon-btn">${svgIconHtml("settings")}</button>
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
	mode: "check-in" | "check-out",
	options?: { showSystemStatus?: boolean; bindHomeNav?: boolean },
): KioskLayoutShell => {
	const container = document.createElement("div");
	container.className = "kiosk-scan-layout";

	const sidebar = createKioskSidebar(mode);
	const topBar = createKioskTopbar({
		showSystemStatus: options?.showSystemStatus,
	});

	if (options?.bindHomeNav) {
		sidebar.navHome.addEventListener("click", () =>
			navigate(createKioskIdleScreen),
		);
	}

	const main = document.createElement("main");
	main.className = "kiosk-scan-main";
	main.append(topBar);

	container.append(sidebar.sidebar, main);

	return { container, main, sidebar, topBar };
};
