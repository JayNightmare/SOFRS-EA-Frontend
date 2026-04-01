import { View, navigate } from "../../renderer";
import { createEmployeeManager } from "./employee-manager";
import { createVisitorManager } from "./visitor-manager";
import { createKioskIdleScreen } from "../kiosk/idle";

export const createAdminDashboard = (): View => {
	const container = document.createElement("div");
	container.className = "admin-layout";

	// --- Sidebar ---
	const sidebar = document.createElement("aside");
	sidebar.className = "admin-sidebar";

	const logo = document.createElement("h2");
	logo.className = "admin-logo";
	logo.textContent = "Admin Hub";

	const navContainer = document.createElement("nav");
	navContainer.className = "admin-nav";

	const linkEmployees = document.createElement("a");
	linkEmployees.className = "admin-nav-link active";
	linkEmployees.textContent = "Employees";

	const linkVisitors = document.createElement("a");
	linkVisitors.className = "admin-nav-link";
	linkVisitors.textContent = "Visitors";

	const linkSystem = document.createElement("a");
	linkSystem.className = "admin-nav-link text-danger";
	linkSystem.textContent = "Lock Kiosk";
	linkSystem.addEventListener("click", (e) => {
		e.preventDefault();
		void navigate(createKioskIdleScreen);
	});

	navContainer.append(linkEmployees, linkVisitors, linkSystem);
	sidebar.append(logo, navContainer);

	// --- Main Content ---
	const main = document.createElement("main");
	main.className = "admin-main";

	const contentWrapper = document.createElement("div");
	contentWrapper.className = "admin-content";

	main.append(contentWrapper);
	container.append(sidebar, main);

	// Router within the admin dashboard
	let currentAdminView: View | null = null;
	const loadAdminView = async (factory: () => View | Promise<View>) => {
		if (currentAdminView?.onHide) currentAdminView.onHide();
		contentWrapper.replaceChildren();

		const loading = document.createElement("div");
		loading.className = "admin-view-loading";
		loading.textContent = "Loading section...";
		contentWrapper.append(loading);

		const view = await factory();
		currentAdminView = view;
		contentWrapper.replaceChildren(view.element);

		if (view.onShow) await view.onShow();
	};

	// Nav Handlers
	linkEmployees.addEventListener("click", (e) => {
		e.preventDefault();
		document.querySelectorAll(".admin-nav-link").forEach((n) =>
			n.classList.remove("active"),
		);
		linkEmployees.classList.add("active");
		void loadAdminView(createEmployeeManager);
	});

	linkVisitors.addEventListener("click", (e) => {
		e.preventDefault();
		document.querySelectorAll(".admin-nav-link").forEach((n) =>
			n.classList.remove("active"),
		);
		linkVisitors.classList.add("active");
		void loadAdminView(createVisitorManager);
	});

	return {
		element: container,
		onShow: async () => {
			// Default load
			await loadAdminView(createEmployeeManager);
		},
		onHide: () => {
			if (currentAdminView?.onHide) currentAdminView.onHide();
		},
	};
};
