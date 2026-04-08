import {
    ApiError,
    EmployeeCreate,
    EmployeeRead,
    VisitorCreate,
    VisitorRead,
    createEmployee,
    createVisitor,
    uploadImages,
} from '../../api';
import { createFacePane } from '../../components/face';
import { createKioskLayoutShell } from '../../components/kiosk-layout';
import { detectFaces, FaceDetectionResult } from '../../services/face-detector';
import { View, navigate } from '../../renderer';

type Tone = 'ok' | 'warn' | 'error';
type RegistrationKind = 'employee' | 'visitor';
type PoseId = 'front' | 'left' | 'right' | 'up' | 'down';

type RegistrationConfig = {
    kind: RegistrationKind;
    title: string;
    description: string;
    buttonLabel: string;
    creatingMessage: string;
    successLabel: string;
    createProfile: (payload: EmployeeCreate | VisitorCreate) => Promise<EmployeeRead | VisitorRead>;
};

const FACE_POSES: Array<{ id: PoseId; label: string; instruction: string }> = [
    { id: 'front', label: 'Front', instruction: 'Look straight ahead' },
    { id: 'left', label: 'Left', instruction: 'Turn your head slightly left' },
    { id: 'right', label: 'Right', instruction: 'Turn your head slightly right' },
    { id: 'up', label: 'Up', instruction: 'Tilt your head up' },
    { id: 'down', label: 'Down', instruction: 'Tilt your head down' },
];

type SideOrientation = 'normal' | 'mirrored' | null;

type PoseEvaluation = {
    ready: boolean;
    quality: number;
    message: string;
};

const REGISTER_CAPTURE_QUALITY_THRESHOLD = 0.40;
const REGISTER_READY_STABLE_FRAMES = 2;
const REGISTER_COUNTDOWN_SECONDS = 3;
const FRONT_POSE_TOLERANCE = 0.12;
const SIDE_SHIFT_THRESHOLD = 0.04;
const VERTICAL_SHIFT_THRESHOLD = 0.035;

const setStatus = (target: HTMLElement, tone: Tone, message: string): void => {
    target.dataset.tone = tone;
    target.textContent = message;
};

const toErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof ApiError) {
        return error.detail ? `${error.message}: ${error.detail}` : error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return fallback;
};

const buildPayload = (form: HTMLFormElement): EmployeeCreate | VisitorCreate => {
    const fullName = (form.querySelector('#register-full-name') as HTMLInputElement).value.trim();
    const email = (form.querySelector('#register-email') as HTMLInputElement).value.trim();
    const phone = (form.querySelector('#register-phone') as HTMLInputElement).value.trim();
    const gender = (form.querySelector('#register-gender') as HTMLSelectElement).value.trim();
    const dob = (form.querySelector('#register-dob') as HTMLInputElement).value.trim();

    const payload: EmployeeCreate | VisitorCreate = { fullName };

    if (email) {
        payload.email = email;
    }
    if (phone) {
        payload.Phone = phone;
    }
    if (gender) {
        payload.gender = gender;
    }
    if (dob) {
        payload.DoB = dob;
    }

    return payload;
};

const createRegisterCard = (
    title: string,
    description: string,
    buttonLabel: string,
    onSelect: () => void,
): HTMLElement => {
    const card = document.createElement('article');
    card.className = 'register-choice-card';

    const heading = document.createElement('h3');
    heading.textContent = title;

    const copy = document.createElement('p');
    copy.textContent = description;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'action-btn primary';
    button.textContent = buttonLabel;
    button.addEventListener('click', onSelect);

    card.append(heading, copy, button);
    return card;
};

