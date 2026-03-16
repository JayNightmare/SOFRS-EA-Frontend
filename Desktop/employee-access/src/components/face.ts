type StatusTone = 'ok' | 'warn' | 'error';

export type CameraPane = {
    element: HTMLElement;
    start: () => Promise<void>;
    stop: () => void;
    setStatus: (label: string, tone?: StatusTone) => void;
};

const createStatusChip = (): HTMLSpanElement => {
    const chip = document.createElement('span');
    chip.className = 'status-chip';
    chip.textContent = 'Camera idle';
    chip.dataset.tone = 'warn';
    return chip;
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

    frame.append(statusChip, video, placeholder);

    let stream: MediaStream | null = null;

    const setStatus = (label: string, tone: StatusTone = 'warn'): void => {
        statusChip.textContent = label;
        statusChip.dataset.tone = tone;
    };

    const start = async (): Promise<void> => {
        if (!navigator.mediaDevices?.getUserMedia) {
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
            placeholder.style.display = 'none';
            setStatus('Camera online', 'ok');
        } catch (error) {
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
        setStatus('Camera stopped', 'warn');
    };

    return {
        element: frame,
        start,
        stop,
        setStatus,
    };
};