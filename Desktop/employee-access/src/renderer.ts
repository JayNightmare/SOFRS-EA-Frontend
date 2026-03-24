/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import { createMainScreenPage } from './pages/main-screen';

type View = {
  element: HTMLElement;
  onShow?: () => Promise<void> | void;
  onHide?: () => void;
};

const app = document.getElementById('app');

if (!app) {
  throw new Error('Expected #app container to render the application.');
}

let activeView: View | null = null;

const renderApp = async (): Promise<void> => {
  if (activeView?.onHide) {
    activeView.onHide();
  }

  app.replaceChildren();
  const nextView = createMainScreenPage();

  activeView = nextView;
  app.append(nextView.element);

  if (nextView.onShow) {
    await nextView.onShow();
  }
};

void renderApp();
