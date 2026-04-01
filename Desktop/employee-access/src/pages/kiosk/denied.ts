import { View, navigate } from '../../renderer';
import { createKioskScanScreen } from './scan';

export const createKioskDeniedScreen = (mode: 'check-in' | 'check-out'): View => {
  const container = document.createElement('div');
  container.className = 'kiosk-scan-layout'; // reuse the scan layout for sidebar support

  // --- Sidebar ---
  const sidebar = document.createElement('aside');
  sidebar.className = 'kiosk-sidebar';

  const addSidebarItem = (label: string, icon: string, isActive = false) => {
    const item = document.createElement('button');
    item.className = `sidebar-item ${isActive ? 'active' : ''}`;
    item.innerHTML = `<span class="icon">${icon}</span><span class="label">${label}</span>`;
    return item;
  };

  const navHome = addSidebarItem('Check In', '🏠', mode === 'check-in');
  const navCheckOut = addSidebarItem('Check Out', '🚪', mode === 'check-out');
  const navVisitor = addSidebarItem('Visitor', '👥');
  const navHelp = addSidebarItem('Help', 'ⓘ');

  sidebar.append(navHome, navCheckOut, navVisitor, document.createElement('div'), navHelp);

  // --- Main Content Area ---
  const main = document.createElement('main');
  main.className = 'kiosk-scan-main';

  // Top header inside main
  const topBar = document.createElement('header');
  topBar.className = 'scan-topbar';
  topBar.innerHTML = `
    <h1 class="company-logo">EmployeeAccess</h1>
    <div class="status-group">
      <button class="icon-btn">?</button>
      <button class="icon-btn">⚙</button>
      <div class="avatar-placeholder"></div>
    </div>
  `;

  // Feedback Content
  const body = document.createElement('div');
  body.className = 'feedback-container';

  const deniedBox = document.createElement('div');
  deniedBox.className = 'denied-box';

  const iconBox = document.createElement('div');
  iconBox.className = 'error-icon-box';
  iconBox.innerHTML = `
    <div class="icon">✖</div>
    <div class="label">Access Denied</div>
  `;

  const infoGroup = document.createElement('div');
  infoGroup.className = 'denied-info';
  infoGroup.innerHTML = `
    <h2>Screen Change: Denied View</h2>
    <p>In the Denied state, the primary icon swaps to a red 'X', the background mesh shifts to a subtle warm glow, and the headline displays "Access Denied: Please see Reception". The Bento cards would highlight the reason (e.g., "Expired Credential" or "Restricted Zone").</p>
  `;

  const returnBtn = document.createElement('button');
  returnBtn.className = 'action-btn secondary';
  returnBtn.textContent = 'RETURN TO SCAN';
  returnBtn.addEventListener('click', () => {
    navigate(() => createKioskScanScreen(mode));
  });

  infoGroup.append(returnBtn);
  deniedBox.append(iconBox, infoGroup);
  
  body.append(deniedBox);
  main.append(topBar, body);
  container.append(sidebar, main);

  return {
    element: container,
  };
};
