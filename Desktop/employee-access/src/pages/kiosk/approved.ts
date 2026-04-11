import { View, navigate } from "../../renderer";
import { createKioskLayoutShell } from "../../components/kiosk-layout";
import { createKioskIdleScreen } from "./idle";
import { createKioskScanScreen } from "./scan";
import { createAdminDashboard } from "../admin/dashboard";
import { VerifyFaceResponse } from "../../services/verification";
import { svgIconHtml } from "../../components/icons";

export const createKioskApprovedScreen = (
	response: VerifyFaceResponse,
	mode: "check-in" | "check-out",
): View => {
	const { container, main } = createKioskLayoutShell(mode);

	// --- Feedback Content ---
	const body = document.createElement("div");
	body.className = "feedback-container";

	const iconBox = document.createElement("div");
	iconBox.className = "success-icon-box";
	iconBox.innerHTML = svgIconHtml("check");

	const nameFromRecord =
		(typeof response.employee?.fullname === "string" && response.employee.fullname) ||
		(typeof response.employee?.fullName === "string" && response.employee.fullName) ||
		"Verified User";

	const headings = document.createElement("div");
	headings.className = "feedback-headings";
	headings.innerHTML = `
    <h1>Welcome Back, <span>${nameFromRecord}</span></h1>
    <p>Access Granted</p>
  `;

	const cards = document.createElement("div");
	cards.className = "feedback-cards";

	const cardTime = document.createElement("div");
	cardTime.className = "feedback-card";
	cardTime.innerHTML = `<small><span class="icon">${svgIconHtml("clock")}</span> TIME IN</small><h3>${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</h3>`;

	const cardLoc = document.createElement("div");
	cardLoc.className = "feedback-card";
	cardLoc.innerHTML = `<small><span class="icon">${svgIconHtml("location")}</span> BUILDING</small><h3>North Wing • L4</h3>`;

	const cardVerif = document.createElement("div");
	cardVerif.className = "feedback-card";
	cardVerif.innerHTML = `<small><span class="icon">${svgIconHtml("verified")}</span> VERIFICATION</small><h3>Biometric ID</h3>`;

	cards.append(cardTime, cardLoc, cardVerif);

	const footer = document.createElement("div");
	footer.className = "unlocking-footer";
	footer.innerHTML = `<div class="unlocking-line"></div> WAITING FOR NEXT ACTION <div class="unlocking-line"></div>`;

	const actions = document.createElement("div");
	actions.className = "approved-actions";

	const scanAgainButton = document.createElement("button");
	scanAgainButton.className = "action-btn secondary";
	scanAgainButton.type = "button";
	scanAgainButton.textContent = "Scan Next Person";
	scanAgainButton.addEventListener("click", () => {
		void navigate(() => createKioskScanScreen(mode));
	});

	const returnHomeButton = document.createElement("button");
	returnHomeButton.className = "action-btn secondary";
	returnHomeButton.type = "button";
	returnHomeButton.textContent = "Return Home";
	returnHomeButton.addEventListener("click", () => {
		void navigate(createKioskIdleScreen);
	});

	const continueDashboardButton = document.createElement("button");
	continueDashboardButton.className = "action-btn primary";
	continueDashboardButton.type = "button";
	continueDashboardButton.textContent = "Continue To Dashboard";
	continueDashboardButton.addEventListener("click", () => {
		void navigate(createAdminDashboard);
	});

	console.log(`Approved Response: ${JSON.stringify(response)}`);
	console.log(`Is Employee ID a Visitor? ${response.employee?.id?.startsWith("VA")}`);
	actions.append(scanAgainButton, (response.employee?.id?.startsWith("VA") ? "" : continueDashboardButton), returnHomeButton);

	body.append(iconBox, headings, cards, footer, actions);
	main.append(body);

	return {
		element: container,
	};
};
