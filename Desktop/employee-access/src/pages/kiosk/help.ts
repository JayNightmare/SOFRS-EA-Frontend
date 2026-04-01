import { ApiError, submitHelpTicket } from "../../api";
import { createKioskLayoutShell } from "../../components/kiosk-layout";
import { View } from "../../renderer";

type Tone = "ok" | "warn" | "error";

const setStatus = (target: HTMLElement, tone: Tone, message: string): void => {
    target.dataset.tone = tone;
    target.textContent = message;
};

const toErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof ApiError) {
        return error.detail ? `${error.message}: ${error.detail}` : error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return fallback;
};

export const createKioskHelpScreen = (): View => {
    const { container, main } = createKioskLayoutShell("help", {
        showSystemStatus: true,
    });

    const shell = document.createElement("section");
    shell.className = "help-shell";

    const card = document.createElement("article");
    card.className = "register-card help-card";
    card.innerHTML = `
		<h2>Help & Support</h2>
		<p>Submit a support ticket and the operations team will receive it through Discord.</p>
	`;

    const form = document.createElement("form");
    form.className = "register-form";

    const nameField = document.createElement("label");
    nameField.className = "settings-field";
    nameField.textContent = "Your Name";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.required = true;
    nameInput.placeholder = "Full name";
    nameField.append(nameInput);

    const employeeIdField = document.createElement("label");
    employeeIdField.className = "settings-field";
    employeeIdField.textContent = "Employee ID (optional)";
    const employeeIdInput = document.createElement("input");
    employeeIdInput.type = "text";
    employeeIdInput.placeholder = "EA123456";
    employeeIdInput.autocomplete = "off";
    employeeIdField.append(employeeIdInput);

    const emailField = document.createElement("label");
    emailField.className = "settings-field";
    emailField.textContent = "Contact Email (optional)";
    const emailInput = document.createElement("input");
    emailInput.type = "email";
    emailInput.placeholder = "name@example.com";
    emailField.append(emailInput);

    const issueTypeField = document.createElement("label");
    issueTypeField.className = "settings-field";
    issueTypeField.textContent = "Issue Type";
    const issueTypeSelect = document.createElement("select");
    issueTypeSelect.className = "register-select";
    [
        "General Support",
        "Access Denied",
        "Hardware Issue",
        "Camera Problem",
        "System Offline",
    ].forEach((label) => {
        const option = document.createElement("option");
        option.value = label;
        option.textContent = label;
        issueTypeSelect.append(option);
    });
    issueTypeField.append(issueTypeSelect);

    const locationField = document.createElement("label");
    locationField.className = "settings-field";
    locationField.textContent = "Location";
    const locationInput = document.createElement("input");
    locationInput.type = "text";
    locationInput.value = "Main Lobby - East";
    locationField.append(locationInput);

    const messageField = document.createElement("label");
    messageField.className = "settings-field";
    messageField.textContent = "Describe the issue";
    const messageInput = document.createElement("textarea");
    messageInput.className = "help-textarea";
    messageInput.required = true;
    messageInput.rows = 5;
    messageInput.placeholder = "Please include what happened, when it happened, and any IDs shown on screen.";
    messageField.append(messageInput);

    const status = document.createElement("p");
    status.className = "register-status";
    setStatus(status, "warn", "Complete the form and submit to create a support ticket.");

    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.className = "action-btn primary";
    submitButton.textContent = "Submit Support Ticket";

    form.append(
        nameField,
        employeeIdField,
        emailField,
        issueTypeField,
        locationField,
        messageField,
        status,
        submitButton,
    );

    card.append(form);
    shell.append(card);
    main.append(shell);

    let submitting = false;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (submitting) {
            return;
        }

        const requesterName = nameInput.value.trim();
        const message = messageInput.value.trim();

        if (!requesterName) {
            setStatus(status, "error", "Name is required.");
            return;
        }

        if (!message) {
            setStatus(status, "error", "Issue description is required.");
            return;
        }

        submitting = true;
        submitButton.disabled = true;

        try {
            setStatus(status, "warn", "Submitting support ticket...");
            await submitHelpTicket({
                requesterName,
                requesterEmployeeId: employeeIdInput.value.trim(),
                requesterEmail: emailInput.value.trim(),
                issueType: issueTypeSelect.value,
                location: locationInput.value.trim(),
                message,
            });

            setStatus(status, "ok", "Support ticket submitted successfully. The team has been notified.");
            messageInput.value = "";
        } catch (error) {
            setStatus(status, "error", toErrorMessage(error, "Failed to submit support ticket."));
        } finally {
            submitting = false;
            submitButton.disabled = false;
        }
    });

    return { element: container };
};
