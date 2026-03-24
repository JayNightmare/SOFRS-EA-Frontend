type StatusTone = 'ok' | 'warn' | 'error';

export type CameraPane = {
    element: HTMLElement;
    start: () => Promise<void>;
    stop: () => void;
    setStatus: (label: string, tone?: StatusTone) => void;
    captureFrameTensor: (targetSize?: number) => Float32Array | null;
    captureFrameBlob: () => Promise<Blob | null>;
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
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

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

    const captureFrameTensor = (targetSize = 640): Float32Array | null => {
        if (!context) {
            return null;
        }

        if (!video.videoWidth || !video.videoHeight) {
            return null;
        }

        canvas.width = targetSize;
        canvas.height = targetSize;
        context.drawImage(video, 0, 0, targetSize, targetSize);

        const imageData = context.getImageData(0, 0, targetSize, targetSize);
        const pixelData = imageData.data;
        const planeSize = targetSize * targetSize;
        const tensor = new Float32Array(planeSize * 3);

        for (let index = 0; index < planeSize; index += 1) {
            const pixelOffset = index * 4;
            tensor[index] = (pixelData[pixelOffset] ?? 0) / 255;
            tensor[planeSize + index] = (pixelData[pixelOffset + 1] ?? 0) / 255;
            tensor[(planeSize * 2) + index] = (pixelData[pixelOffset + 2] ?? 0) / 255;
        }

        return tensor;
    };

    const captureFrameBlob = (): Promise<Blob | null> =>
        new Promise((resolve) => {
            if (!context || !video.videoWidth || !video.videoHeight) {
                resolve(null);
                return;
            }
            const size = 640;
            canvas.width = size;
            canvas.height = size;
            context.drawImage(video, 0, 0, size, size);
            canvas.toBlob((blob) => resolve(blob ?? null), 'image/jpeg', 0.9);
        });

    return {
        element: frame,
        start,
        stop,
        setStatus,
        captureFrameTensor,
        captureFrameBlob,
    };
};