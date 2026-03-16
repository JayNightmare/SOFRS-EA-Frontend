export const createErrorPage = (onBack: () => void): HTMLElement => {
    const shell = document.createElement('main');
    shell.className = 'kiosk-shell';

    const cameraArea = document.createElement('section');
    cameraArea.className = 'camera-frame';

    const placeholder = document.createElement('div');
    placeholder.className = 'camera-placeholder';
    placeholder.textContent = 'Route unavailable';
    cameraArea.append(placeholder);

    const panel = document.createElement('section');
    panel.className = 'content-panel';

    const title = document.createElement('h1');
    title.className = 'headline';
    title.textContent = 'Something went wrong';

    const details = document.createElement('p');
    details.className = 'copy';
    details.textContent =
        'The requested screen could not be displayed. Return to the main entry screen.';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'action-btn';
    button.textContent = 'Return home';
    button.addEventListener('click', onBack);

    panel.append(title, details, button);
    shell.append(cameraArea, panel);

    return shell;
};
