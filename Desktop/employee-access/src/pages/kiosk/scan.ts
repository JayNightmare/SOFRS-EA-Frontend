import { View, navigate } from '../../renderer';
import { createFacePane } from '../../components/face';
import { createKioskLayoutShell } from '../../components/kiosk-layout';
import { svgIconHtml } from '../../components/icons';
import { verifyFace, VerifyFaceResponse } from '../../services/verification';
import { detectFaces } from '../../services/face-detector';
import { createKioskIdleScreen } from './idle';
import { createKioskApprovedScreen } from './approved';
import { createKioskDeniedScreen } from './denied';

export const createKioskScanScreen = (mode: 'check-in' | 'check-out'): View => {
  const { container, main } = createKioskLayoutShell(mode, {
    showSystemStatus: true,
    bindHomeNav: true,
  });

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

  const faceCamera = createFacePane();
  liveFrame.append(faceCamera.element, liveCorners, liveScanLine);

  const liveLabel = document.createElement('span');
  liveLabel.className = 'panel-label';
  liveLabel.textContent = 'LIVE';

  const livePanel = document.createElement('div');
  livePanel.className = 'video-panel';
  livePanel.append(liveFrame, liveLabel);

  // Match Panel
  const matchPanel = document.createElement('div');
  matchPanel.className = 'video-panel match';
  const matchImg = document.createElement('img');
  matchImg.className = 'match-thumb';
  matchImg.alt = 'Matched face';
  matchImg.style.display = 'none';
  const matchLabel = document.createElement('span');
  matchLabel.className = 'panel-label';
  matchLabel.textContent = 'MATCH';
  matchPanel.append(matchImg, matchLabel);

  panelsGroup.append(livePanel, matchPanel);

  // Similarity Gauge
  const matchBox = document.createElement('div');
  matchBox.className = 'match-box';
  const matchPercent = document.createElement('span');
  matchPercent.className = 'match-percent';
  matchPercent.textContent = '--%';
  const matchTag = document.createElement('span');
  matchTag.className = 'match-tag';
  matchTag.textContent = 'FACIAL MATCH SIMILARITY';
  matchBox.append(matchPercent, matchTag);

  // Actions
  const actionsBox = document.createElement('div');
  actionsBox.className = 'scan-actions';

  const btnRescan = document.createElement('button');
  btnRescan.className = 'action-btn secondary';
  btnRescan.textContent = 'RESCAN';
  btnRescan.addEventListener('click', () => {
    navigate(() => createKioskScanScreen(mode));
  });

  const btnConfirm = document.createElement('button');
  btnConfirm.className = 'action-btn primary';
  btnConfirm.textContent = 'CONFIRM IDENTITY';
  btnConfirm.disabled = true;

  actionsBox.append(btnRescan, btnConfirm);

  // Context Info (Footer)
  const contextBox = document.createElement('div');
  contextBox.className = 'scan-context-info';

  const tokenInfo = document.createElement('div');
  tokenInfo.className = 'info-card';
  tokenInfo.innerHTML = `<span class="icon">${svgIconHtml('fingerprint')}</span><div><small>TOKEN ID</small><p>AWAITING</p></div>`;

  const timeInfo = document.createElement('div');
  timeInfo.className = 'info-card';
  timeInfo.innerHTML = `<span class="icon">${svgIconHtml('clock')}</span><div><small>TIMESTAMP</small><p>--:--:--</p></div>`;

  const locInfo = document.createElement('div');
  locInfo.className = 'info-card';
  locInfo.innerHTML = `<span class="icon">${svgIconHtml('location')}</span><div><small>LOCATION</small><p>Main Lobby - East</p></div>`;

  contextBox.append(tokenInfo, timeInfo, locInfo);

  body.append(panelsGroup, matchBox, actionsBox, contextBox);
  main.append(body);

  // --- Recognition Logic ---
  let detectionTimer: ReturnType<typeof setInterval> | null = null;
  let verifying = false;
  let detecting = false;
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
      tokenInfo.innerHTML = `<span class="icon">${svgIconHtml('fingerprint')}</span><div><small>TOKEN ID</small><p>${emp?.id || 'VERIFIED'}</p></div>`;
      timeInfo.innerHTML = `<span class="icon">${svgIconHtml('clock')}</span><div><small>TIMESTAMP</small><p>${new Date().toLocaleTimeString()}</p></div>`;
    } else {
      matchPercent.textContent = 'FAIL';
      matchImg.style.display = 'none';
      tokenInfo.innerHTML = `<span class="icon">${svgIconHtml('fingerprint')}</span><div><small>TOKEN ID</small><p>UNKNOWN</p></div>`;
      setTimeout(() => {
        navigate(() => createKioskDeniedScreen(response, mode));
      }, 1500);
    }
  };

  const runDetection = async () => {
    if (verifying || detecting) return;
    detecting = true;

    try {
      const result = await detectFaces(faceCamera.getVideoElement());

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

        processMatch(response.similarity || 0, response, snapshot);
      }
    } catch (err) {
      console.error('Detection failed', err);
      verifying = false;
    } finally {
      detecting = false;
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
