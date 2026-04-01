/// <reference types="vite/client" />

declare module '*.css' {
	const cssContent: string;
	export default cssContent;
}

interface ImportMetaEnv {
	readonly VITE_API_BASE_URL?: string;
	readonly VITE_API_KEY?: string;
	readonly VITE_VERIFY_ENDPOINT?: string;
	readonly VITE_MOBILE_SETUP_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

/**
 * Chromium Shape Detection API — FaceDetector.
 * Available when `--enable-experimental-web-platform-features` is set.
 */
interface DetectedFaceNative {
	boundingBox: DOMRectReadOnly;
	landmarks?: ReadonlyArray<{ type: string; locations: ReadonlyArray<{ x: number; y: number }> }>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare class FaceDetector {
	constructor(options?: { maxDetectedFaces?: number; fastMode?: boolean });
	detect(image: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement | ImageBitmap): Promise<DetectedFaceNative[]>;
}

interface Window {
	relay: {
		getPort: () => Promise<number>;
		getLocalIp: () => Promise<string>;
		onPhoto: (callback: (dataUrl: string) => void) => void;
		removePhotoListener: () => void;
	};
}
