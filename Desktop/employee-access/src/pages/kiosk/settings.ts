import { View, navigate } from "../../renderer";
import { createKioskLayoutShell } from "../../components/kiosk-layout";
import { createKioskIdleScreen } from "./idle";
import {
    getAppSettings,
    getDefaultAppSettings,
    resetAppSettings,
    resolveMobileSetupFallbackUrl,
    updateAppSettings,
} from "../../services/settings";

type CameraRequirementCheck = {
    label: string;
    current: string;
    required: string;
    passed: boolean;
};

type CameraDiagnostics = {
    passed: boolean;
    summary: string;
    checks: CameraRequirementCheck[];
};

const toNumericText = (value: number): string =>
    Number.isFinite(value) && value > 0 ? `${Math.round(value)}` : "Unknown";

const createCameraCheckItem = (check: CameraRequirementCheck): HTMLElement => {
    const row = document.createElement("li");
    row.className = "camera-check-item";
    row.dataset.tone = check.passed ? "ok" : "error";
    row.innerHTML = `
		<span class="camera-check-label">${check.label}</span>
		<span class="camera-check-values">${check.current} / ${check.required}</span>
	`;
    return row;
};

const runCameraDiagnostics = async (requirements: {
    minWidth: number;
    minHeight: number;
    minFps: number;
}): Promise<CameraDiagnostics> => {
    if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.enumerateDevices) {
        return {
            passed: false,
            summary: "Camera APIs are unavailable in this environment.",
            checks: [
                {
                    label: "Camera API support",
                    current: "Unavailable",
                    required: "Required",
                    passed: false,
                },
            ],
        };
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((device) => device.kind === "videoinput");

    if (videoDevices.length === 0) {
        return {
            passed: false,
            summary: "No video input devices were detected.",
            checks: [
                {
                    label: "Connected cameras",
                    current: "0",
                    required: "At least 1",
                    passed: false,
                },
            ],
        };
    }

    let stream: MediaStream | null = null;

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: requirements.minWidth },
                height: { ideal: requirements.minHeight },
                frameRate: { ideal: requirements.minFps },
            },
            audio: false,
        });

        const track = stream.getVideoTracks()[0];
        const settings = track?.getSettings();
        const width = Number(settings?.width ?? 0);
        const height = Number(settings?.height ?? 0);
        const fps = Number(settings?.frameRate ?? 0);

        const checks: CameraRequirementCheck[] = [
            {
                label: "Connected cameras",
                current: `${videoDevices.length}`,
                required: "At least 1",
                passed: videoDevices.length > 0,
            },
            {
                label: "Camera width",
                current: toNumericText(width),
                required: `${requirements.minWidth}`,
                passed: Number.isFinite(width) && width >= requirements.minWidth,
            },
            {
                label: "Camera height",
                current: toNumericText(height),
                required: `${requirements.minHeight}`,
                passed: Number.isFinite(height) && height >= requirements.minHeight,
            },
            {
                label: "Frame rate (FPS)",
                current: toNumericText(fps),
                required: `${requirements.minFps}`,
                passed: Number.isFinite(fps) && fps >= requirements.minFps,
            },
        ];

        const passed = checks.every((check) => check.passed);
        const summary = passed
            ? "Camera passed all minimum requirements."
            : "Camera does not meet the configured minimum requirements.";

        return { passed, summary, checks };
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Camera access was denied or unavailable.";
        return {
            passed: false,
            summary: `Camera check failed: ${message}`,
            checks: [
                {
                    label: "Camera access",
                    current: "Unavailable",
                    required: "Allowed",
                    passed: false,
                },
            ],
        };
    } finally {
        stream?.getTracks().forEach((track) => track.stop());
    }
};

const buildQrImageUrl = (value: string): string =>
    `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(value)}`;

const resolveRelayDeeplink = async (): Promise<string | null> => {
    try {
        const [port, localIp] = await Promise.all([
            window.relay.getPort(),
            window.relay.getLocalIp(),
        ]);

        if (!port || port <= 0 || !localIp) {
            return null;
        }

        return `employeeaccess://relay-capture?ws=${localIp}:${port}`;
    } catch {
        return null;
    }
};

