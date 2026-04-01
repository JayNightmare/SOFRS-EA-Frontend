let overlay: HTMLDivElement | null = null;
let messageLabel: HTMLParagraphElement | null = null;

const ensureOverlay = (): void => {
    if (overlay && messageLabel) {
        return;
    }

    overlay = document.createElement("div");
    overlay.className = "app-loader";
    overlay.setAttribute("aria-hidden", "true");

    const spinner = document.createElement("div");
    spinner.className = "app-loader-spinner";

    messageLabel = document.createElement("p");
    messageLabel.className = "app-loader-message";
    messageLabel.textContent = "Loading...";

    overlay.append(spinner, messageLabel);
    document.body.appendChild(overlay);
};

export const showGlobalLoading = (message: string): void => {
    ensureOverlay();
    if (!overlay || !messageLabel) {
        return;
    }

    messageLabel.textContent = message;
    overlay.classList.add("visible");
    overlay.setAttribute("aria-hidden", "false");
};

export const updateGlobalLoadingMessage = (message: string): void => {
    ensureOverlay();
    if (!messageLabel) {
        return;
    }

    messageLabel.textContent = message;
};

export const hideGlobalLoading = (): void => {
    if (!overlay) {
        return;
    }

    overlay.classList.remove("visible");
    overlay.setAttribute("aria-hidden", "true");
};
