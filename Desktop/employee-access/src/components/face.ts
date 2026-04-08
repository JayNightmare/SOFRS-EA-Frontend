import captureSoundSrc from '../music/approved.mp3';

type StatusTone = 'ok' | 'warn' | 'error';

type OverlayFaceBox = {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
};

type RenderedFaceBox = {
    left: number;
    top: number;
    width: number;
    height: number;
};

let shutterAudio: HTMLAudioElement | null = null;
let lastShutterTimestamp = 0;

const ensureShutterAudio = (): HTMLAudioElement => {
    if (shutterAudio) {
        return shutterAudio;
    }

    shutterAudio = new Audio(captureSoundSrc);
    shutterAudio.preload = 'auto';
    shutterAudio.volume = 0.95;
    return shutterAudio;
};

const playShutterSound = (): void => {
    const nowMs = Date.now();
    if (nowMs - lastShutterTimestamp < 120) {
        return;
    }
    lastShutterTimestamp = nowMs;

    const baseSound = ensureShutterAudio();
    const clip = baseSound.cloneNode(true) as HTMLAudioElement;
    clip.volume = baseSound.volume;
    clip.currentTime = 0;
    void clip.play().catch(() => undefined);
};

export type CameraPane = {
    element: HTMLElement;
    start: () => Promise<void>;
    stop: () => void;
    setStatus: (label: string, tone?: StatusTone) => void;
    captureFrameJpeg: (targetSize?: number, quality?: number) => string | null;
    captureFrameBlob: (targetSize?: number, quality?: number) => Promise<Blob | null>;
    setFaceOverlay: (face: OverlayFaceBox | null) => void;
    getCameraAvailable: () => boolean;
    getVideoElement: () => HTMLVideoElement;
};

const createStatusChip = (): HTMLSpanElement => {
    const chip = document.createElement('span');
    chip.className = 'status-chip';
    chip.textContent = 'Camera idle';
    chip.dataset.tone = 'warn';
    return chip;
};

const mapFaceToRenderedViewport = (
    face: OverlayFaceBox,
    video: HTMLVideoElement,
): RenderedFaceBox | null => {
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    const viewportWidth = video.clientWidth;
    const viewportHeight = video.clientHeight;

    if (!sourceWidth || !sourceHeight || !viewportWidth || !viewportHeight) {
        return null;
    }

    const scale = Math.max(viewportWidth / sourceWidth, viewportHeight / sourceHeight);
    const renderedWidth = sourceWidth * scale;
    const renderedHeight = sourceHeight * scale;
    const cropOffsetX = (viewportWidth - renderedWidth) / 2;
    const cropOffsetY = (viewportHeight - renderedHeight) / 2;

    return {
        left: face.x * sourceWidth * scale + cropOffsetX,
        top: face.y * sourceHeight * scale + cropOffsetY,
        width: face.width * sourceWidth * scale,
        height: face.height * sourceHeight * scale,
    };
};

