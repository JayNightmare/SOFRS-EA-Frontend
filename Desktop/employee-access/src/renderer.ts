import { createKioskIdleScreen } from './pages/kiosk/idle';
import { showGlobalLoading, hideGlobalLoading } from './components/loading-overlay';
import { initBackgroundMusic } from './components/music';
import { getAppSettings } from './services/settings';

export type View = {
  element: HTMLElement;
  onShow?: () => Promise<void> | void;
  onHide?: () => void;
};

const appContainer = document.getElementById('app');

if (!appContainer) {
  throw new Error('Expected #app container to render the application.');
}

let activeView: View | null = null;
let navigationVersion = 0;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const runNavigation = async (
  viewFactory: () => View | Promise<View>,
  loadingMessage: string,
): Promise<void> => {
  const startedAt = performance.now();
  const currentVersion = ++navigationVersion;

  showGlobalLoading(loadingMessage);

  try {
    if (activeView?.onHide) {
      activeView.onHide();
    }

    appContainer.replaceChildren();
    const nextView = await viewFactory();

    activeView = nextView;
    appContainer.append(nextView.element);

    if (nextView.onShow) {
      await nextView.onShow();
    }
  } finally {
    const elapsedMs = performance.now() - startedAt;
    const minimumLoadingMs = getAppSettings().transitionLoaderMs;

    if (elapsedMs < minimumLoadingMs) {
      await sleep(minimumLoadingMs - elapsedMs);
    }

    if (currentVersion === navigationVersion) {
      hideGlobalLoading();
    }
  }
};

export const navigate = async (viewFactory: () => View | Promise<View>): Promise<void> => {
  await runNavigation(viewFactory, 'Loading screen...');
};

const bootstrap = async (): Promise<void> => {
  window.appLifecycle?.onClosing(() => {
    showGlobalLoading('Closing EmployeeAccess...');
  });

  window.addEventListener('beforeunload', () => {
    showGlobalLoading('Closing EmployeeAccess...');
  });

  initBackgroundMusic();
  await runNavigation(createKioskIdleScreen, 'Starting EmployeeAccess...');
};

void bootstrap();
