import { View, navigate } from '../../renderer';
import { createFacePane } from '../../components/face';
import { createKioskLayoutShell } from '../../components/kiosk-layout';
import { svgIconHtml } from '../../components/icons';
import { verifyFace, VerifyFaceResponse } from '../../services/verification';
import { detectFaces, FaceDetectionResult } from '../../services/face-detector';
import { createKioskIdleScreen } from './idle';
import { createKioskApprovedScreen } from './approved';
import { createKioskDeniedScreen } from './denied';
// import type { DetectedFace } from '../../services/face-detector';

type ScanFeedbackTone = 'ok' | 'warn' | 'error';

type LogPayload = Record<string, unknown>;

const CAPTURE_QUALITY_THRESHOLD = 0.5;
const REQUIRED_STABLE_FRAMES = 2;
const COUNTDOWN_SECONDS = 3;

// const buildErrorPayload = (error: unknown): LogPayload => {
//   if (error instanceof Error) {
//     return {
//       name: error.name,
//       message: error.message,
//       stack: error.stack,
//     };
//   }

//   return { value: error };
// };

// const summarizeFace = (face: DetectedFace | null): LogPayload | null => {
//   if (!face) {
//     return null;
//   }

//   return {
//     x: Number(face.x.toFixed(3)),
//     y: Number(face.y.toFixed(3)),
//     width: Number(face.width.toFixed(3)),
//     height: Number(face.height.toFixed(3)),
//     confidence: Number(face.confidence.toFixed(3)),
//   };
// };

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

  // const logError = (message: string, payload?: LogPayload) => {
  //   if (payload) {
  //     console.error(`${logPrefix} ${message}`, payload);
  //     return;
  //   }
  //   console.error(`${logPrefix} ${message}`);
  // };

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
  const countdownBadge = document.createElement('div');
  countdownBadge.className = 'scan-countdown';
  countdownBadge.style.display = 'none';

  const faceCamera = createFacePane();
  liveFrame.append(faceCamera.element, liveCorners, liveScanLine, countdownBadge);

  const liveLabel = document.createElement('span');
  liveLabel.className = 'panel-label';
  liveLabel.textContent = 'LIVE';

  const liveCaptureImg = document.createElement('img');
  liveCaptureImg.className = 'match-thumb live-capture-thumb';
  liveCaptureImg.alt = 'Recently captured face';
  liveCaptureImg.style.display = 'none';

  const livePanel = document.createElement('div');
  livePanel.className = 'video-panel';
  livePanel.append(liveFrame, liveCaptureImg);

  // Match Panel
  const matchPanel = document.createElement('div');
  matchPanel.className = 'video-panel match';
  const matchImg = document.createElement('img');
  matchImg.className = 'match-thumb';
  matchImg.alt = 'Matched face';
  matchImg.style.display = 'none';
  const matchPending = document.createElement('div');
  matchPending.className = 'match-pending';
  const matchPendingSpinner = document.createElement('div');
  matchPendingSpinner.className = 'match-pending-spinner';
  const matchPendingTitle = document.createElement('span');
  matchPendingTitle.className = 'match-pending-title';
  matchPendingTitle.textContent = 'Verifying';
  const matchPendingCopy = document.createElement('span');
  matchPendingCopy.className = 'match-pending-copy';
  matchPendingCopy.textContent = 'Comparing against enrolled faces';
  const matchPendingProgress = document.createElement('div');
  matchPendingProgress.className = 'match-pending-progress';
  const matchPendingProgressFill = document.createElement('div');
  matchPendingProgressFill.className = 'match-pending-progress-fill';
  matchPendingProgress.append(matchPendingProgressFill);
  const matchPendingProgressValue = document.createElement('span');
  matchPendingProgressValue.className = 'match-pending-progress-value';
  matchPendingProgressValue.textContent = '0%';
  matchPending.append(
    matchPendingSpinner,
    matchPendingTitle,
    matchPendingCopy,
    matchPendingProgress,
    matchPendingProgressValue,
  );
  const matchLabel = document.createElement('span');
  matchLabel.className = 'panel-label';
  matchLabel.textContent = 'MATCH';
  matchPanel.append(matchImg, matchPending, matchLabel);

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
  // let lastErrorSignature = '';
  // let lastErrorLoggedAt = 0;

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
  let countdownTimer: ReturnType<typeof setInterval> | null = null;
  let verifying = false;
  let detecting = false;
  let countdownActive = false;
  let countdownRemaining = 0;
  let resultLocked = false;
  let lastResponse: VerifyFaceResponse | null = null;
  let lastEligibleDetection: FaceDetectionResult | null = null;
  let countdownAudioContext: AudioContext | null = null;
  let stableFaceFrames = 0;
  let warmUntil = 0;
  let verifyProgressTimer: ReturnType<typeof setInterval> | null = null;
  let verifyProgressValue = 0;
  let verifyProgressStartedAt = 0;

  const setRescanLocked = (locked: boolean): void => {
    btnRescan.disabled = locked;
  };

  const updateDetectionGauge = (
    qualityScore: number,
    tone: ScanFeedbackTone,
    label = 'DETECTION QUALITY',
  ): void => {
    matchTag.textContent = label;
    matchPercent.textContent = `${Math.round(qualityScore * 100)}%`;
    matchBox.dataset.tone = tone;
  };

  const getQualityScore = (result: FaceDetectionResult): number =>
    result.primaryFace?.confidence ?? result.qualityScore ?? 0;

  const isCaptureEligible = (result: FaceDetectionResult): boolean => {
    const quality = getQualityScore(result);
    return (
      result.detected &&
      Boolean(result.primaryFace) &&
      result.faceCount === 1 &&
      result.reasonCode !== 'multiple-faces' &&
      quality >= CAPTURE_QUALITY_THRESHOLD
    );
  };

  const showCountdown = (value: number): void => {
    countdownBadge.textContent = String(value);
    countdownBadge.style.display = 'flex';
    liveFrame.classList.add('countdown-active');
  };

  const hideCountdown = (): void => {
    countdownBadge.style.display = 'none';
    countdownBadge.textContent = '';
    liveFrame.classList.remove('countdown-active');
  };

  const stopCountdown = (resetStableFrames = true): void => {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }

    countdownActive = false;
    countdownRemaining = 0;
    hideCountdown();
    setRescanLocked(false);

    if (resetStableFrames) {
      stableFaceFrames = 0;
    }
  };

  const ensureCountdownAudioContext = (): AudioContext | null => {
    if (countdownAudioContext) {
      return countdownAudioContext;
    }

    const AudioContextCtor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      return null;
    }

    countdownAudioContext = new AudioContextCtor();
    return countdownAudioContext;
  };

  const playCountdownBeep = (): void => {
    const audioContext = ensureCountdownAudioContext();
    if (!audioContext) {
      return;
    }

    if (audioContext.state === 'suspended') {
      void audioContext.resume().catch(() => undefined);
    }

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(987, now);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.09, now + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.2);
  };

  // const resetToAwaitingState = () => {
  //   lastResponse = null;
  //   btnConfirm.disabled = true;
  //   matchImg.style.display = 'none';
  //   tokenInfo.innerHTML = defaultTokenHtml;
  //   timeInfo.innerHTML = defaultTimeHtml;
  //   logInfo('Reset to awaiting state');
  // };

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

  const setMatchPendingProgressValue = (value: number) => {
    const bounded = Math.max(0, Math.min(100, value));
    verifyProgressValue = bounded;
    matchPendingProgressFill.style.width = `${bounded.toFixed(1)}%`;
    matchPendingProgressValue.textContent = `${Math.round(bounded)}%`;
  };

  const stopMatchPendingProgress = (finalValue?: number) => {
    if (verifyProgressTimer) {
      clearInterval(verifyProgressTimer);
      verifyProgressTimer = null;
    }

    if (typeof finalValue === 'number') {
      setMatchPendingProgressValue(finalValue);
    }
  };

  const setMatchPanelIdle = () => {
    stopMatchPendingProgress(0);
    matchImg.style.display = 'none';
    matchPending.dataset.state = 'idle';
    matchPendingTitle.textContent = 'Awaiting scan';
    matchPendingCopy.textContent = 'The closest enrolled face will appear here';
    matchPendingProgressValue.textContent = 'READY';
  };

  const setMatchPanelVerifying = () => {
    stopMatchPendingProgress(10);
    matchImg.style.display = 'none';
    matchPending.dataset.state = 'verifying';
    matchPendingTitle.textContent = 'Verifying';
    matchPendingCopy.textContent = 'Comparing against enrolled faces';
    verifyProgressStartedAt = performance.now();
    verifyProgressTimer = setInterval(() => {
      const elapsedSeconds = (performance.now() - verifyProgressStartedAt) / 1000;
      const target = 10 + (84 * (1 - Math.exp(-elapsedSeconds / 4.2)));
      const nextValue = verifyProgressValue + ((target - verifyProgressValue) * 0.22);
      setMatchPendingProgressValue(nextValue);

      if (elapsedSeconds > 6) {
        matchPendingCopy.textContent = 'Still verifying. This can take a few seconds';
      }
      if (elapsedSeconds > 12) {
        matchPendingCopy.textContent = 'Final checks are running. Waiting for response';
      }
    }, 140);
  };

  const setMatchPanelResult = (imageUrl: string) => {
    stopMatchPendingProgress(100);
    matchImg.src = imageUrl;
    matchImg.style.display = 'block';
    matchPending.dataset.state = 'hidden';
  };

  const setMatchPanelManualRescan = (title: string, copy: string) => {
    stopMatchPendingProgress(0);
    matchImg.style.display = 'none';
    matchPending.dataset.state = 'manual-rescan';
    matchPendingTitle.textContent = title;
    matchPendingCopy.textContent = copy;
    matchPendingProgressValue.textContent = 'RESCAN';
  };

  const buildCleanPreviewFromSnapshot = async (
    snapshotDataUrl: string,
    targetSize = 1080,
  ): Promise<string | null> => {
    const image = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = snapshotDataUrl;
    });

    if (!image?.naturalWidth || !image.naturalHeight) {
      return snapshotDataUrl;
    }

    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = image.naturalWidth;
    sourceCanvas.height = image.naturalHeight;
    const sourceCtx = sourceCanvas.getContext('2d');

    if (!sourceCtx) {
      return snapshotDataUrl;
    }

    sourceCtx.drawImage(image, 0, 0);
    const pixels = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const { data, width, height } = pixels;
    const sampleStep = Math.max(1, Math.floor(height / 240));
    const blackThreshold = 20;
    const darkRatioThreshold = 0.985;

    const isBlackEdgeColumn = (x: number): boolean => {
      let darkCount = 0;
      let count = 0;

      for (let y = 0; y < height; y += sampleStep) {
        const idx = (y * width + x) * 4;
        const brightness = Math.max(data[idx] || 0, data[idx + 1] || 0, data[idx + 2] || 0);
        if (brightness <= blackThreshold) {
          darkCount += 1;
        }
        count += 1;
      }

      return count > 0 && darkCount / count >= darkRatioThreshold;
    };

    let left = 0;
    let right = width - 1;

    while (left < right && isBlackEdgeColumn(left)) left += 1;
    while (right > left && isBlackEdgeColumn(right)) right -= 1;

    const trimmedWidth = right - left + 1;
    if (trimmedWidth <= 0) {
      return snapshotDataUrl;
    }

    const cropWidth = trimmedWidth;
    const cropHeight = height;
    const squareSize = Math.min(cropWidth, cropHeight);
    const squareX = left + (cropWidth - squareSize) / 2;
    const squareY = (cropHeight - squareSize) / 2;

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = targetSize;
    outputCanvas.height = targetSize;
    const outputCtx = outputCanvas.getContext('2d');

    if (!outputCtx) {
      return snapshotDataUrl;
    }

    outputCtx.drawImage(
      sourceCanvas,
      squareX,
      squareY,
      squareSize,
      squareSize,
      0,
      0,
      targetSize,
      targetSize,
    );

    return outputCanvas.toDataURL('image/jpeg', 0.92);
  };

  const freezeLivePanel = (snapshot: string) => {
    liveCaptureImg.src = snapshot;
    liveCaptureImg.style.display = 'block';
    liveFrame.style.display = 'none';
    liveLabel.textContent = 'CAPTURE';
  };

  const lockForManualRescan = (statusText: string, title: string, copy: string) => {
    resultLocked = true;
    verifying = false;
    btnConfirm.disabled = true;
    lastResponse = null;
    matchBox.dataset.tone = 'warn';
    matchTag.textContent = 'MANUAL RESCAN REQUIRED';
    matchPercent.textContent = 'RETRY';
    tokenInfo.innerHTML = defaultTokenHtml;
    timeInfo.innerHTML = defaultTimeHtml;
    faceCamera.setStatus(statusText, 'error');
    setMatchPanelManualRescan(title, copy);
    logWarn('Scan locked pending manual rescan', {
      statusText,
      title,
      copy,
    });
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
      setMatchPanelResult(response.bestMatchImageDataUrl || snapshot);
      btnConfirm.disabled = false;
      setScanFeedback('recognized', `Identity verified (${percent}%). Press confirm to continue.`, 'ok', 'FACIAL MATCH SIMILARITY', `${percent}%`);

      const emp = response.employee;
      tokenInfo.innerHTML = `<span class="icon">${svgIconHtml('fingerprint')}</span><div><small>TOKEN ID</small><p>${emp?.id || 'VERIFIED'}</p></div>`;
      timeInfo.innerHTML = `<span class="icon">${svgIconHtml('clock')}</span><div><small>TIMESTAMP</small><p>${new Date().toLocaleTimeString()}</p></div>`;
      faceCamera.setStatus('Identity verified. Press confirm to continue.', 'ok');
    } else {
      if (response.reasonCode === 'no-face' || response.reasonCode === 'service-error') {
        const rescanMessage = response.reasonCode === 'no-face'
          ? 'No face detected in the captured image. Press rescan to try again.'
          : 'Could not reach the verification API. Press rescan to try again.';
        lockForManualRescan(
          rescanMessage,
          'Manual rescan required',
          rescanMessage,
        );
        return;
      }

      faceCamera.setStatus('Face not recognized. Redirecting...', 'error');
      matchBox.dataset.tone = 'error';
      matchTag.textContent = 'MATCH FAILED';
      matchPercent.textContent = 'FAIL';
      setMatchPanelIdle();
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

  const runCapturePipeline = async (statusLabel: string): Promise<void> => {
    if (resultLocked || verifying) {
      return;
    }

    verifying = true;
    setRescanLocked(true);
    faceCamera.setStatus(statusLabel, 'warn');
    setMatchPanelVerifying();

    try {
      const rawSnapshot = faceCamera.captureFrameJpeg(1080, 0.9);
      if (!rawSnapshot) {
        faceCamera.setStatus('Camera frame not ready', 'error');
        setMatchPanelIdle();
        return;
      }

      const displaySnapshot = await buildCleanPreviewFromSnapshot(rawSnapshot) || rawSnapshot;
      freezeLivePanel(displaySnapshot);

      const file = await dataUrlToJpegFile(rawSnapshot);
      const response = await verifyFace(file, 'temp_images');
      resultLocked = true;
      processMatch(response.similarity || 0, response, rawSnapshot);
    } catch (error) {
      console.error('Capture pipeline failed', error);
      faceCamera.setStatus('Verification error', 'error');
      updateDetectionGauge(0, 'error', 'CAPTURE FAILED');
    } finally {
      verifying = false;
      if (!resultLocked) {
        setRescanLocked(false);
      }
    }
  };

  const startCountdown = (): void => {
    if (countdownActive || resultLocked || verifying) {
      return;
    }

    countdownActive = true;
    countdownRemaining = COUNTDOWN_SECONDS;
    setRescanLocked(true);
    showCountdown(countdownRemaining);
    faceCamera.setStatus(`Hold still. Capturing in ${countdownRemaining}...`, 'ok');
    playCountdownBeep();

    countdownTimer = setInterval(() => {
      countdownRemaining -= 1;

      if (countdownRemaining > 0) {
        showCountdown(countdownRemaining);
        faceCamera.setStatus(`Hold still. Capturing in ${countdownRemaining}...`, 'ok');
        playCountdownBeep();
        return;
      }

      if (!lastEligibleDetection || !isCaptureEligible(lastEligibleDetection)) {
        stopCountdown();
        faceCamera.setStatus('Face moved. Realign to restart countdown.', 'warn');
        return;
      }

      stopCountdown();
      void runCapturePipeline('Capturing face');
    }, 1000);
  };

  const runDetection = async () => {
    if (resultLocked || verifying || detecting) return;
    detecting = true;
    // detectionCycle += 1;

    try {
      const video = faceCamera.getVideoElement();
      if (
        Date.now() < warmUntil ||
        video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA ||
        !video.videoWidth ||
        !video.videoHeight
      ) {
        stopCountdown();
        lastEligibleDetection = null;
        stableFaceFrames = 0;
        faceCamera.setStatus('Initializing camera', 'warn');
        updateDetectionGauge(0, 'warn');
        return;
      }

      const result = await detectFaces(faceCamera.getVideoElement());
      const qualityScore = getQualityScore(result);

      console.log('Detecting Face');
      faceCamera.setFaceOverlay(result.primaryFace);

      if (result.reasonCode === 'not-supported') {
        stopCountdown();
        lastEligibleDetection = null;
        stableFaceFrames = 0;
        updateDetectionGauge(0, 'warn', 'DETECTION QUALITY');
        void runCapturePipeline('Detector unavailable, sending to API');
        return;
      }

      if (result.reasonCode === 'multiple-faces') {
        stopCountdown();
        lastEligibleDetection = null;
        stableFaceFrames = 0;
        faceCamera.setStatus('Multiple faces detected', 'warn');
        updateDetectionGauge(qualityScore, 'warn');
        return;
      }

      if (!result.detected || !result.primaryFace) {
        stopCountdown();
        lastEligibleDetection = null;
        stableFaceFrames = 0;
        faceCamera.setStatus('Align face with camera', 'warn');
        updateDetectionGauge(0, 'warn');
        return;
      }

      if (qualityScore < CAPTURE_QUALITY_THRESHOLD) {
        stopCountdown();
        lastEligibleDetection = null;
        stableFaceFrames = 0;
        faceCamera.setStatus(
          `Improve alignment (${Math.round(qualityScore * 100)}% / ${Math.round(CAPTURE_QUALITY_THRESHOLD * 100)}%)`,
          'warn',
        );
        updateDetectionGauge(qualityScore, 'warn');
        return;
      }

      lastEligibleDetection = result;
      stableFaceFrames += 1;

      updateDetectionGauge(qualityScore, 'ok');

      if (countdownActive) {
        faceCamera.setStatus(`Hold still. Capturing in ${countdownRemaining}...`, 'ok');
        return;
      }

      if (stableFaceFrames < REQUIRED_STABLE_FRAMES) {
        faceCamera.setStatus('Locking face. Hold still for countdown.', 'ok');
        return;
      }

      startCountdown();
    } catch (err) {
      console.error('Detection failed', err);
      lockForManualRescan(
        'Verification request failed. Press rescan to try again.',
        'Manual rescan required',
        'The captured image was kept on screen because the API request failed.',
      );
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
      warmUntil = Date.now() + 1500;
      stableFaceFrames = 0;
      lastEligibleDetection = null;
      setMatchPanelIdle();
      updateDetectionGauge(0, 'warn');
      faceCamera.setStatus('Scanning face', 'warn');
      detectionTimer = setInterval(() => void runDetection(), 800);
    },
    onHide: () => {
      logInfo('Scan screen unmounted');
      if (detectionTimer) clearInterval(detectionTimer);
      stopCountdown();
      stopMatchPendingProgress();

      if (countdownAudioContext) {
        void countdownAudioContext.close().catch(() => undefined);
        countdownAudioContext = null;
      }

      faceCamera.stop();
    }
  };
};
