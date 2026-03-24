import { searchImage, ApiError } from '../api';
import { createFacePane } from '../components/face';

export type VisitorPageView = {
    element: HTMLElement;
    onShow: () => Promise<void>;
    onHide: () => void;
};

export type VisitorPageHandlers = {
    onBack: () => void;
};

export const createVisitorPage = ({ onBack }: VisitorPageHandlers): VisitorPageView => {
    const shell = document.createElement('main');
    shell.className = 'kiosk-shell';

    const camera = createFacePane();
    const panel = document.createElement('section');
    panel.className = 'content-panel';

    const title = document.createElement('h1');
    title.className = 'headline';
    title.textContent = 'Visitor Check-In';

    const details = document.createElement('p');
    details.className = 'copy';
    details.textContent =
        'Please look at the camera for visitor registration. An employee will be notified for approval.';

    const result = document.createElement('div');
    result.className = 'result-banner';
    result.textContent = 'Waiting to scan...';

    const backButton = document.createElement('button');
    backButton.className = 'action-btn';
    backButton.type = 'button';
    backButton.textContent = 'Back';
    backButton.addEventListener('click', onBack);

    panel.append(title, details, result, backButton);
    shell.append(camera.element, panel);

    let searchInterval: ReturnType<typeof setInterval> | null = null;
    let searchInProgress = false;

    const runSearch = async (): Promise<void> => {
        if (searchInProgress) return;
        const blob = await camera.captureFrameBlob();
        if (!blob) return;

        searchInProgress = true;
        try {
            const searchResult = await searchImage(blob);
            if (searchInterval) {
                clearInterval(searchInterval);
                searchInterval = null;
            }
            result.dataset.tone = 'ok';
            result.textContent = searchResult.message;
            camera.setStatus('Done', 'ok');
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : 'Cannot reach server';
            result.dataset.tone = 'error';
            result.textContent = msg;
            camera.setStatus('API error', 'error');
        } finally {
            searchInProgress = false;
        }
    };

    return {
        element: shell,
        onShow: async () => {
            result.dataset.tone = 'warn';
            result.textContent = 'Scanning visitor profile...';
            camera.setStatus('Scanning face', 'warn');
            await camera.start();

            runSearch();
            searchInterval = setInterval(() => void runSearch(), 2500);
        },
        onHide: () => {
            if (searchInterval) {
                clearInterval(searchInterval);
                searchInterval = null;
            }
            camera.stop();
        },
    };
};