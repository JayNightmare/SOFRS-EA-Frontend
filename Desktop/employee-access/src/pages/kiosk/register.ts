import { ApiError, VisitorCreate, createVisitor, uploadImages } from "../../api";
import { createFacePane } from "../../components/face";
import { createKioskLayoutShell } from "../../components/kiosk-layout";
import { View, navigate } from "../../renderer";

type Tone = "ok" | "warn" | "error";

const EMPLOYEE_ID_PATTERN = /^EA[A-Za-z0-9]{6}$/;

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

const createRegisterCard = (
    title: string,
    description: string,
    buttonLabel: string,
    onSelect: () => void,
): HTMLElement => {
    const card = document.createElement("article");
    card.className = "register-choice-card";

    const heading = document.createElement("h3");
    heading.textContent = title;

    const copy = document.createElement("p");
    copy.textContent = description;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "action-btn primary";
    button.textContent = buttonLabel;
    button.addEventListener("click", onSelect);

    card.append(heading, copy, button);
    return card;
};

export const createKioskRegisterLandingScreen = (): View => {
    const { container, main } = createKioskLayoutShell("register", {
        showSystemStatus: true,
    });

    const section = document.createElement("section");
    section.className = "register-landing";

    const heading = document.createElement("header");
    heading.className = "register-landing-heading";
    heading.innerHTML = `
		<h2>Registration Center</h2>
		<p>Choose the registration flow that matches your role.</p>
	`;

    const cards = document.createElement("div");
    cards.className = "register-choice-grid";

    const visitorCard = createRegisterCard(
        "Visitor Register",
        "Create a visitor profile and optionally attach a face reference image.",
        "Open Visitor Register",
        () => {
            void navigate(createVisitorRegisterScreen);
        },
    );

    const employeeCard = createRegisterCard(
        "Employee Face Register",
        "Capture and upload a face sample for an existing employee ID.",
        "Open Employee Face Register",
        () => {
            void navigate(createEmployeeFaceRegisterScreen);
        },
    );

    cards.append(visitorCard, employeeCard);
    section.append(heading, cards);
    main.append(section);

    return { element: container };
};

