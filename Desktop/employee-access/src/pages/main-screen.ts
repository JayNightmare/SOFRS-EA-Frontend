import { createFacePane } from '../components/face';
import { verifyFace } from '../services/verification';
import { detectFaces, FaceDetectionResult } from '../services/face-detector';
import type { VerifyFaceResponse, EmployeeRecord } from '../services/verification';
import { resolveMobileSetupUrl } from '../services/settings';

type MainScreenView = {
    element: HTMLElement;
    onShow: () => Promise<void>;
    onHide: () => void;
};

type StatusTone = 'ok' | 'warn' | 'error';
type Stage =
    | 'warming'
    | 'detecting'
    | 'capturing'
    | 'uploading'
    | 'waiting'
    | 'verifying'
    | 'recognized'
    | 'unrecognized'
    | 'desktop-setup'
    | 'no-camera'
    | 'error';

const ENROLLMENT_POSES = ['Front', 'Left', 'Right', 'Up', 'Down'];

const getMobileSetupUrl = (): string => {
    return resolveMobileSetupUrl();
};

const getToneFromStage = (stage: Stage): StatusTone => {
    if (stage === 'recognized') {
        return 'ok';
    }

    if (stage === 'error' || stage === 'no-camera') {
        return 'error';
    }

    return 'warn';
};

const formatTimestamp = (): string => {
    const now = new Date();
    return now.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};

const getSimilarityLevel = (similarity: number): 'high' | 'medium' | 'low' => {
    if (similarity >= 0.8) return 'high';
    if (similarity >= 0.6) return 'medium';
    return 'low';
};

/**
 * Crops a face region from a full-frame JPEG data URL using an offscreen canvas.
 * Returns a circular-ready data URL of just the face area.
 */
const cropFaceFromFrame = (
    frameDataUrl: string,
    faceBox: { x: number; y: number; width: number; height: number },
): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const fx = faceBox.x * img.width;
            const fy = faceBox.y * img.height;
            const fw = faceBox.width * img.width;
            const fh = faceBox.height * img.height;

            const padding = Math.max(fw, fh) * 0.25;
            const sx = Math.max(0, fx - padding);
            const sy = Math.max(0, fy - padding);
            const sw = Math.min(img.width - sx, fw + padding * 2);
            const sh = Math.min(img.height - sy, fh + padding * 2);

            const size = Math.max(sw, sh);
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = size;
            cropCanvas.height = size;
            const ctx = cropCanvas.getContext('2d');
            if (!ctx) {
                resolve(frameDataUrl);
                return;
            }

            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
            resolve(cropCanvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = () => resolve(frameDataUrl);
        img.src = frameDataUrl;
    });
};

const createDetailRow = (label: string, value: string): HTMLElement => {
    const row = document.createElement('div');
    row.className = 'employee-detail-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'employee-detail-label';
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.className = 'employee-detail-value';
    valueEl.textContent = value;

    row.append(labelEl, valueEl);
    return row;
};

