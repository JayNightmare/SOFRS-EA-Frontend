import { createFacePane } from '../components/face';
import { verifyFace } from '../services/verification';

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
    | 'error';

const ENROLLMENT_POSES = ['Front', 'Left', 'Right', 'Up', 'Down'];

const getMobileSetupUrl = (): string => {
    const configured = import.meta.env.VITE_MOBILE_SETUP_URL;
    if (configured && configured.trim().length > 0) {
        return configured.trim();
    }

    return 'https://sofrs-mobile.local/face-setup';
};

const getToneFromStage = (stage: Stage): StatusTone => {
    if (stage === 'recognized') {
        return 'ok';
    }

    if (stage === 'error') {
        return 'error';
    }

    return 'warn';
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

    const resultCard = document.createElement('section');
    resultCard.className = 'result-card';

    const resultTitle = document.createElement('h2');
    resultTitle.className = 'result-title';

    const resultCopy = document.createElement('p');
    resultCopy.className = 'result-copy';

    const resultMeta = document.createElement('p');
    resultMeta.className = 'result-meta';

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
    resultCard.append(resultTitle, resultCopy, resultMeta, resultActions);

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

    overlay.append(header, stageMessage, resultCard, mobilePanel, desktopPanel, bottomPanel, retryButton);
    shell.append(camera.element, overlay);

    let detectionTimer: ReturnType<typeof setInterval> | null = null;
    let animFrame: number | null = null;
    let requestAbort: AbortController | null = null;
    let targetProgress = 0;
    let currentProgress = 0;
    let verifying = false;
    let loopPaused = false;
    let enrollmentSamples: Record<string, string> = {};

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
    };

    const setDetectingMode = (): void => {
        hidePanels();
        loopPaused = false;
        verifying = false;
        setStage('detecting', 'Detecting face', 'Keep your face centered and close to the camera guide.');
        setProgressTarget(12);
        camera.setFaceOverlay(null);
    };

    const showRecognized = (message: string, name: string | null, similarity: number): void => {
        hidePanels();
        resultCard.style.display = 'grid';
        resultTitle.textContent = message;
        resultCopy.textContent = name ? `Welcome back, ${name}.` : 'Verification successful.';
        resultMeta.textContent = `Similarity ${(similarity * 100).toFixed(1)}%`;
        resultActions.style.display = 'grid';
        desktopSetupButton.style.display = 'none';
        mobileSetupButton.style.display = 'none';
        setStage('recognized', 'Access verified', 'Recognition completed. Proceed to employee records.');
        setProgressTarget(100);
        loopPaused = true;
    };

    const showUnrecognized = (message: string): void => {
        hidePanels();
        resultCard.style.display = 'grid';
        resultTitle.textContent = 'Face not recognized';
        resultCopy.textContent = message;
        resultMeta.textContent = 'You can set up FaceID here or continue with the mobile app.';
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
        resultTitle.textContent = 'Verification error';
        resultCopy.textContent = message;
        resultMeta.textContent = 'Check camera alignment or backend connectivity, then retry.';
        resultActions.style.display = 'grid';
        desktopSetupButton.style.display = 'none';
        mobileSetupButton.style.display = 'none';
        setStage('error', 'Unable to continue', message);
        setProgressTarget(100);
        loopPaused = true;
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

    const runVerification = async (detection: FaceDetectionResponse): Promise<void> => {
        if (!detection.primaryFace || verifying || loopPaused) {
            return;
        }

        const snapshot = camera.captureFrameJpeg(1080, 0.9);
        if (!snapshot) {
            return;
        }

        verifying = true;
        setStage('capturing', 'Capturing frame', 'Face captured. Preparing verification request.');
        setProgressTarget(34);

        requestAbort = new AbortController();

        try {
            setStage('uploading', 'Sending to API', 'Uploading captured face to verification service.');
            setProgressTarget(56);

            const imageFile = await dataUrlToJpegFile(snapshot);

            const response = await verifyFace({
                ...imageFile,
            }, "verification", requestAbort.signal);

            setStage('verifying', 'Verifying response', 'Evaluating recognition response and policy checks.');
            setProgressTarget(85);

            const employeeName = response.employee?.name && typeof response.employee.name === 'string'
                ? response.employee.name
                : null;

            if (response.recognized) {
                showRecognized(response.message, employeeName, response.similarity);
            } else {
                showUnrecognized(response.message);
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

        const tensor = camera.captureFrameTensor(640);
        if (!tensor) {
            setProgressTarget(6);
            return;
        }

        try {
            const response = await window.detector.detectFace({
                tensor: Array.from(tensor),
                width: 640,
                height: 640,
                threshold: 0.35,
            });

            camera.setFaceOverlay(response.primaryFace);

            if (!response.modelReady) {
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
        },
    };
};