export const createFacePane = (): CameraPane => {
    const frame = document.createElement('section');
    frame.className = 'camera-frame';

    const statusChip = createStatusChip();

    const video = document.createElement('video');
    video.className = 'camera-video';
    video.playsInline = true;
    video.muted = true;
    video.autoplay = true;

    const placeholder = document.createElement('div');
    placeholder.className = 'camera-placeholder';
    placeholder.textContent = 'Live camera preview';

    const faceGuide = document.createElement('div');
    faceGuide.className = 'face-guide';

    const faceOverlay = document.createElement('div');
    faceOverlay.className = 'face-overlay';

    const confidenceLabel = document.createElement('span');
    confidenceLabel.className = 'face-overlay-label';

    faceOverlay.append(confidenceLabel);

    frame.append(statusChip, video, placeholder, faceGuide, faceOverlay);

    let stream: MediaStream | null = null;
    let cameraAvailable = false;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    const setStatus = (label: string, tone: StatusTone = 'warn'): void => {
        statusChip.textContent = label;
        statusChip.dataset.tone = tone;
    };

    const waitForVideoReady = async (): Promise<void> => {
        if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
            return;
        }

        await new Promise<void>((resolve) => {
            let settled = false;

            const finish = (): void => {
                if (settled) {
                    return;
                }

                settled = true;
                video.removeEventListener('loadeddata', finish);
                video.removeEventListener('canplay', finish);
                resolve();
            };

            video.addEventListener('loadeddata', finish, { once: true });
            video.addEventListener('canplay', finish, { once: true });
            window.setTimeout(finish, 3000);
        });
    };

    const start = async (): Promise<void> => {
        if (!navigator.mediaDevices?.getUserMedia) {
            cameraAvailable = false;
            setStatus('Camera unsupported', 'error');
            placeholder.textContent = 'Camera API is unavailable on this device.';
            return;
        }

        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            });
            video.srcObject = stream;
            await video.play().catch(() => undefined);
            await waitForVideoReady();
            placeholder.style.display = 'none';
            cameraAvailable = true;
            setStatus('Camera online', 'ok');
        } catch (error) {
            cameraAvailable = false;
            const message = error instanceof Error ? error.message : 'Unknown camera error';
            setStatus('Camera blocked', 'error');
            placeholder.style.display = 'flex';
            placeholder.textContent = `Unable to open camera: ${message}`;
        }
    };

    const stop = (): void => {
        if (!stream) {
            return;
        }

        stream.getTracks().forEach((track) => {
            track.stop();
        });
        stream = null;
        video.srcObject = null;
        placeholder.style.display = 'flex';
        cameraAvailable = false;
        setStatus('Camera stopped', 'warn');
        setFaceOverlay(null);
    };

    const drawSquareFrame = (targetSize: number): boolean => {
        if (!context || !video.videoWidth || !video.videoHeight) {
            return false;
        }

        const sourceSize = Math.min(video.videoWidth, video.videoHeight);
        const sourceX = Math.floor((video.videoWidth - sourceSize) / 2);
        const sourceY = Math.floor((video.videoHeight - sourceSize) / 2);

        canvas.width = targetSize;
        canvas.height = targetSize;
        context.drawImage(
            video,
            sourceX,
            sourceY,
            sourceSize,
            sourceSize,
            0,
            0,
            targetSize,
            targetSize,
        );
        return true;
    };

    const captureFrameJpeg = (targetSize = 640, quality = 0.88): string | null => {
        if (!context) {
            return null;
        }

        if (!drawSquareFrame(targetSize)) {
            return null;
        }

        const snapshot = canvas.toDataURL('image/jpeg', quality);
        playShutterSound();
        return snapshot;
    };

    const captureFrameBlob = async (targetSize = 640, quality = 0.88): Promise<Blob | null> => {
        if (!context) {
            return null;
        }
        if (!drawSquareFrame(targetSize)) {
            return null;
        }
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    playShutterSound();
                }
                resolve(blob);
            }, 'image/jpeg', quality);
        });
    };

    const setFaceOverlay = (face: OverlayFaceBox | null): void => {
        if (!face) {
            faceOverlay.style.display = 'none';
            return;
        }

        const rendered = mapFaceToRenderedViewport(face, video);
        faceOverlay.style.display = 'block';

        if (!rendered) {
            faceOverlay.style.left = `${face.x * 100}%`;
            faceOverlay.style.top = `${face.y * 100}%`;
            faceOverlay.style.width = `${face.width * 100}%`;
            faceOverlay.style.height = `${face.height * 100}%`;
        } else {
            faceOverlay.style.left = `${rendered.left}px`;
            faceOverlay.style.top = `${rendered.top}px`;
            faceOverlay.style.width = `${rendered.width}px`;
            faceOverlay.style.height = `${rendered.height}px`;
        }

        confidenceLabel.textContent = `${(face.confidence * 100).toFixed(1)}%`;
    };

    const getCameraAvailable = (): boolean => cameraAvailable;

    const getVideoElement = (): HTMLVideoElement => video;

    return {
        element: frame,
        start,
        stop,
        setStatus,
        captureFrameJpeg,
        captureFrameBlob,
        setFaceOverlay,
        getCameraAvailable,
        getVideoElement,
    };
};