export const createMainScreenPage = (): MainScreenView => {
    const shell = document.createElement('main');
    shell.className = 'gate-shell';

    const camera = createFacePane();

    const overlay = document.createElement('section');
    overlay.className = 'gate-overlay';

    const header = document.createElement('header');
    header.className = 'gate-header';

    const title = document.createElement('h1');
    title.className = 'gate-title';
    title.textContent = 'SOFRS Entry Camera';

    const subtitle = document.createElement('p');
    subtitle.className = 'gate-subtitle';
    subtitle.textContent = 'Face the camera and hold still. Only one foreground face can be verified at a time.';

    header.append(title, subtitle);

    const stageMessage = document.createElement('div');
    stageMessage.className = 'stage-message';

    const stageLabel = document.createElement('p');
    stageLabel.className = 'stage-label';

    const stageDetail = document.createElement('p');
    stageDetail.className = 'stage-detail';

    stageMessage.append(stageLabel, stageDetail);

    const bottomPanel = document.createElement('section');
    bottomPanel.className = 'progress-panel';

    const progressTrack = document.createElement('div');
    progressTrack.className = 'progress-track';

    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';

    const progressValue = document.createElement('span');
    progressValue.className = 'progress-value';

    progressTrack.append(progressFill);
    bottomPanel.append(progressTrack, progressValue);

    /* ── Result Card (enhanced) ── */
    const resultCard = document.createElement('section');
    resultCard.className = 'result-card';

    const resultFaceRow = document.createElement('div');
    resultFaceRow.className = 'result-face-row';

    const resultFaceThumbnail = document.createElement('img');
    resultFaceThumbnail.className = 'result-face-thumbnail';
    resultFaceThumbnail.alt = 'Captured face';

    const resultFaceInfo = document.createElement('div');
    resultFaceInfo.className = 'result-face-info';

    const resultFaceName = document.createElement('h2');
    resultFaceName.className = 'result-face-name';

    const resultFaceRole = document.createElement('p');
    resultFaceRole.className = 'result-face-role';

    resultFaceInfo.append(resultFaceName, resultFaceRole);
    resultFaceRow.append(resultFaceThumbnail, resultFaceInfo);

    const resultTitle = document.createElement('h2');
    resultTitle.className = 'result-title';

    const resultCopy = document.createElement('p');
    resultCopy.className = 'result-copy';

    const employeeDetails = document.createElement('div');
    employeeDetails.className = 'employee-details';

    const similarityBadge = document.createElement('div');
    similarityBadge.className = 'similarity-badge';

    const resultTimestamp = document.createElement('p');
    resultTimestamp.className = 'result-timestamp';

    const resultActions = document.createElement('div');
    resultActions.className = 'result-actions';

    const retryButton = document.createElement('button');
    retryButton.className = 'action-btn retry-btn';
    retryButton.type = 'button';
    retryButton.textContent = 'Retry Scan';

    const desktopSetupButton = document.createElement('button');
    desktopSetupButton.className = 'action-btn';
    desktopSetupButton.type = 'button';
    desktopSetupButton.dataset.variant = 'secondary';
    desktopSetupButton.textContent = 'Setup FaceID Here';

    const mobileSetupButton = document.createElement('button');
    mobileSetupButton.className = 'action-btn';
    mobileSetupButton.type = 'button';
    mobileSetupButton.dataset.variant = 'secondary';
    mobileSetupButton.textContent = 'Use Mobile App';

    resultActions.append(desktopSetupButton, mobileSetupButton);
    resultCard.append(
        resultFaceRow,
        resultTitle,
        resultCopy,
        employeeDetails,
        similarityBadge,
        resultTimestamp,
        resultActions,
    );

    /* ── Mobile Panel ── */
    const mobilePanel = document.createElement('section');
    mobilePanel.className = 'mobile-panel';

    const mobileTitle = document.createElement('h3');
    mobileTitle.className = 'mobile-title';
    mobileTitle.textContent = 'Continue FaceID Setup on Mobile';

    const mobileCopy = document.createElement('p');
    mobileCopy.className = 'mobile-copy';

    const mobileQr = document.createElement('img');
    mobileQr.className = 'mobile-qr';
    mobileQr.alt = 'Mobile FaceID setup QR code';

    const mobileLink = document.createElement('a');
    mobileLink.className = 'mobile-link';
    mobileLink.rel = 'noopener noreferrer';
    mobileLink.target = '_blank';

    mobilePanel.append(mobileTitle, mobileCopy, mobileQr, mobileLink);

    /* ── Desktop Enrollment Panel ── */
    const desktopPanel = document.createElement('section');
    desktopPanel.className = 'desktop-setup-panel';

    const desktopTitle = document.createElement('h3');
    desktopTitle.className = 'desktop-title';
    desktopTitle.textContent = 'Desktop FaceID Enrollment';

    const desktopCopy = document.createElement('p');
    desktopCopy.className = 'desktop-copy';

    const desktopProgress = document.createElement('p');
    desktopProgress.className = 'desktop-progress';

    const desktopCaptureButton = document.createElement('button');
    desktopCaptureButton.className = 'action-btn';
    desktopCaptureButton.type = 'button';
    desktopCaptureButton.textContent = 'Capture Pose';

    desktopPanel.append(desktopTitle, desktopCopy, desktopProgress, desktopCaptureButton);

    /* ── No Camera Panel ── */
    const noCameraPanel = document.createElement('section');
    noCameraPanel.className = 'no-camera-panel';

    const noCameraIcon = document.createElement('div');
    noCameraIcon.className = 'no-camera-icon';
    noCameraIcon.textContent = '📱';

    const noCameraTitle = document.createElement('h3');
    noCameraTitle.className = 'no-camera-title';
    noCameraTitle.textContent = 'No Webcam Detected';

    const noCameraCopy = document.createElement('p');
    noCameraCopy.className = 'no-camera-copy';
    noCameraCopy.textContent = 'Use your phone as a camera. Scan the QR code below with the SOFRS mobile app to take a verification photo.';

    const noCameraQr = document.createElement('img');
    noCameraQr.className = 'mobile-qr';
    noCameraQr.alt = 'Connect mobile device QR code';

    const noCameraWaiting = document.createElement('div');
    noCameraWaiting.className = 'no-camera-waiting';

    const noCameraSpinner = document.createElement('div');
    noCameraSpinner.className = 'spinner';

    const noCameraWaitingText = document.createElement('span');
    noCameraWaitingText.textContent = 'Waiting for photo from phone…';

    noCameraWaiting.append(noCameraSpinner, noCameraWaitingText);
    noCameraPanel.append(noCameraIcon, noCameraTitle, noCameraCopy, noCameraQr, noCameraWaiting);

    overlay.append(header, stageMessage, resultCard, mobilePanel, desktopPanel, noCameraPanel, bottomPanel, retryButton);
    shell.append(camera.element, overlay);

    let detectionTimer: ReturnType<typeof setInterval> | null = null;
    let animFrame: number | null = null;
    let requestAbort: AbortController | null = null;
    let targetProgress = 0;
    let currentProgress = 0;
    let verifying = false;
    let loopPaused = false;
    let enrollmentSamples: Record<string, string> = {};
    let lastCapturedFrame: string | null = null;

    const setProgressTarget = (value: number): void => {
        targetProgress = Math.max(0, Math.min(100, value));
    };

    const runProgressAnimation = (): void => {
        const tick = (): void => {
            currentProgress += (targetProgress - currentProgress) * 0.14;
            const rounded = Math.max(0, Math.min(100, currentProgress));
            progressFill.style.width = `${rounded.toFixed(1)}%`;
            progressValue.textContent = `${Math.round(rounded)}%`;
            animFrame = window.requestAnimationFrame(tick);
        };

        if (animFrame === null) {
            animFrame = window.requestAnimationFrame(tick);
        }
    };

    const stopProgressAnimation = (): void => {
        if (animFrame !== null) {
            window.cancelAnimationFrame(animFrame);
            animFrame = null;
        }
    };

    const setStage = (next: Stage, label: string, detail: string): void => {
        stageLabel.textContent = label;
        stageDetail.textContent = detail;
        shell.dataset.stage = next;
        camera.setStatus(label, getToneFromStage(next));
    };

    const hidePanels = (): void => {
        resultCard.style.display = 'none';
        mobilePanel.style.display = 'none';
        desktopPanel.style.display = 'none';
        noCameraPanel.style.display = 'none';
        delete resultCard.dataset.outcome;
    };

    const setDetectingMode = (): void => {
        hidePanels();
        loopPaused = false;
        verifying = false;
        lastCapturedFrame = null;
        setStage('detecting', 'Detecting face', 'Keep your face centered and close to the camera guide.');
        setProgressTarget(12);
        camera.setFaceOverlay(null);
    };

    const populateEmployeeDetails = (
        employee: EmployeeRecord | null,
        similarity: number,
    ): void => {
        employeeDetails.replaceChildren();

        if (employee?.department) {
            employeeDetails.append(createDetailRow('Department', employee.department));
        }
        if (employee?.title) {
            employeeDetails.append(createDetailRow('Title', employee.title));
        }
        if (employee?.id) {
            employeeDetails.append(createDetailRow('ID', employee.id));
        }

        employeeDetails.append(
            createDetailRow('Verified at', formatTimestamp()),
        );

        const level = getSimilarityLevel(similarity);
        similarityBadge.dataset.level = level;
        similarityBadge.textContent = `${(similarity * 100).toFixed(1)}% match`;
        similarityBadge.style.display = similarity > 0 ? 'inline-flex' : 'none';

        employeeDetails.style.display = employeeDetails.children.length > 0 ? 'grid' : 'none';
    };

    const showRecognized = async (
        response: VerifyFaceResponse,
        capturedFrame: string | null,
        primaryFace: { x: number; y: number; width: number; height: number } | null,
    ): Promise<void> => {
        hidePanels();
        resultCard.style.display = 'grid';
        resultCard.dataset.outcome = 'success';

        const name = response.employee?.name ?? 'Unknown';
        resultFaceName.textContent = name;
        resultFaceRole.textContent = response.employee?.department ?? 'Employee';
        resultTitle.textContent = response.message;
        resultCopy.textContent = `Welcome back, ${name}.`;
        resultTimestamp.textContent = formatTimestamp();

        if (capturedFrame && primaryFace) {
            const cropped = await cropFaceFromFrame(capturedFrame, primaryFace);
            resultFaceThumbnail.src = cropped;
            resultFaceThumbnail.style.display = 'block';
        } else if (capturedFrame) {
            resultFaceThumbnail.src = capturedFrame;
            resultFaceThumbnail.style.display = 'block';
        } else {
            resultFaceThumbnail.style.display = 'none';
        }

        populateEmployeeDetails(response.employee, response.similarity);

        resultActions.style.display = 'grid';
        desktopSetupButton.style.display = 'none';
        mobileSetupButton.style.display = 'none';

        setStage('recognized', 'Access verified', 'Recognition completed. Proceed to employee records.');
        setProgressTarget(100);
        loopPaused = true;
    };

    const showUnrecognized = async (
        message: string,
        capturedFrame: string | null,
        primaryFace: { x: number; y: number; width: number; height: number } | null,
    ): Promise<void> => {
        hidePanels();
        resultCard.style.display = 'grid';
        resultCard.dataset.outcome = 'failure';

        resultFaceName.textContent = 'Not recognized';
        resultFaceRole.textContent = 'Unknown person';
        resultTitle.textContent = 'Face not recognized';
        resultCopy.textContent = message;
        resultTimestamp.textContent = formatTimestamp();

        if (capturedFrame && primaryFace) {
            const cropped = await cropFaceFromFrame(capturedFrame, primaryFace);
            resultFaceThumbnail.src = cropped;
            resultFaceThumbnail.style.display = 'block';
        } else if (capturedFrame) {
            resultFaceThumbnail.src = capturedFrame;
            resultFaceThumbnail.style.display = 'block';
        } else {
            resultFaceThumbnail.style.display = 'none';
        }

        employeeDetails.style.display = 'none';
        similarityBadge.style.display = 'none';

        resultActions.style.display = 'grid';
        desktopSetupButton.style.display = 'inline-flex';
        mobileSetupButton.style.display = 'inline-flex';

        setStage('unrecognized', 'Verification failed', 'Choose how you want to set up FaceID.');
        setProgressTarget(100);
        loopPaused = true;
    };

    const showError = (message: string): void => {
        hidePanels();
        resultCard.style.display = 'grid';
        resultCard.dataset.outcome = 'failure';

        resultFaceThumbnail.style.display = 'none';
        resultFaceName.textContent = 'Verification error';
        resultFaceRole.textContent = '';
        resultTitle.textContent = 'Unable to verify';
        resultCopy.textContent = message;
        resultTimestamp.textContent = formatTimestamp();
        employeeDetails.style.display = 'none';
        similarityBadge.style.display = 'none';

        resultActions.style.display = 'grid';
        desktopSetupButton.style.display = 'none';
        mobileSetupButton.style.display = 'none';

        setStage('error', 'Unable to continue', message);
        setProgressTarget(100);
        loopPaused = true;
    };

    const showNoCameraPanel = async (): Promise<void> => {
        hidePanels();
        noCameraPanel.style.display = 'grid';

        setStage('no-camera', 'No webcam', 'Connect your phone to take a verification photo.');
        setProgressTarget(0);
        loopPaused = true;

        try {
            const [port, localIp] = await Promise.all([
                window.relay.getPort(),
                window.relay.getLocalIp(),
            ]);

            const relayUrl = `sofrs://relay-capture?ws=${localIp}:${port}`;
            noCameraQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(relayUrl)}`;
            noCameraCopy.textContent = `Scan this QR code with the SOFRS mobile app. Relay server at ${localIp}:${port}`;

            window.relay.onPhoto(async (dataUrl: string) => {
                noCameraWaitingText.textContent = 'Photo received! Verifying…';
                setStage('verifying', 'Verifying photo', 'Processing photo received from mobile device.');
                setProgressTarget(60);

                try {
                    const imageFile = await dataUrlToJpegFile(dataUrl);
                    const response = await verifyFace(imageFile, 'verification');

                    if (response.recognized) {
                        await showRecognized(response, dataUrl, null);
                    } else {
                        await showUnrecognized(response.message, dataUrl, null);
                    }
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Verification failed.';
                    showError(message);
                }
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Cannot start relay server.';
            noCameraCopy.textContent = `Relay server failed: ${message}`;
        }
    };

    const startDesktopEnrollment = (): void => {
        hidePanels();
        desktopPanel.style.display = 'grid';
        enrollmentSamples = {};
        setStage('desktop-setup', 'Desktop FaceID setup', 'Capture each pose to start enrollment.');
        setProgressTarget(15);

        const nextPose = ENROLLMENT_POSES[0];
        desktopCopy.textContent = `Pose 1/${ENROLLMENT_POSES.length}: face ${nextPose.toLowerCase()} and press capture.`;
        desktopProgress.textContent = '0 captures completed.';
    };

    const toggleMobilePanel = (): void => {
        const visible = mobilePanel.style.display === 'grid';

        if (visible) {
            mobilePanel.style.display = 'none';
            return;
        }

        const setupUrl = getMobileSetupUrl();
        mobileQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(setupUrl)}`;
        mobileCopy.textContent = 'Scan this QR with your phone to continue FaceID setup in the mobile app.';
        mobileLink.href = setupUrl;
        mobileLink.textContent = setupUrl;
        mobilePanel.style.display = 'grid';
    };

    const dataUrlToJpegFile = async (dataUrl: string): Promise<File> => {
        const blob = await fetch(dataUrl).then((response) => response.blob());
        return new File([blob], 'face.jpg', { type: 'image/jpeg' });
    };

    const runVerification = async (detection: FaceDetectionResult): Promise<void> => {
        if (!detection.primaryFace || verifying || loopPaused) {
            return;
        }

        const snapshot = camera.captureFrameJpeg(1080, 0.9);
        if (!snapshot) {
            return;
        }

        lastCapturedFrame = snapshot;
        verifying = true;
        setStage('capturing', 'Capturing frame', 'Face captured. Preparing verification request.');
        setProgressTarget(34);

        requestAbort = new AbortController();

        try {
            setStage('uploading', 'Sending to API', 'Uploading captured face to verification service.');
            setProgressTarget(56);

            const imageFile = await dataUrlToJpegFile(snapshot);

            const response = await verifyFace(imageFile, "verification", requestAbort.signal);

            setStage('verifying', 'Verifying response', 'Evaluating recognition response and policy checks.');
            setProgressTarget(85);

            if (response.recognized) {
                await showRecognized(response, lastCapturedFrame, detection.primaryFace);
            } else {
                await showUnrecognized(response.message, lastCapturedFrame, detection.primaryFace);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown verification error.';
            showError(message);
        } finally {
            verifying = false;
            requestAbort = null;
        }
    };

    const runDetection = async (): Promise<void> => {
        if (loopPaused || verifying) {
            return;
        }

        try {
            const response = await detectFaces(camera.getVideoElement());

            camera.setFaceOverlay(response.primaryFace);

            if (response.reasonCode === 'not-supported') {
                showError(response.message);
                return;
            }

            if (response.reasonCode === 'multiple-faces') {
                setStage('detecting', 'Single face required', 'Only one foreground face can be in front of the camera.');
                setProgressTarget(10);
                return;
            }

            if (response.reasonCode === 'face-out-of-zone') {
                setStage('detecting', 'Move closer', 'Center your face inside the guide and stay still.');
                setProgressTarget(14);
                return;
            }

            if (!response.detected) {
                setStage('detecting', 'Face not found', 'Align your face to start verification.');
                setProgressTarget(8);
                return;
            }

            if (response.hasSingleForegroundFace) {
                setStage('detecting', 'Face locked', 'Stable face found. Starting verification sequence.');
                setProgressTarget(22);
                await runVerification(response);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown detection failure.';
            showError(message);
        }
    };

    retryButton.addEventListener('click', () => {
        currentProgress = 0;
        setDetectingMode();
    });

    desktopSetupButton.addEventListener('click', () => {
        startDesktopEnrollment();
    });

    mobileSetupButton.addEventListener('click', () => {
        toggleMobilePanel();
    });

    desktopCaptureButton.addEventListener('click', () => {
        const completed = Object.keys(enrollmentSamples).length;
        const pose = ENROLLMENT_POSES[completed];

        if (!pose) {
            desktopProgress.textContent = 'Enrollment samples complete. You can now submit these images to FaceID enrollment API.';
            setProgressTarget(100);
            return;
        }

        const image = camera.captureFrameJpeg(640, 0.92);
        if (!image) {
            desktopProgress.textContent = 'Camera frame not ready. Hold still and retry capture.';
            return;
        }

        enrollmentSamples[pose] = image;
        const count = Object.keys(enrollmentSamples).length;
        setProgressTarget(20 + (count * 15));

        if (count < ENROLLMENT_POSES.length) {
            const nextPose = ENROLLMENT_POSES[count];
            desktopCopy.textContent = `Pose ${count + 1}/${ENROLLMENT_POSES.length}: face ${nextPose.toLowerCase()} and press capture.`;
            desktopProgress.textContent = `${count} captures completed.`;
            return;
        }

        desktopCopy.textContent = 'All enrollment captures are complete.';
        desktopProgress.textContent = '5 captures complete. Submit these samples to your FaceID enrollment endpoint.';
        setProgressTarget(100);
    });

    return {
        element: shell,
        onShow: async () => {
            hidePanels();
            setStage('warming', 'Initializing camera', 'Starting webcam and loading face detector.');
            setProgressTarget(4);
            runProgressAnimation();

            await camera.start();

            if (!camera.getCameraAvailable()) {
                await showNoCameraPanel();
                return;
            }

            setDetectingMode();

            await runDetection();
            detectionTimer = setInterval(() => {
                void runDetection();
            }, 700);
        },
        onHide: () => {
            if (detectionTimer) {
                clearInterval(detectionTimer);
                detectionTimer = null;
            }

            if (requestAbort) {
                requestAbort.abort();
                requestAbort = null;
            }

            stopProgressAnimation();
            camera.stop();
            window.relay.removePhotoListener();
        },
    };
};
