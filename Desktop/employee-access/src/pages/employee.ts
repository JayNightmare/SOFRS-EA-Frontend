import { searchImage, ApiError } from '../api';
import { createFacePane } from '../components/face';
import { detectFaces } from '../services/face-detector';

export type EmployeePageView = {
    element: HTMLElement;
    onShow: () => Promise<void>;
    onHide: () => void;
};

export type EmployeePageHandlers = {
    onBack: () => void;
    onGoVisitor: () => void;
};

export const createEmployeePage = ({ onBack, onGoVisitor }: EmployeePageHandlers): EmployeePageView => {
    const shell = document.createElement('main');
    shell.className = 'kiosk-shell';

    const camera = createFacePane();
    const panel = document.createElement('section');
    panel.className = 'content-panel';

    const title = document.createElement('h1');
    title.className = 'headline';
    title.textContent = 'Employee Verification';

    const details = document.createElement('p');
    details.className = 'copy';
    details.textContent =
        'Hold steady for face verification. The system checks if your profile exists in employee records.';

    const result = document.createElement('div');
    result.className = 'result-banner';
    result.textContent = 'Waiting to scan...';

    const actions = document.createElement('div');
    actions.className = 'button-row';

    const backButton = document.createElement('button');
    backButton.className = 'action-btn';
    backButton.type = 'button';
    backButton.textContent = 'Back';
    backButton.addEventListener('click', onBack);

    const visitorButton = document.createElement('button');
    visitorButton.className = 'action-btn';
    visitorButton.type = 'button';
    visitorButton.dataset.variant = 'secondary';
    visitorButton.textContent = 'Switch to visitor';
    visitorButton.addEventListener('click', onGoVisitor);

    actions.append(backButton, visitorButton);
    panel.append(title, details, result, actions);
    shell.append(camera.element, panel);

    let timer: ReturnType<typeof setInterval> | null = null;
    let isDetecting = false;
    let hasSearchedBackend = false;

    const runDetection = async (): Promise<void> => {
        if (isDetecting) {
            return;
        }

        isDetecting = true;

        try {
            const response = await detectFaces(camera.getVideoElement());

            if (response.detected) {
                camera.setStatus('Face detected', 'ok');
                if (!hasSearchedBackend) {
                    hasSearchedBackend = true;
                    const blob = await camera.captureFrameBlob();
                    if (blob) {
                        try {
                            const searchResult = await searchImage(blob);
                            result.dataset.tone = 'ok';
                            result.textContent = searchResult.message;
                        } catch (err) {
                            hasSearchedBackend = false;
                            const msg = err instanceof ApiError ? err.message : 'Cannot reach server';
                            camera.setStatus('API error', 'error');
                            result.dataset.tone = 'error';
                            result.textContent = msg;
                        }
                    } else {
                        hasSearchedBackend = false;
                    }
                } else {
                    result.textContent = result.textContent || 'Face verified.';
                }
                return;
            }

            camera.setStatus('No face detected', 'warn');
            result.dataset.tone = 'warn';
            result.textContent = 'No face detected. Align with the camera and hold still.';
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown detection error';
            camera.setStatus('Detection error', 'error');
            result.dataset.tone = 'error';
            result.textContent = `Face detection error: ${message}`;
        } finally {
            isDetecting = false;
        }
    };

    return {
        element: shell,
        onShow: async () => {
            hasSearchedBackend = false;
            result.dataset.tone = 'warn';
            result.textContent = 'Scanning for employee profile...';
            camera.setStatus('Scanning face', 'warn');
            await camera.start();

            await runDetection();
            timer = setInterval(() => void runDetection(), 900);
        },
        onHide: () => {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
            camera.stop();
        },
    };
};