import { View, navigate } from "../../renderer";
import { createKioskLayoutShell } from "../../components/kiosk-layout";
import { createKioskScanScreen } from "./scan";
import { svgIconHtml } from "../../components/icons";
import { VerifyFaceResponse } from "../../services/verification";

/**
 * Maps reason codes to user-facing explanations.
 */
const REASON_LABELS: Record<string, string> = {
	"unknown-person": "Unrecognised individual — not enrolled in the system.",
	"low-similarity": "Face match confidence too low to grant access.",
	"no-face": "No face detected in the camera frame.",
	"multiple-faces": "Multiple faces detected — only one person at a time.",
	"service-error": "A system error occurred. Please try again.",
};

export const createKioskDeniedScreen = (
	response: VerifyFaceResponse,
	mode: "check-in" | "check-out",
): View => {
	const { container, main } = createKioskLayoutShell(mode);

	// --- Feedback Content ---
	const body = document.createElement("div");
	body.className = "feedback-container";

	const deniedBox = document.createElement("div");
	deniedBox.className = "denied-box";

	const iconBox = document.createElement("div");
	iconBox.className = "error-icon-box";
	iconBox.innerHTML = `
    <div class="icon">${svgIconHtml("close")}</div>
    <div class="label">Access Denied</div>
  `;

	const reasonText =
		REASON_LABELS[response.reasonCode] ?? response.message;

	const infoGroup = document.createElement("div");
	infoGroup.className = "denied-info";
	infoGroup.innerHTML = `
    <h2>Access Denied: Please see Reception</h2>
    <p>${reasonText}</p>
  `;

	const returnBtn = document.createElement("button");
	returnBtn.className = "action-btn secondary";
	returnBtn.textContent = "RETURN TO SCAN";
	returnBtn.addEventListener("click", () => {
		navigate(() => createKioskScanScreen(mode));
	});

	infoGroup.append(returnBtn);
	deniedBox.append(iconBox, infoGroup);

	body.append(deniedBox);
	main.append(body);

	return { element: container };
};
