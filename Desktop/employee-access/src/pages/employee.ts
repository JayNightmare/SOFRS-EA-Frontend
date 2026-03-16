import { createFacePane } from '../components/face';

export type EmployeePageView = {
    element: HTMLElement;
    onShow: () => Promise<void>;
    onHide: () => void;
};

export type EmployeePageHandlers = {
    onBack: () => void;
    onGoVisitor: () => void;
};

const randomEmployeeOutcome = (): 'recognized' | 'face-missed' | 'not-employee' => {
    const roll = Math.random();
    if (roll > 0.62) {
        return 'recognized';
    }
    if (roll > 0.28) {
        return 'face-missed';
    }
    return 'not-employee';
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

    let timer: ReturnType<typeof setTimeout> | null = null;

    return {
        element: shell,
        onShow: async () => {
            result.dataset.tone = 'warn';
            result.textContent = 'Scanning for employee profile...';
            camera.setStatus('Scanning face', 'warn');
            await camera.start();

            timer = setTimeout(() => {
                const outcome = randomEmployeeOutcome();

                if (outcome === 'recognized') {
                    camera.setStatus('Employee recognized', 'ok');
                    result.dataset.tone = 'ok';
                    result.textContent = 'Welcome, employee. Access granted.';
                    return;
                }

                if (outcome === 'face-missed') {
                    camera.setStatus('Face not detected', 'warn');
                    result.dataset.tone = 'warn';
                    result.textContent = 'Face not clearly detected. Please align with the camera and retry.';
                    return;
                }

                camera.setStatus('Not in employee DB', 'error');
                result.dataset.tone = 'error';
                result.textContent = 'No employee profile matched. Use visitor flow to continue.';
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