export const createVisitorRegisterScreen = (): View => {
    const { container, main } = createKioskLayoutShell("register", {
        showSystemStatus: true,
    });

    const shell = document.createElement("section");
    shell.className = "register-shell";

    const formCard = document.createElement("article");
    formCard.className = "register-card";
    formCard.innerHTML = `
		<h2>Visitor Register</h2>
		<p>Create a visitor profile before issuing a temporary pass.</p>
	`;

    const form = document.createElement("form");
    form.className = "register-form";

    const fullNameLabel = document.createElement("label");
    fullNameLabel.className = "settings-field";
    fullNameLabel.textContent = "Full Name";
    const fullNameInput = document.createElement("input");
    fullNameInput.type = "text";
    fullNameInput.required = true;
    fullNameInput.placeholder = "Visitor full name";
    fullNameLabel.append(fullNameInput);

    const emailLabel = document.createElement("label");
    emailLabel.className = "settings-field";
    emailLabel.textContent = "Email (optional)";
    const emailInput = document.createElement("input");
    emailInput.type = "email";
    emailInput.placeholder = "visitor@example.com";
    emailLabel.append(emailInput);

    const phoneLabel = document.createElement("label");
    phoneLabel.className = "settings-field";
    phoneLabel.textContent = "Phone (optional)";
    const phoneInput = document.createElement("input");
    phoneInput.type = "tel";
    phoneInput.placeholder = "+1 555 000 0000";
    phoneLabel.append(phoneInput);

    const genderLabel = document.createElement("label");
    genderLabel.className = "settings-field";
    genderLabel.textContent = "Gender (optional)";
    const genderSelect = document.createElement("select");
    genderSelect.className = "register-select";
    [
        { value: "", label: "Prefer not to say" },
        { value: "male", label: "Male" },
        { value: "female", label: "Female" },
        { value: "other", label: "Other" },
    ].forEach((optionConfig) => {
        const option = document.createElement("option");
        option.value = optionConfig.value;
        option.textContent = optionConfig.label;
        genderSelect.append(option);
    });
    genderLabel.append(genderSelect);

    const status = document.createElement("p");
    status.className = "register-status";
    setStatus(status, "warn", "Capture a face image if available, then submit the registration form.");

    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.className = "action-btn primary";
    submitButton.textContent = "Register Visitor";

    form.append(
        fullNameLabel,
        emailLabel,
        phoneLabel,
        genderLabel,
        status,
        submitButton,
    );
    formCard.append(form);

    const cameraCard = document.createElement("article");
    cameraCard.className = "register-card register-camera-card";

    const cameraTitle = document.createElement("h3");
    cameraTitle.textContent = "Face Capture";

    const cameraCopy = document.createElement("p");
    cameraCopy.textContent = "Capture one clear front-facing image to attach to this visitor profile.";

    const camera = createFacePane();
    camera.element.classList.add("register-face-pane");

    const preview = document.createElement("img");
    preview.className = "register-capture-preview";
    preview.alt = "Captured face preview";

    const cameraActions = document.createElement("div");
    cameraActions.className = "register-actions";

    const captureButton = document.createElement("button");
    captureButton.type = "button";
    captureButton.className = "action-btn secondary";
    captureButton.textContent = "Capture Face";

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "action-btn secondary";
    clearButton.textContent = "Clear Capture";

    cameraActions.append(captureButton, clearButton);
    cameraCard.append(cameraTitle, cameraCopy, camera.element, preview, cameraActions);

    shell.append(formCard, cameraCard);
    main.append(shell);

    let capturedFace: Blob | null = null;
    let previewUrl: string | null = null;
    let submitting = false;

    const clearPreview = (): void => {
        capturedFace = null;
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = null;
        }
        preview.removeAttribute("src");
        preview.style.display = "none";
    };

    captureButton.addEventListener("click", async () => {
        captureButton.disabled = true;
        setStatus(status, "warn", "Capturing face image...");

        try {
            const blob = await camera.captureFrameBlob(640, 0.9);
            if (!blob) {
                setStatus(status, "error", "No camera frame available. Please align with the camera and try again.");
                return;
            }

            clearPreview();
            capturedFace = blob;
            previewUrl = URL.createObjectURL(blob);
            preview.src = previewUrl;
            preview.style.display = "block";
            setStatus(status, "ok", "Face image captured and ready for upload.");
        } finally {
            captureButton.disabled = false;
        }
    });

    clearButton.addEventListener("click", () => {
        clearPreview();
        setStatus(status, "warn", "Capture cleared. You can still register without a face image.");
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (submitting) {
            return;
        }

        const fullName = fullNameInput.value.trim();
        if (!fullName) {
            setStatus(status, "error", "Full name is required.");
            return;
        }

        const payload: VisitorCreate = { fullName };
        const email = emailInput.value.trim();
        const phone = phoneInput.value.trim();
        const gender = genderSelect.value.trim();

        if (email) {
            payload.email = email;
        }
        if (phone) {
            payload.Phone = phone;
        }
        if (gender) {
            payload.gender = gender;
        }

        submitting = true;
        submitButton.disabled = true;

        try {
            setStatus(status, "warn", "Creating visitor profile...");
            const visitor = await createVisitor(payload);

            if (capturedFace) {
                setStatus(status, "warn", `Uploading face image for ${visitor.id}...`);
                await uploadImages(visitor.id, [capturedFace]);
                setStatus(status, "ok", `Visitor ${visitor.fullName} registered as ${visitor.id} with face capture.`);
            } else {
                setStatus(status, "ok", `Visitor ${visitor.fullName} registered as ${visitor.id}.`);
            }

            form.reset();
            clearPreview();
        } catch (error) {
            setStatus(status, "error", toErrorMessage(error, "Failed to register visitor."));
        } finally {
            submitting = false;
            submitButton.disabled = false;
        }
    });

    return {
        element: container,
        onShow: async () => {
            await camera.start();
        },
        onHide: () => {
            camera.stop();
            clearPreview();
        },
    };
};

