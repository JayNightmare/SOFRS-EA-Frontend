import { View, navigate } from '../../renderer';
import { createFacePane } from '../../components/face';
import { verifyFace, VerifyFaceResponse } from '../../services/verification';
import { createKioskIdleScreen } from './idle';
import { createKioskApprovedScreen } from './approved';
import { createKioskDeniedScreen } from './denied';

export const createKioskScanScreen = (mode: 'check-in' | 'check-out'): View => {
  const container = document.createElement('div');
  container.className = 'kiosk-scan-layout';

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
  navHome.addEventListener('click', () => navigate(createKioskIdleScreen));
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
      <div class="system-status"><span class="status-dot"></span> SYSTEM ONLINE</div>
      <button class="icon-btn">?</button>
      <button class="icon-btn">⚙</button>
      <div class="avatar-placeholder"></div>
    </div>
  `;

  // Content body
  const body = document.createElement('div');
  body.className = 'scan-body';

  // Video Panels
  const panelsGroup = document.createElement('div');
  panelsGroup.className = 'video-panels';

  // Live Panel inside bio-frame
  const liveFrame = document.createElement('div');
  liveFrame.className = 'bio-frame';
  const liveCorners = document.createElement('div');
  liveCorners.className = 'bio-frame-corners';
  const liveScanLine = document.createElement('div');
  liveScanLine.className = 'scan-line';
  
  const livePanel = document.createElement('div');
  livePanel.className = 'video-panel live';
  const liveLabel = document.createElement('div');
  liveLabel.className = 'panel-label';
  liveLabel.innerHTML = '<span>LIVE</span><span>SAFE WORK</span>';
  
  const faceCamera = createFacePane();
  livePanel.append(faceCamera.element, liveLabel);
  liveFrame.append(liveCorners, liveScanLine, livePanel);

  // Match Panel inside bio-frame
  const matchFrame = document.createElement('div');
  matchFrame.className = 'bio-frame';
  const matchCorners = document.createElement('div');
  matchCorners.className = 'bio-frame-corners';

  const matchPanel = document.createElement('div');
  matchPanel.className = 'video-panel match';
  const matchImg = document.createElement('img');
  matchImg.className = 'match-img';
  matchImg.style.display = 'none';
  const matchLabel = document.createElement('div');
  matchLabel.className = 'panel-label';
  matchLabel.innerHTML = '<span>MATCH</span><span>VERIFIED</span>';
  
  matchPanel.append(matchImg, matchLabel);
  matchFrame.append(matchCorners, matchPanel);

  panelsGroup.append(liveFrame, matchFrame);

  // Match Status
  const matchBox = document.createElement('div');
  matchBox.className = 'match-status-box';
  const matchTitle = document.createElement('p');
  matchTitle.textContent = 'Match';
  const matchPercent = document.createElement('h2');
  matchPercent.textContent = '--%';
  matchBox.append(matchTitle, matchPercent);

  // Action Buttons
  const actionsBox = document.createElement('div');
  actionsBox.className = 'scan-actions';
  
  const btnConfirm = document.createElement('button');
  btnConfirm.className = 'action-btn primary';
  btnConfirm.textContent = '→ CONFIRM ENTRY';
  btnConfirm.disabled = true;

  const btnRescan = document.createElement('button');
  btnRescan.className = 'action-btn secondary';
  btnRescan.textContent = 'RE-SCAN';
  btnRescan.addEventListener('click', () => {
    matchPercent.textContent = '--%';
    btnConfirm.disabled = true;
    matchImg.style.display = 'none';
    matchImg.src = '';
    faceCamera.setFaceOverlay(null);
    verifying = false;
  });

  actionsBox.append(btnConfirm, btnRescan);

  // Context Info (Footer)
  const contextBox = document.createElement('div');
  contextBox.className = 'scan-context-info';

  const tokenInfo = document.createElement('div');
  tokenInfo.className = 'info-card';
  tokenInfo.innerHTML = '<span class="icon">◎</span><div><small>TOKEN ID</small><p>AWAITING</p></div>';

  const timeInfo = document.createElement('div');
  timeInfo.className = 'info-card';
  timeInfo.innerHTML = '<span class="icon">⌚</span><div><small>TIMESTAMP</small><p>--:--:--</p></div>';

  const locInfo = document.createElement('div');
  locInfo.className = 'info-card';
  locInfo.innerHTML = '<span class="icon">⚲</span><div><small>LOCATION</small><p>Main Lobby - East</p></div>';

  contextBox.append(tokenInfo, timeInfo, locInfo);

  body.append(panelsGroup, matchBox, actionsBox, contextBox);
  main.append(topBar, body);
  
  container.append(sidebar, main);

  // --- Recognition Logic ---
  let detectionTimer: ReturnType<typeof setInterval> | null = null;
  let verifying = false;

  // Store last verification response for the confirm button
  let lastResponse: VerifyFaceResponse | null = null;

  btnConfirm.addEventListener('click', () => {
    if (lastResponse) {
      const response = lastResponse;
      navigate(() => createKioskApprovedScreen(response, mode));
    } else {
      navigate(createKioskIdleScreen);
    }
  });

  const dataUrlToJpegFile = async (dataUrl: string): Promise<File> => {
    const blob = await fetch(dataUrl).then((r) => r.blob());
    return new File([blob], 'face.jpg', { type: 'image/jpeg' });
  };

  const processMatch = (similarityNum: number, response: VerifyFaceResponse, snapshot: string) => {
    const percent = Math.round(similarityNum * 100);
    matchPercent.textContent = `${percent}%`;

    if (response.recognized) {
      lastResponse = response;
      matchImg.src = snapshot;
      matchImg.style.display = 'block';
      btnConfirm.disabled = false;
      
      const emp = response.employee;
      tokenInfo.innerHTML = `<span class="icon">◎</span><div><small>TOKEN ID</small><p>${emp?.id || 'VERIFIED'}</p></div>`;
      timeInfo.innerHTML = `<span class="icon">⌚</span><div><small>TIMESTAMP</small><p>${new Date().toLocaleTimeString()}</p></div>`;
    } else {
      // Navigate to the Denied screen after a short delay so the user sees FAIL
      matchPercent.textContent = 'FAIL';
      matchImg.style.display = 'none';
      tokenInfo.innerHTML = `<span class="icon">◎</span><div><small>TOKEN ID</small><p>UNKNOWN</p></div>`;
      setTimeout(() => {
        navigate(() => createKioskDeniedScreen(mode));
      }, 1500);
    }
  };

  const runDetection = async () => {
    if (verifying) return;

    const tensor = faceCamera.captureFrameTensor(640);
    if (!tensor) return;

    try {
      const result = await window.detector.detectFace({
        tensor: Array.from(tensor),
        width: 640,
        height: 640,
        threshold: 0.35,
      });

      faceCamera.setFaceOverlay(result.primaryFace);

      if (result.hasSingleForegroundFace && result.primaryFace) {
        verifying = true;
        const snapshot = faceCamera.captureFrameJpeg(1080, 0.9);
        if (!snapshot) {
          verifying = false;
          return;
        }
        
        const file = await dataUrlToJpegFile(snapshot);
        const response = await verifyFace(file, 'verification');
        
        // Populate the match component
        processMatch(response.similarity || 0, response, snapshot);
      }
    } catch (err) {
      console.error('Detection failed', err);
      verifying = false;
    }
  };

  return {
    element: container,
    onShow: async () => {
      await faceCamera.start();
      detectionTimer = setInterval(() => void runDetection(), 800);
    },
    onHide: () => {
      if (detectionTimer) clearInterval(detectionTimer);
      faceCamera.stop();
    }
  };
};
