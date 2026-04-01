import { View, navigate } from '../../renderer';
import { createKioskIdleScreen } from './idle';
import { VerifyFaceResponse } from '../../services/verification';

export const createKioskApprovedScreen = (response: VerifyFaceResponse, mode: 'check-in' | 'check-out'): View => {
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

  const iconBox = document.createElement('div');
  iconBox.className = 'success-icon-box';
  iconBox.innerHTML = '✔';

  const name = response.employee?.name || 'Verified User';
  const firstName = name.split(' ')[0] || name;

  const headings = document.createElement('div');
  headings.className = 'feedback-headings';
  headings.innerHTML = `
    <h1>Welcome Back, <span>${firstName}</span></h1>
    <p>Access Granted. Your attendance has been logged<br>for the ${mode === 'check-in' ? 'Morning Shift' : 'End of Shift'}.</p>
  `;

  const cards = document.createElement('div');
  cards.className = 'feedback-cards';

  const cardTime = document.createElement('div');
  cardTime.className = 'feedback-card';
  cardTime.innerHTML = `<small><span class="icon">⌚</span> TIME IN</small><h3>${new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</h3>`;

  const cardLoc = document.createElement('div');
  cardLoc.className = 'feedback-card';
  cardLoc.innerHTML = `<small><span class="icon">⚲</span> BUILDING</small><h3>North Wing • L4</h3>`;

  const cardVerif = document.createElement('div');
  cardVerif.className = 'feedback-card';
  cardVerif.innerHTML = `<small><span class="icon">✓</span> VERIFICATION</small><h3>Biometric ID</h3>`;

  cards.append(cardTime, cardLoc, cardVerif);

  const footer = document.createElement('div');
  footer.className = 'unlocking-footer';
  footer.innerHTML = `<div class="unlocking-line"></div> UNLOCKING... <div class="unlocking-line"></div>`;

  body.append(iconBox, headings, cards, footer);
  main.append(topBar, body);
  container.append(sidebar, main);

  let timeout: ReturnType<typeof setTimeout>;

  return {
    element: container,
    onShow: () => {
      // Auto return to idle after 5 seconds
      timeout = setTimeout(() => {
        navigate(createKioskIdleScreen);
      }, 5000);
    },
    onHide: () => {
      if (timeout) clearTimeout(timeout);
    }
  };
};
