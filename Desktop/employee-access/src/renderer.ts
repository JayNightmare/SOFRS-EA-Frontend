import { createKioskIdleScreen } from './pages/kiosk/idle';

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

export const navigate = async (viewFactory: () => View | Promise<View>): Promise<void> => {
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
};

// Bootstrap the application into the Kiosk Idle View
void navigate(createKioskIdleScreen);