const createRegistrationScreen = (config: RegistrationConfig): View => {
    const { container, main } = createKioskLayoutShell('register', {
        showSystemStatus: true,
    });
    main.classList.add('kiosk-main-scroll');

    const shell = document.createElement('section');
    shell.className = 'register-shell';

    const formCard = document.createElement('article');
    formCard.className = 'register-card';
    formCard.innerHTML = `
        <h2>${config.title}</h2>
        <p>${config.description}</p>
    `;

    const form = document.createElement('form');
    form.className = 'register-form';

    const fullNameLabel = document.createElement('label');
    fullNameLabel.className = 'settings-field';
    fullNameLabel.textContent = 'Full Name';
    const fullNameInput = document.createElement('input');
    fullNameInput.id = 'register-full-name';
    fullNameInput.type = 'text';
    fullNameInput.required = true;
    fullNameInput.placeholder = config.kind === 'employee' ? 'Employee full name' : 'Visitor full name';
    fullNameLabel.append(fullNameInput);

    const emailLabel = document.createElement('label');
    emailLabel.className = 'settings-field';
    emailLabel.textContent = 'Email (optional)';
    const emailInput = document.createElement('input');
    emailInput.id = 'register-email';
    emailInput.type = 'email';
    emailInput.placeholder = 'user@example.com';
    emailLabel.append(emailInput);

    const phoneLabel = document.createElement('label');
    phoneLabel.className = 'settings-field';
    phoneLabel.textContent = 'Phone (optional)';
    const phoneInput = document.createElement('input');
    phoneInput.id = 'register-phone';
    phoneInput.type = 'tel';
    phoneInput.placeholder = '+1 555 000 0000';
    phoneLabel.append(phoneInput);

    const genderLabel = document.createElement('label');
    genderLabel.className = 'settings-field';
    genderLabel.textContent = 'Gender (optional)';
    const genderSelect = document.createElement('select');
    genderSelect.id = 'register-gender';
    genderSelect.className = 'register-select';
    [
        { value: '', label: 'Prefer not to say' },
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'other', label: 'Other' },
    ].forEach((optionConfig) => {
        const option = document.createElement('option');
        option.value = optionConfig.value;
        option.textContent = optionConfig.label;
        genderSelect.append(option);
    });
    genderLabel.append(genderSelect);

    const dobLabel = document.createElement('label');
    dobLabel.className = 'settings-field';
    dobLabel.textContent = 'Date of Birth (optional)';
    const dobInput = document.createElement('input');
    dobInput.id = 'register-dob';
    dobInput.type = 'date';
    dobLabel.append(dobInput);

    const note = document.createElement('p');
    note.className = 'register-note';
    note.textContent = 'Date format is sent as YYYY-MM-DD. Optional fields are omitted when left empty.';

    const status = document.createElement('p');
    status.className = 'register-status';

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.className = 'action-btn primary';
    submitButton.textContent = config.buttonLabel;

    form.append(fullNameLabel, emailLabel, phoneLabel, genderLabel, dobLabel, note, status, submitButton);
    formCard.append(form);

    const cameraCard = document.createElement('article');
    cameraCard.className = 'register-card register-camera-card';

    const cameraTitle = document.createElement('h3');
    cameraTitle.textContent = 'Face Capture (5 Poses)';

    const cameraCopy = document.createElement('p');
    cameraCopy.className = 'register-camera-copy';

    const completeBadge = document.createElement('div');
    completeBadge.className = 'register-capture-complete';
    completeBadge.textContent = '✓ Capture complete';
    completeBadge.style.display = 'none';

    const camera = createFacePane();
    camera.element.classList.add('register-face-pane');

    const cameraFrame = document.createElement('div');
    cameraFrame.className = 'register-bio-frame';
    cameraFrame.append(camera.element);

    const countdownBadge = document.createElement('div');
    countdownBadge.className = 'register-countdown';
    countdownBadge.style.display = 'none';
    cameraFrame.append(countdownBadge);

    const preview = document.createElement('img');
    preview.className = 'register-capture-preview';
    preview.alt = 'Most recently captured face preview';

    const poseGrid = document.createElement('div');
    poseGrid.className = 'register-pose-grid';

    const poseItems = FACE_POSES.map((pose) => {
        const chip = document.createElement('div');
        chip.className = 'register-pose-chip';
        chip.dataset.pose = pose.id;
        chip.innerHTML = `<span>${pose.label}</span>`;
        poseGrid.append(chip);
        return chip;
    });

    const cameraActions = document.createElement('div');
    cameraActions.className = 'register-actions';

    const captureButton = document.createElement('button');
    captureButton.type = 'button';
    captureButton.className = 'action-btn secondary';
    captureButton.textContent = 'Capture Current Pose';

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'action-btn secondary';
    clearButton.textContent = 'Reset Captures';

    cameraActions.append(captureButton, clearButton);
    cameraCard.append(cameraTitle, cameraCopy, cameraFrame, preview, poseGrid, cameraActions, completeBadge);

    shell.append(formCard, cameraCard);
    main.append(shell);

    let previewUrl: string | null = null;
    let captureIndex = 0;
    let capturing = false;
    let submitting = false;
    let capturedFaces: Array<Blob | null> = FACE_POSES.map(() => null);
    let detecting = false;
    let detectionTimer: ReturnType<typeof setInterval> | null = null;
    let countdownTimer: ReturnType<typeof setInterval> | null = null;
    let detectorFallback = false;
    let fallbackMessageShown = false;
    let lastPoseEvaluation: PoseEvaluation | null = null;
    let countdownActive = false;
    let countdownRemaining = REGISTER_COUNTDOWN_SECONDS;
    let readyStableFrames = 0;
    let frontBaselineX: number | null = null;
    let frontBaselineY: number | null = null;
    let sideOrientation: SideOrientation = null;
    let captureComplete = false;

    const clearPreview = (): void => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = null;
        }
        preview.removeAttribute('src');
        preview.style.display = 'none';
    };

    const capturedCount = (): number => capturedFaces.filter((file) => file !== null).length;

    const refreshCaptureUI = (): void => {
        const allCaptured = capturedFaces.every((file) => file !== null);

        poseItems.forEach((item, index) => {
            item.dataset.state = capturedFaces[index]
                ? 'done'
                : index === captureIndex
                    ? 'active'
                    : 'pending';
        });

        if (allCaptured) {
            cameraCopy.textContent = 'All 5 poses captured. Submit registration to upload images.';
        } else {
            const currentPose = FACE_POSES[captureIndex];
            cameraCopy.textContent = `Capture pose ${captureIndex + 1}/${FACE_POSES.length}: ${currentPose.instruction}.`;
        }

        completeBadge.style.display = captureComplete ? 'flex' : 'none';
        cameraFrame.classList.toggle('capture-complete', captureComplete);

        cameraCard.dataset.busy = submitting ? 'true' : 'false';
        captureButton.disabled = submitting || capturing || allCaptured || countdownActive;
        clearButton.disabled = submitting;
        submitButton.disabled = submitting;
    };

    const getFaceCenter = (result: FaceDetectionResult): { x: number; y: number } | null => {
        if (!result.primaryFace) {
            return null;
        }

        return {
            x: result.primaryFace.x + result.primaryFace.width / 2,
            y: result.primaryFace.y + result.primaryFace.height / 2,
        };
    };

    const setReadyVisual = (ready: boolean): void => {
        cameraFrame.classList.toggle('green-ready', ready);
    };

    const hideCountdownBadge = (): void => {
        countdownBadge.style.display = 'none';
        countdownBadge.textContent = '';
        cameraFrame.classList.remove('countdown-active');
    };

    const stopCountdown = (): void => {
        if (countdownTimer) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }

        countdownActive = false;
        countdownRemaining = REGISTER_COUNTDOWN_SECONDS;
        hideCountdownBadge();
    };

    const resetDetectionState = (): void => {
        stopCountdown();
        readyStableFrames = 0;
        lastPoseEvaluation = null;
        setReadyVisual(false);
        frontBaselineX = null;
        frontBaselineY = null;
        sideOrientation = null;
    };

    const resetCaptures = (): void => {
        captureIndex = 0;
        capturedFaces = FACE_POSES.map(() => null);
        captureComplete = false;
        clearPreview();
        resetDetectionState();
        refreshCaptureUI();
    };

    const markCaptureComplete = (): void => {
        captureComplete = true;
        stopDetection();
        camera.stop();
        camera.setStatus('Capture complete', 'ok');
        setStatus(status, 'ok', '✓ Capture complete. All 5 poses are saved. Submit registration to continue.');
        refreshCaptureUI();
    };

    const evaluatePose = (result: FaceDetectionResult, poseId: PoseId): PoseEvaluation => {
        if (!result.detected || !result.primaryFace) {
            return {
                ready: false,
                quality: 0,
                message: 'Align face with camera',
            };
        }

        if (result.reasonCode === 'multiple-faces') {
            return {
                ready: false,
                quality: result.qualityScore,
                message: 'Multiple faces detected. Only one person can register.',
            };
        }

        const center = getFaceCenter(result);
        if (!center) {
            return {
                ready: false,
                quality: result.qualityScore,
                message: 'Align face with camera',
            };
        }

        const qualityOk = result.qualityScore >= REGISTER_CAPTURE_QUALITY_THRESHOLD;
        if (!qualityOk) {
            return {
                ready: false,
                quality: result.qualityScore,
                message: `Face quality low (${Math.round(result.qualityScore * 100)}%). Move a little closer and center your face.`,
            };
        }

        let poseOk = false;
        let message = '';

        if (poseId === 'front') {
            const frontX = Math.abs(center.x - 0.5) <= FRONT_POSE_TOLERANCE;
            const frontY = Math.abs(center.y - 0.5) <= FRONT_POSE_TOLERANCE;
            poseOk = frontX && frontY;
            message = poseOk ? 'Front pose ready' : 'Center your face and look straight ahead.';

            if (poseOk) {
                frontBaselineX = center.x;
                frontBaselineY = center.y;
            }
        } else if (poseId === 'left' || poseId === 'right') {
            const baseX = frontBaselineX ?? 0.5;
            const dx = center.x - baseX;
            const observedDirection =
                dx <= -SIDE_SHIFT_THRESHOLD ? 'left' : dx >= SIDE_SHIFT_THRESHOLD ? 'right' : 'center';

            if (observedDirection === 'center') {
                message = `Turn more to the ${poseId}.`;
                poseOk = false;
            } else {
                if (sideOrientation === null) {
                    if (poseId === 'left') {
                        sideOrientation = observedDirection === 'left' ? 'normal' : 'mirrored';
                    } else {
                        sideOrientation = observedDirection === 'right' ? 'normal' : 'mirrored';
                    }
                }

                const expectedDirection =
                    poseId === 'left'
                        ? sideOrientation === 'normal'
                            ? 'left'
                            : 'right'
                        : sideOrientation === 'normal'
                            ? 'right'
                            : 'left';

                poseOk = observedDirection === expectedDirection;
                message = poseOk ? `${poseId === 'left' ? 'Left' : 'Right'} pose ready` : `Turn to the ${poseId}.`;
            }
        } else {
            const baseY = frontBaselineY ?? 0.5;
            const dy = center.y - baseY;

            if (poseId === 'up') {
                poseOk = dy <= -VERTICAL_SHIFT_THRESHOLD;
                message = poseOk ? 'Up pose ready' : 'Tilt your head up.';
            } else {
                poseOk = dy >= VERTICAL_SHIFT_THRESHOLD;
                message = poseOk ? 'Down pose ready' : 'Tilt your head down.';
            }
        }

        return {
            ready: qualityOk && poseOk,
            quality: result.qualityScore,
            message,
        };
    };

    const performCapture = async (): Promise<void> => {
        if (submitting || capturing || countdownActive || captureComplete) {
            return;
        }

        if (capturedFaces.every((file) => file !== null)) {
            if (!captureComplete) {
                markCaptureComplete();
            }
            return;
        }

        const currentPose = FACE_POSES[captureIndex];
        if (!currentPose) {
            return;
        }

        if (!detectorFallback && !lastPoseEvaluation?.ready) {
            setStatus(status, 'error', `Waiting for ${currentPose.label.toLowerCase()} pose at 50%+ quality.`);
            return;
        }

        stopCountdown();
        setReadyVisual(false);
        readyStableFrames = 0;

        capturing = true;
        refreshCaptureUI();
        setStatus(status, 'warn', `Capturing ${currentPose.label} pose...`);

        try {
            const blob = await camera.captureFrameBlob(640, 0.9);
            if (!blob) {
                setStatus(status, 'error', 'No camera frame available. Please align with the camera and try again.');
                return;
            }

            capturedFaces[captureIndex] = blob;
            clearPreview();
            previewUrl = URL.createObjectURL(blob);
            preview.src = previewUrl;
            preview.style.display = 'block';

            const newCount = capturedCount();
            setStatus(status, 'ok', `${currentPose.label} pose captured (${newCount}/${FACE_POSES.length}).`);

            if (captureIndex < FACE_POSES.length - 1) {
                captureIndex += 1;
            } else if (newCount >= FACE_POSES.length) {
                markCaptureComplete();
            }
        } finally {
            capturing = false;
            refreshCaptureUI();
        }
    };

    const startCountdown = (): void => {
        if (countdownActive || capturing || submitting || captureComplete) {
            return;
        }

        countdownActive = true;
        countdownRemaining = REGISTER_COUNTDOWN_SECONDS;
        countdownBadge.style.display = 'flex';
        countdownBadge.textContent = String(countdownRemaining);
        cameraFrame.classList.add('countdown-active');

        countdownTimer = setInterval(() => {
            if (!lastPoseEvaluation?.ready) {
                stopCountdown();
                setReadyVisual(false);
                readyStableFrames = 0;
                return;
            }

            countdownRemaining -= 1;
            if (countdownRemaining > 0) {
                countdownBadge.textContent = String(countdownRemaining);
                return;
            }

            stopCountdown();
            void performCapture();
        }, 1000);
    };

    const stopDetection = (): void => {
        if (detectionTimer) {
            clearInterval(detectionTimer);
            detectionTimer = null;
        }
        stopCountdown();
        setReadyVisual(false);
        camera.setFaceOverlay(null);
    };

    const runDetection = async (): Promise<void> => {
        if (detecting || submitting || capturing || captureComplete) {
            return;
        }

        detecting = true;
        try {
            const video = camera.getVideoElement();
            if (
                video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA ||
                !video.videoWidth ||
                !video.videoHeight
            ) {
                camera.setFaceOverlay(null);
                return;
            }

            const result = await detectFaces(video);

            if (result.reasonCode === 'not-supported') {
                detectorFallback = true;
                camera.setFaceOverlay(null);
                camera.setStatus('Manual capture mode', 'warn');
                stopCountdown();
                setReadyVisual(false);
                readyStableFrames = 0;
                lastPoseEvaluation = null;

                if (!fallbackMessageShown) {
                    fallbackMessageShown = true;
                    setStatus(status, 'warn', 'Face detector unavailable. Manual capture mode enabled.');
                }
                return;
            }

            camera.setFaceOverlay(result.primaryFace);
            detectorFallback = false;

            const currentPose = FACE_POSES[captureIndex];
            if (!currentPose) {
                return;
            }

            const evaluation = evaluatePose(result, currentPose.id);
            lastPoseEvaluation = evaluation;

            if (evaluation.ready) {
                readyStableFrames += 1;
                setReadyVisual(true);
                camera.setStatus(
                    `${evaluation.message} (${Math.round(evaluation.quality * 100)}%) ${readyStableFrames}/${REGISTER_READY_STABLE_FRAMES}`,
                    'ok',
                );

                if (!countdownActive && readyStableFrames >= REGISTER_READY_STABLE_FRAMES) {
                    startCountdown();
                }
            } else {
                readyStableFrames = 0;
                stopCountdown();
                setReadyVisual(false);
                camera.setStatus(evaluation.message, 'warn');
            }
        } catch {
            detectorFallback = true;
            camera.setFaceOverlay(null);
            camera.setStatus('Manual capture mode', 'warn');
            stopCountdown();
            setReadyVisual(false);
            readyStableFrames = 0;
            lastPoseEvaluation = null;

            if (!fallbackMessageShown) {
                fallbackMessageShown = true;
                setStatus(status, 'warn', 'Face detector failed to initialize. Manual capture mode enabled.');
            }
        } finally {
            detecting = false;
        }
    };

    captureButton.addEventListener('click', async () => {
        await performCapture();
    });

    clearButton.addEventListener('click', () => {
        if (submitting) {
            return;
        }
        resetCaptures();
        setStatus(status, 'warn', 'Capture sequence reset. Start again from the front pose.');
        if (!camera.getCameraAvailable()) {
            void camera.start().then(() => {
                if (!detectionTimer) {
                    detectionTimer = setInterval(() => {
                        void runDetection();
                    }, 260);
                }
                void runDetection();
            });
        } else if (!detectionTimer) {
            detectionTimer = setInterval(() => {
                void runDetection();
            }, 260);
            void runDetection();
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (submitting) {
            return;
        }

        const fullName = fullNameInput.value.trim();
        if (!fullName) {
            setStatus(status, 'error', 'Full name is required.');
            return;
        }

        const missingPose = FACE_POSES.find((_pose, index) => capturedFaces[index] === null);
        if (missingPose) {
            setStatus(status, 'error', `Capture all 5 poses before submitting. Missing: ${missingPose.label}.`);
            return;
        }

        const payload = buildPayload(form);
        submitting = true;
        refreshCaptureUI();

        try {
            setStatus(status, 'warn', config.creatingMessage);
            const profile = await config.createProfile(payload);

            setStatus(status, 'warn', `Uploading ${FACE_POSES.length} face images for ${profile.id}...`);
            const files = capturedFaces.filter((file): file is Blob => file !== null);
            await uploadImages(profile.id, files);

            setStatus(status, 'ok', `${config.successLabel} ${profile.fullName} registered as ${profile.id}.`);

            form.reset();
            resetCaptures();
            await camera.start();
            if (!detectionTimer) {
                detectionTimer = setInterval(() => {
                    void runDetection();
                }, 260);
            }
            void runDetection();
        } catch (error) {
            setStatus(status, 'error', toErrorMessage(error, `Failed to register ${config.kind}.`));
        } finally {
            submitting = false;
            refreshCaptureUI();
        }
    });

    setStatus(status, 'warn', 'Capture all 5 poses, then submit registration.');
    refreshCaptureUI();

    return {
        element: container,
        onShow: async () => {
            await camera.start();
            detectionTimer = setInterval(() => {
                void runDetection();
            }, 260);
            void runDetection();
        },
        onHide: () => {
            stopDetection();
            camera.stop();
            clearPreview();
        },
    };
};

