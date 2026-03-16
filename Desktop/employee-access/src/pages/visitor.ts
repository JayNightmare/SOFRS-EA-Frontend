import { createFacePane } from '../components/face';

export type VisitorPageView = {
    element: HTMLElement;
    onShow: () => Promise<void>;
    onHide: () => void;
};

export type VisitorPageHandlers = {
    onBack: () => void;
};

const randomVisitorOutcome = (): 'known-visitor' | 'new-visitor' | 'face-missed' => {
    const roll = Math.random();
    if (roll > 0.55) {
        return 'known-visitor';
    }
    if (roll > 0.2) {
        return 'new-visitor';
    }
    return 'face-missed';
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

    let timer: ReturnType<typeof setTimeout> | null = null;

    return {
        element: shell,
        onShow: async () => {
            result.dataset.tone = 'warn';
            result.textContent = 'Scanning visitor profile...';
            camera.setStatus('Scanning face', 'warn');
            await camera.start();

            timer = setTimeout(() => {
                const outcome = randomVisitorOutcome();

                if (outcome === 'known-visitor') {
                    camera.setStatus('Visitor recognized', 'ok');
                    result.dataset.tone = 'ok';
                    result.textContent = 'Welcome back. Please wait for employee approval.';
                    return;
                }

                if (outcome === 'new-visitor') {
                    camera.setStatus('New visitor detected', 'warn');
                    result.dataset.tone = 'warn';
                    result.textContent = 'Welcome new visitor. Please wait while we request employee access approval.';
                    return;
                }

                camera.setStatus('Face not detected', 'error');
                result.dataset.tone = 'error';
                result.textContent = 'Face was not detected clearly. Please step closer and try again.';
            }, 2200);
        },
        onHide: () => {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            camera.stop();
        },
    };
};