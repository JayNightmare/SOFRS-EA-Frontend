import { createChooser } from '../components/chooser';
import { createFacePane } from '../components/face';

export type HomePageView = {
    element: HTMLElement;
    onShow: () => Promise<void>;
    onHide: () => void;
};

export type HomePageHandlers = {
    onSelectEmployee: () => void;
    onSelectVisitor: () => void;
};

export const createHomePage = ({
    onSelectEmployee,
    onSelectVisitor,
}: HomePageHandlers): HomePageView => {
    const shell = document.createElement('main');
    shell.className = 'kiosk-shell';

    const camera = createFacePane();
    const panel = document.createElement('section');
    panel.className = 'content-panel';

    const title = document.createElement('h1');
    title.className = 'headline';
    title.textContent = 'SOFRS Entry Gate';

    const message = document.createElement('p');
    message.className = 'copy';
    message.textContent =
        'Stand centered in front of the camera, then choose your access type to continue.';

    const chooser = createChooser({
        onEmployee: onSelectEmployee,
        onVisitor: onSelectVisitor,
    });

    panel.append(title, message, chooser);
    shell.append(camera.element, panel);

    return {
        element: shell,
        onShow: async () => {
            camera.setStatus('Initializing camera', 'warn');
            await camera.start();
        },
        onHide: () => {
            camera.stop();
        },
    };
};