export const createKioskRegisterLandingScreen = (): View => {
    const { container, main } = createKioskLayoutShell('register', {
        showSystemStatus: true,
    });
    main.classList.add('kiosk-main-scroll');

    const section = document.createElement('section');
    section.className = 'register-landing';

    const heading = document.createElement('header');
    heading.className = 'register-landing-heading';
    heading.innerHTML = `
        <h2>Registration Center</h2>
        <p>Both flows now require the same 5-pose face capture sequence.</p>
    `;

    const cards = document.createElement('div');
    cards.className = 'register-choice-grid';

    const visitorCard = createRegisterCard(
        'Visitor Register',
        'Create a visitor profile and upload 5 required face poses.',
        'Open Visitor Register',
        () => {
            void navigate(createVisitorRegisterScreen);
        },
    );

    const employeeCard = createRegisterCard(
        'Employee Register',
        'Create an employee profile and upload 5 required face poses.',
        'Open Employee Register',
        () => {
            void navigate(createEmployeeFaceRegisterScreen);
        },
    );

    cards.append(visitorCard, employeeCard);
    section.append(heading, cards);
    main.append(section);

    return { element: container };
};

export const createVisitorRegisterScreen = (): View =>
    createRegistrationScreen({
        kind: 'visitor',
        title: 'Visitor Register',
        description: 'Create a visitor profile before issuing a temporary pass.',
        buttonLabel: 'Register Visitor',
        creatingMessage: 'Creating visitor profile...',
        successLabel: 'Visitor',
        createProfile: (payload) => createVisitor(payload as VisitorCreate),
    });

export const createEmployeeFaceRegisterScreen = (): View =>
    createRegistrationScreen({
        kind: 'employee',
        title: 'Employee Register',
        description: 'Create an employee profile before enabling biometric access.',
        buttonLabel: 'Register Employee',
        creatingMessage: 'Creating employee profile...',
        successLabel: 'Employee',
        createProfile: (payload) => createEmployee(payload as EmployeeCreate),
    });