export const createEmployeeFaceRegisterScreen = (): View => {
    const { container, main } = createKioskLayoutShell("register", {
        showSystemStatus: true,
    });

    const shell = document.createElement("section");
    shell.className = "register-shell";

    const formCard = document.createElement("article");
    formCard.className = "register-card";
    formCard.innerHTML = `
		<h2>Employee Face Register</h2>
		<p>Enter Employee ID first, then capture and upload a face image.</p>
	`;

    const form = document.createElement("form");
    form.className = "register-form";

    const employeeIdLabel = document.createElement("label");
    employeeIdLabel.className = "settings-field";
    employeeIdLabel.textContent = "Employee ID";
    const employeeIdInput = document.createElement("input");
    employeeIdInput.type = "text";
    employeeIdInput.required = true;
    employeeIdInput.placeholder = "EA123456";
    employeeIdInput.autocomplete = "off";
    employeeIdInput.maxLength = 8;
    employeeIdLabel.append(employeeIdInput);

    const note = document.createElement("p");
    note.className = "register-note";
    note.textContent = "Employee ID must start with EA and contain 6 additional alphanumeric characters.";

    const status = document.createElement("p");
    status.className = "register-status";
    setStatus(status, "warn", "Capture a face image and submit to bind it to the employee account.");

    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.className = "action-btn primary";
    submitButton.textContent = "Upload Employee Face";

    form.append(employeeIdLabel, note, status, submitButton);
    formCard.append(form);

    const cameraCard = document.createElement("article");
    cameraCard.className = "register-card register-camera-card";

    const cameraTitle = document.createElement("h3");
    cameraTitle.textContent = "Face Capture";

    const cameraCopy = document.createElement("p");
    cameraCopy.textContent = "Use a clear, front-facing shot under good lighting for best verification accuracy.";

    const camera = createFacePane();
    camera.element.classList.add("register-face-pane");

    const preview = document.createElement("img");
    preview.className = "register-capture-preview";
    preview.alt = "Captured employee face preview";

    const cameraActions = document.createElement("div");
    cameraActions.className = "register-actions";

    const captureButton = document.createElement("button");
    captureButton.type = "button";
    captureButton.className = "action-btn secondary";
    captureButton.textContent = "Capture Face";

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "action-btn secondary";
    clearButton.textContent = "Clear Capture";

    cameraActions.append(captureButton, clearButton);
    cameraCard.append(cameraTitle, cameraCopy, camera.element, preview, cameraActions);

    shell.append(formCard, cameraCard);
    main.append(shell);

    let capturedFace: Blob | null = null;
    let previewUrl: string | null = null;
    let submitting = false;

    const clearPreview = (): void => {
        capturedFace = null;
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = null;
        }
        preview.removeAttribute("src");
        preview.style.display = "none";
    };

    captureButton.addEventListener("click", async () => {
        captureButton.disabled = true;
        setStatus(status, "warn", "Capturing face image...");

        try {
            const blob = await camera.captureFrameBlob(640, 0.9);
            if (!blob) {
                setStatus(status, "error", "No camera frame available. Please align with the camera and try again.");
                return;
            }

            clearPreview();
            capturedFace = blob;
            previewUrl = URL.createObjectURL(blob);
            preview.src = previewUrl;
            preview.style.display = "block";
            setStatus(status, "ok", "Face image captured and ready for upload.");
        } finally {
            captureButton.disabled = false;
        }
    });

    clearButton.addEventListener("click", () => {
        clearPreview();
        setStatus(status, "warn", "Capture cleared. Capture a new face image to proceed.");
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (submitting) {
            return;
        }

        const employeeId = employeeIdInput.value.trim().toUpperCase();
        employeeIdInput.value = employeeId;

        if (!EMPLOYEE_ID_PATTERN.test(employeeId)) {
            setStatus(status, "error", "Invalid Employee ID. Expected format: EA followed by 6 letters or digits.");
            return;
        }

        if (!capturedFace) {
            setStatus(status, "error", "Please capture a face image before uploading.");
            return;
        }

        submitting = true;
        submitButton.disabled = true;

        try {
            setStatus(status, "warn", `Uploading face image for ${employeeId}...`);
            await uploadImages(employeeId, [capturedFace]);
            setStatus(status, "ok", `Employee face image uploaded successfully for ${employeeId}.`);
            clearPreview();
        } catch (error) {
            setStatus(status, "error", toErrorMessage(error, "Failed to upload employee face image."));
        } finally {
            submitting = false;
            submitButton.disabled = false;
        }
    });

    return {
        element: container,
        onShow: async () => {
            await camera.start();
        },
        onHide: () => {
            camera.stop();
            clearPreview();
        },
    };
};
