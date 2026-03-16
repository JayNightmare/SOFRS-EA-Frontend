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

import { createEmployeePage } from './pages/employee';
import { createErrorPage } from './pages/error';
import { createHomePage } from './pages/home';
import { createVisitorPage } from './pages/visitor';

type Route = 'home' | 'employee' | 'visitor' | 'error';

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

const navigate = async (route: Route): Promise<void> => {
  if (activeView?.onHide) {
    activeView.onHide();
  }

  app.replaceChildren();

  let nextView: View;

  if (route === 'home') {
    nextView = createHomePage({
      onSelectEmployee: () => {
        void navigate('employee');
      },
      onSelectVisitor: () => {
        void navigate('visitor');
      },
    });
  } else if (route === 'employee') {
    nextView = createEmployeePage({
      onBack: () => {
        void navigate('home');
      },
      onGoVisitor: () => {
        void navigate('visitor');
      },
    });
  } else if (route === 'visitor') {
    nextView = createVisitorPage({
      onBack: () => {
        void navigate('home');
      },
    });
  } else {
    nextView = {
      element: createErrorPage(() => {
        void navigate('home');
      }),
    };
  }

  activeView = nextView;
  app.append(nextView.element);

  if (nextView.onShow) {
    await nextView.onShow();
  }
};

void navigate('home');
