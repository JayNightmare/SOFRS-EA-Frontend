import { View, navigate } from '../../renderer';
import { createFacePane } from '../../components/face';
import { createKioskLayoutShell } from '../../components/kiosk-layout';
import { svgIconHtml } from '../../components/icons';
import { verifyFace, VerifyFaceResponse } from '../../services/verification';
import { detectFaces } from '../../services/face-detector';
import { createKioskIdleScreen } from './idle';
import { createKioskApprovedScreen } from './approved';
import { createKioskDeniedScreen } from './denied';
import type { DetectedFace } from '../../services/face-detector';

type ScanFeedbackTone = 'ok' | 'warn' | 'error';

type LogPayload = Record<string, unknown>;

const buildErrorPayload = (error: unknown): LogPayload => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { value: error };
};

const summarizeFace = (face: DetectedFace | null): LogPayload | null => {
  if (!face) {
    return null;
  }

  return {
    x: Number(face.x.toFixed(3)),
    y: Number(face.y.toFixed(3)),
    width: Number(face.width.toFixed(3)),
    height: Number(face.height.toFixed(3)),
    confidence: Number(face.confidence.toFixed(3)),
  };
};

export const createKioskScanScreen = (mode: 'check-in' | 'check-out'): View => {
  const logPrefix = `[kiosk-scan:${mode}]`;
  const logInfo = (message: string, payload?: LogPayload) => {
    if (payload) {
      console.info(`${logPrefix} ${message}`, payload);
      return;
    }
    console.info(`${logPrefix} ${message}`);
  };

  const logWarn = (message: string, payload?: LogPayload) => {
    if (payload) {
      console.warn(`${logPrefix} ${message}`, payload);
      return;
    }
    console.warn(`${logPrefix} ${message}`);
  };

  const logError = (message: string, payload?: LogPayload) => {
    if (payload) {
      console.error(`${logPrefix} ${message}`, payload);
      return;
    }
    console.error(`${logPrefix} ${message}`);
  };

  const { container, main } = createKioskLayoutShell(mode, {
    showSystemStatus: true,
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

  const defaultTokenHtml = `<span class="icon">${svgIconHtml('fingerprint')}</span><div><small>TOKEN ID</small><p>AWAITING</p></div>`;
  const defaultTimeHtml = `<span class="icon">${svgIconHtml('clock')}</span><div><small>TIMESTAMP</small><p>--:--:--</p></div>`;

  let lastFeedbackKey = '';
  // let detectionCycle = 0;
  // let lastDetectionSignature = '';
  let lastErrorSignature = '';
  let lastErrorLoggedAt = 0;

  const setScanFeedback = (
    key: string,
    statusText: string,
    tone: ScanFeedbackTone,
    gaugeLabel: string,
    gaugeValue: string,
  ) => {
    if (lastFeedbackKey === key) {
      return;
    }

    lastFeedbackKey = key;
    faceCamera.setStatus(statusText, tone);
    matchTag.textContent = gaugeLabel;
    matchPercent.textContent = gaugeValue;
    matchBox.dataset.tone = tone;
    logInfo('Feedback update', {
      key,
      tone,
      statusText,
      gaugeLabel,
      gaugeValue,
    });
  };

  // Actions
  const actionsBox = document.createElement('div');
  actionsBox.className = 'scan-actions';

  const btnRescan = document.createElement('button');
  btnRescan.className = 'action-btn secondary';
  btnRescan.textContent = 'RESCAN';
  btnRescan.addEventListener('click', () => {
    void navigate(() => createKioskScanScreen(mode));
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
  tokenInfo.innerHTML = defaultTokenHtml;

  const timeInfo = document.createElement('div');
  timeInfo.className = 'info-card';
  timeInfo.innerHTML = defaultTimeHtml;

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
  let resultLocked = false;
  let lastResponse: VerifyFaceResponse | null = null;

  const resetToAwaitingState = () => {
    lastResponse = null;
    btnConfirm.disabled = true;
    matchImg.style.display = 'none';
    tokenInfo.innerHTML = defaultTokenHtml;
    timeInfo.innerHTML = defaultTimeHtml;
    logInfo('Reset to awaiting state');
  };

  btnConfirm.addEventListener('click', () => {
    if (lastResponse) {
      const response = lastResponse;
      logInfo('Confirm clicked with recognized response', {
        reasonCode: response.reasonCode,
        similarity: response.similarity,
        employeeId: response.employee?.id,
      });
      void navigate(() => createKioskApprovedScreen(response, mode));
    } else {
      logWarn('Confirm clicked without response; returning to idle');
      void navigate(createKioskIdleScreen);
    }
  });

  const dataUrlToJpegFile = async (dataUrl: string): Promise<File> => {
    const blob = await fetch(dataUrl).then((r) => r.blob());
    return new File([blob], 'face.jpg', { type: 'image/jpeg' });
  };

  const processMatch = (similarityNum: number, response: VerifyFaceResponse, snapshot: string) => {
    const percent = Math.round(similarityNum * 100);
    matchPercent.textContent = `${percent}%`;
    matchTag.textContent = 'FACIAL MATCH SIMILARITY';
    logInfo('Verification response processed', {
      recognized: response.recognized,
      reasonCode: response.reasonCode,
      similarity: response.similarity,
      roundedPercent: percent,
    });

    if (response.recognized) {
      lastResponse = response;
      matchImg.src = snapshot;
      matchImg.style.display = 'block';
      btnConfirm.disabled = false;
      setScanFeedback('recognized', `Identity verified (${percent}%). Press confirm to continue.`, 'ok', 'FACIAL MATCH SIMILARITY', `${percent}%`);

      const emp = response.employee;
      tokenInfo.innerHTML = `<span class="icon">${svgIconHtml('fingerprint')}</span><div><small>TOKEN ID</small><p>${emp?.id || 'VERIFIED'}</p></div>`;
      timeInfo.innerHTML = `<span class="icon">${svgIconHtml('clock')}</span><div><small>TIMESTAMP</small><p>${new Date().toLocaleTimeString()}</p></div>`;
      faceCamera.setStatus('Identity verified. Press confirm to continue.', 'ok');
    } else {
      faceCamera.setStatus('Face not recognized. Redirecting...', 'error');
      matchBox.dataset.tone = 'error';
      matchTag.textContent = 'MATCH FAILED';
      matchPercent.textContent = 'FAIL';
      matchImg.style.display = 'none';
      tokenInfo.innerHTML = `<span class="icon">${svgIconHtml('fingerprint')}</span><div><small>TOKEN ID</small><p>UNKNOWN</p></div>`;
      faceCamera.setStatus('Face not recognized. Redirecting...', 'error');
      setTimeout(() => {
        logInfo('Navigating to denied screen after failed match', {
          reasonCode: response.reasonCode,
          similarity: response.similarity,
        });
        void navigate(() => createKioskDeniedScreen(response, mode));
      }, 1500);
    }
  };

  const runDetection = async () => {
    if (resultLocked || verifying || detecting) return;
    detecting = true;
    // detectionCycle += 1;

    try {
      const result = await detectFaces(faceCamera.getVideoElement());

      // const signature = `${result.reasonCode}:${result.faceCount}:${result.hasSingleForegroundFace}`;
      // if (signature !== lastDetectionSignature || detectionCycle % 30 === 0) {
      //   logInfo('Detection result', {
      //     cycle: detectionCycle,
      //     reasonCode: result.reasonCode,
      //     message: result.message,
      //     detected: result.detected,
      //     faceCount: result.faceCount,
      //     hasSingleForegroundFace: result.hasSingleForegroundFace,
      //     primaryFace: summarizeFace(result.primaryFace),
      //   });
      //   lastDetectionSignature = signature;
      // }

      console.log('Detecting Face');
      faceCamera.setFaceOverlay(result.primaryFace);

      if (result.reasonCode === 'not-supported') {
        verifying = true;
        faceCamera.setStatus('Detector unavailable, sending to API', 'warn');

        const snapshot = faceCamera.captureFrameJpeg(1080, 0.9);
        if (!snapshot) {
          faceCamera.setStatus('Camera frame not ready', 'error');
          verifying = false;
          return;
        }

        const file = await dataUrlToJpegFile(snapshot);
        const response = await verifyFace(file, 'temp_images');
        resultLocked = true;

        processMatch(response.similarity || 0, response, snapshot);
        return;
      }

      if (result.reasonCode === 'multiple-faces') {
        resetToAwaitingState();
        setScanFeedback('multiple-faces', result.message, 'error', 'MULTIPLE FACES', '2+');
        return;
      }

      if (result.reasonCode === 'face-out-of-zone') {
        resetToAwaitingState();

        if (result.message.toLowerCase().includes('too close')) {
          setScanFeedback('too-close', result.message, 'warn', 'TOO CLOSE', 'MOVE BACK');
          return;
        }

        if (result.message.toLowerCase().includes('closer')) {
          setScanFeedback('too-far', result.message, 'warn', 'TOO FAR', 'MOVE CLOSER');
          return;
        }

        setScanFeedback('off-center', result.message, 'warn', 'OFF CENTER', 'ALIGN FACE');
        return;
      }

      if (!result.detected) {
        resetToAwaitingState();
        setScanFeedback('no-face', 'No face detected. Align your face with the camera guide.', 'warn', 'NO FACE', '--%');
        return;
      }

      if (result.hasSingleForegroundFace && result.primaryFace) {
        verifying = true;
        setScanFeedback('verifying', 'Face detected. Verifying identity...', 'ok', 'VERIFYING IDENTITY', '...');
        const snapshot = faceCamera.captureFrameJpeg(1080, 0.9);
        if (!snapshot) {
          // verifying = false;
          setScanFeedback('capture-failed', 'Unable to capture camera frame. Please rescan.', 'error', 'CAPTURE FAILED', 'ERR');
          return;
        }

        logInfo('Submitting verification request', {
          // cycle: detectionCycle,
          databasePath: 'verification',
          primaryFace: summarizeFace(result.primaryFace),
        });
        const file = await dataUrlToJpegFile(snapshot);
        const response = await verifyFace(file, 'verification');

        processMatch(response.similarity || 0, response, snapshot);
      }
    } catch (err) {
      const errorPayload = buildErrorPayload(err);
      const errorSignature = `${errorPayload.name ?? 'Error'}:${errorPayload.message ?? JSON.stringify(errorPayload)}`;
      const now = Date.now();

      if (errorSignature !== lastErrorSignature || now - lastErrorLoggedAt >= 4000) {
        logError('Detection loop failed', {
          // cycle: detectionCycle,
          verifying,
          detecting,
          ...errorPayload,
        });
        lastErrorSignature = errorSignature;
        lastErrorLoggedAt = now;
      }

      setScanFeedback('scan-error', 'Scan error. Please rescan and try again.', 'error', 'SCAN ERROR', 'ERR');
      verifying = false;
    } finally {
      detecting = false;
    }
  };

  return {
    element: container,
    onShow: async () => {
      logInfo('Scan screen mounted');
      await faceCamera.start();
      resetToAwaitingState();
      setScanFeedback('initializing', 'Camera ready. Position your face in the center guide.', 'warn', 'LOOKING FOR FACE', '--%');
      detectionTimer = setInterval(() => void runDetection(), 800);
    },
    onHide: () => {
      logInfo('Scan screen unmounted');
      if (detectionTimer) clearInterval(detectionTimer);
      faceCamera.stop();
    }
  };
};
