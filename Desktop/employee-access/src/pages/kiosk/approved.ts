import { View, navigate } from "../../renderer";
import { createKioskLayoutShell } from "../../components/kiosk-layout";
import { createKioskIdleScreen } from "./idle";
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

	const name = response.employee?.name || "Verified User";
	const firstName = name.split(" ")[0] || name;

	const headings = document.createElement("div");
	headings.className = "feedback-headings";
	headings.innerHTML = `
    <h1>Welcome Back, <span>${firstName}</span></h1>
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
	footer.innerHTML = `<div class="unlocking-line"></div> UNLOCKING... <div class="unlocking-line"></div>`;

	body.append(iconBox, headings, cards, footer);
	main.append(body);

	let timeout: ReturnType<typeof setTimeout>;

	return {
		element: container,
		onShow: () => {
			timeout = setTimeout(() => {
				navigate(createKioskIdleScreen);
			}, 5000);
		},
		onHide: () => {
			if (timeout) clearTimeout(timeout);
		},
	};
};