export const createKioskSettingsScreen = (): View => {
    const { container, main } = createKioskLayoutShell("check-in", {
        showSystemStatus: true,
    });

    const content = document.createElement("section");
    content.className = "settings-view";

    const heading = document.createElement("div");
    heading.className = "settings-heading";
    heading.innerHTML = `
		<h2>Kiosk Settings</h2>
		<p>Configure audio, loading transitions, and camera requirements.</p>
	`;

    const cards = document.createElement("div");
    cards.className = "settings-card-grid";

    const audioCard = document.createElement("article");
    audioCard.className = "settings-card";
    audioCard.innerHTML = '<h3>Audio</h3><p>Enable and tune the kiosk background soundtrack.</p>';

    const musicToggleLabel = document.createElement("label");
    musicToggleLabel.className = "settings-field-row";
    const musicToggle = document.createElement("input");
    musicToggle.type = "checkbox";
    musicToggleLabel.append(musicToggle, document.createTextNode(" Enable background music"));

    const volumeField = document.createElement("label");
    volumeField.className = "settings-field";
    volumeField.textContent = "Music volume";

    const volumeControlRow = document.createElement("div");
    volumeControlRow.className = "settings-inline-control";
    const volumeInput = document.createElement("input");
    volumeInput.type = "range";
    volumeInput.min = "0";
    volumeInput.max = "100";
    volumeInput.step = "1";
    const volumeValue = document.createElement("span");
    volumeValue.className = "settings-inline-value";
    volumeControlRow.append(volumeInput, volumeValue);
    volumeField.append(volumeControlRow);

    const transitionField = document.createElement("label");
    transitionField.className = "settings-field";
    transitionField.textContent = "Loading screen minimum duration (ms)";
    const transitionInput = document.createElement("input");
    transitionInput.type = "number";
    transitionInput.min = "120";
    transitionInput.max = "2000";
    transitionInput.step = "10";
    transitionField.append(transitionInput);

    audioCard.append(musicToggleLabel, volumeField, transitionField);

    const cameraCard = document.createElement("article");
    cameraCard.className = "settings-card";
    cameraCard.innerHTML = '<h3>Camera Checker</h3><p>Validate that this device meets minimum capture requirements.</p>';

    const minWidthField = document.createElement("label");
    minWidthField.className = "settings-field";
    minWidthField.textContent = "Minimum width (px)";
    const minWidthInput = document.createElement("input");
    minWidthInput.type = "number";
    minWidthInput.min = "320";
    minWidthInput.max = "7680";
    minWidthField.append(minWidthInput);

    const minHeightField = document.createElement("label");
    minHeightField.className = "settings-field";
    minHeightField.textContent = "Minimum height (px)";
    const minHeightInput = document.createElement("input");
    minHeightInput.type = "number";
    minHeightInput.min = "240";
    minHeightInput.max = "4320";
    minHeightField.append(minHeightInput);

    const minFpsField = document.createElement("label");
    minFpsField.className = "settings-field";
    minFpsField.textContent = "Minimum FPS";
    const minFpsInput = document.createElement("input");
    minFpsInput.type = "number";
    minFpsInput.min = "10";
    minFpsInput.max = "120";
    minFpsField.append(minFpsInput);

    const setupUrlField = document.createElement("label");
    setupUrlField.className = "settings-field";
    setupUrlField.textContent = "Fallback mobile setup URL";
    const setupUrlInput = document.createElement("input");
    setupUrlInput.type = "text";
    setupUrlField.append(setupUrlInput);

    const cameraRunButton = document.createElement("button");
    cameraRunButton.type = "button";
    cameraRunButton.className = "action-btn secondary settings-action";
    cameraRunButton.textContent = "Run Camera Check";

    const cameraResultSummary = document.createElement("p");
    cameraResultSummary.className = "settings-status";
    cameraResultSummary.textContent = "Run the checker to validate this kiosk camera.";

    const cameraResultList = document.createElement("ul");
    cameraResultList.className = "camera-check-list";

    const qrFallbackPanel = document.createElement("div");
    qrFallbackPanel.className = "camera-fallback";
    qrFallbackPanel.style.display = "none";

    const qrTitle = document.createElement("h4");
    qrTitle.textContent = "Switch to Mobile Face Capture";

    const qrCopy = document.createElement("p");
    qrCopy.textContent = "Scan this QR code with your mobile SOFRS app to continue face capture and verification.";

    const qrImage = document.createElement("img");
    qrImage.className = "camera-fallback-qr";
    qrImage.alt = "Mobile relay deeplink QR";

    const qrLink = document.createElement("a");
    qrLink.className = "camera-fallback-link";
    qrLink.target = "_blank";
    qrLink.rel = "noopener noreferrer";

    qrFallbackPanel.append(qrTitle, qrCopy, qrImage, qrLink);

    cameraCard.append(
        minWidthField,
        minHeightField,
        minFpsField,
        setupUrlField,
        cameraRunButton,
        cameraResultSummary,
        cameraResultList,
        qrFallbackPanel,
    );

    cards.append(audioCard, cameraCard);

    const controls = document.createElement("div");
    controls.className = "settings-controls";

    const statusLabel = document.createElement("p");
    statusLabel.className = "settings-save-status";
    statusLabel.textContent = "";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "action-btn primary settings-action";
    saveButton.textContent = "Save Settings";

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "action-btn secondary settings-action";
    resetButton.textContent = "Reset Defaults";

    const returnButton = document.createElement("button");
    returnButton.type = "button";
    returnButton.className = "action-btn secondary settings-action";
    returnButton.textContent = "Return Home";

    controls.append(statusLabel, saveButton, resetButton, returnButton);
    content.append(heading, cards, controls);
    main.append(content);

    const updateVolumeLabel = (): void => {
        volumeValue.textContent = `${volumeInput.value}%`;
    };

    const showSavedStatus = (message: string, tone: "ok" | "error" = "ok"): void => {
        statusLabel.textContent = message;
        statusLabel.dataset.tone = tone;
    };

    const applySettingsToForm = (): void => {
        const settings = getAppSettings();
        musicToggle.checked = settings.musicEnabled;
        volumeInput.value = `${Math.round(settings.musicVolume * 100)}`;
        transitionInput.value = `${settings.transitionLoaderMs}`;
        minWidthInput.value = `${settings.minimumCameraWidth}`;
        minHeightInput.value = `${settings.minimumCameraHeight}`;
        minFpsInput.value = `${settings.minimumCameraFps}`;
        setupUrlInput.value = settings.mobileSetupUrl;
        updateVolumeLabel();
    };

    const getFormSettings = () => ({
        musicEnabled: musicToggle.checked,
        musicVolume: Number(volumeInput.value) / 100,
        transitionLoaderMs: Number(transitionInput.value),
        minimumCameraWidth: Number(minWidthInput.value),
        minimumCameraHeight: Number(minHeightInput.value),
        minimumCameraFps: Number(minFpsInput.value),
        mobileSetupUrl: setupUrlInput.value.trim(),
    });

    volumeInput.addEventListener("input", updateVolumeLabel);

    saveButton.addEventListener("click", () => {
        const nextSettings = updateAppSettings(getFormSettings());
        applySettingsToForm();
        showSavedStatus(
            `Settings saved. Music ${nextSettings.musicEnabled ? "enabled" : "muted"}.`,
        );
    });

    resetButton.addEventListener("click", () => {
        resetAppSettings();
        const defaults = getDefaultAppSettings();
        applySettingsToForm();
        cameraResultSummary.textContent = "Settings reset to defaults.";
        cameraResultSummary.dataset.tone = "warn";
        cameraResultList.replaceChildren();
        qrFallbackPanel.style.display = "none";
        showSavedStatus(
            `Defaults restored (${defaults.minimumCameraWidth}x${defaults.minimumCameraHeight} @ ${defaults.minimumCameraFps}fps).`,
        );
    });

    returnButton.addEventListener("click", () => {
        void navigate(createKioskIdleScreen);
    });

    cameraRunButton.addEventListener("click", async () => {
        cameraRunButton.disabled = true;
        cameraResultSummary.dataset.tone = "warn";
        cameraResultSummary.textContent = "Checking camera capabilities...";
        cameraResultList.replaceChildren();
        qrFallbackPanel.style.display = "none";

        const diagnostics = await runCameraDiagnostics({
            minWidth: Number(minWidthInput.value),
            minHeight: Number(minHeightInput.value),
            minFps: Number(minFpsInput.value),
        });

        cameraResultSummary.textContent = diagnostics.summary;
        cameraResultSummary.dataset.tone = diagnostics.passed ? "ok" : "error";
        for (const check of diagnostics.checks) {
            cameraResultList.append(createCameraCheckItem(check));
        }

        if (!diagnostics.passed) {
            const relayDeeplink = await resolveRelayDeeplink();
            const fallbackUrl = setupUrlInput.value.trim() || resolveMobileSetupFallbackUrl();
            const deeplink = relayDeeplink ?? fallbackUrl;
            const label = relayDeeplink
                ? "Deep link ready for mobile relay capture:"
                : "Relay deep link unavailable, using fallback URL:";

            qrImage.src = buildQrImageUrl(deeplink);
            qrLink.href = deeplink;
            qrLink.textContent = `${label} ${deeplink}`;
            qrFallbackPanel.style.display = "grid";
        }

        cameraRunButton.disabled = false;
    });

    applySettingsToForm();

    return {
        element: container,
    };
};
