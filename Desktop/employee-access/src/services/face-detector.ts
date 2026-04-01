/**
 * Browser-native face detection using Chromium's Shape Detection API.
 *
 * Replaces the ONNX YOLOv26s model that previously ran in the main process.
 * Runs entirely in the renderer — zero IPC, GPU-accelerated.
 *
 * Requires: `--enable-experimental-web-platform-features` Chromium flag
 * (set in main.ts via `app.commandLine.appendSwitch`).
 */

export interface DetectedFace {
	x: number;
	y: number;
	width: number;
	height: number;
	confidence: number;
}

export interface FaceDetectionResult {
	detected: boolean;
	faceCount: number;
	hasSingleForegroundFace: boolean;
	primaryFace: DetectedFace | null;
	faces: DetectedFace[];
	message: string;
	reasonCode: "ok" | "no-face" | "multiple-faces" | "face-out-of-zone" | "not-supported";
}

/** Normalise a raw DOMRect bounding box relative to the source dimensions. */
const normaliseBounds = (
	bounds: DOMRectReadOnly,
	sourceWidth: number,
	sourceHeight: number,
): DetectedFace => ({
	x: bounds.x / sourceWidth,
	y: bounds.y / sourceHeight,
	width: bounds.width / sourceWidth,
	height: bounds.height / sourceHeight,
	confidence: 1, // Shape Detection API doesn't expose confidence
});

const isForeground = (face: DetectedFace): boolean => {
	const area = face.width * face.height;
	const aspectRatio = face.width / Math.max(face.height, 0.0001);
	const cx = face.x + face.width / 2;
	const cy = face.y + face.height / 2;
	const inZone = cx >= 0.18 && cx <= 0.82 && cy >= 0.15 && cy <= 0.85;
	const plausibleShape = aspectRatio >= 0.7 && aspectRatio <= 1.35;
	const plausibleSize = area >= 0.06 && face.width >= 0.18 && face.height >= 0.18;
	return plausibleSize && plausibleShape && inZone;
};

const rankByProminence = (faces: DetectedFace[]): DetectedFace[] =>
	[...faces].sort((a, b) => {
		const aArea = a.width * a.height;
		const bArea = b.width * b.height;
		return bArea - aArea; // Largest face first
	});

let detector: FaceDetector | null = null;
let supported: boolean | null = null;

/**
 * Lazily initialise the native FaceDetector.
 * Returns null if the API is unavailable.
 */
const getDetector = (): FaceDetector | null => {
	if (supported === false) return null;

	if (typeof FaceDetector === "undefined") {
		supported = false;
		console.warn(
			"FaceDetector API unavailable. Ensure --enable-experimental-web-platform-features is set.",
		);
		return null;
	}

	if (!detector) {
		supported = true;
		detector = new FaceDetector({ maxDetectedFaces: 5, fastMode: true });
	}

	return detector;
};

/**
 * Detect faces directly from a video element.
 * No IPC, no tensor serialization — runs on the GPU in the renderer process.
 */
export const detectFaces = async (
	video: HTMLVideoElement,
): Promise<FaceDetectionResult> => {
	const fd = getDetector();

	if (!fd) {
		return {
			detected: false,
			faceCount: 0,
			hasSingleForegroundFace: false,
			primaryFace: null,
			faces: [],
			message: "FaceDetector API is not available.",
			reasonCode: "not-supported",
		};
	}

	if (
		video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA ||
		!video.videoWidth ||
		!video.videoHeight
	) {
		return {
			detected: false,
			faceCount: 0,
			hasSingleForegroundFace: false,
			primaryFace: null,
			faces: [],
			message: "Video not ready.",
			reasonCode: "no-face",
		};
	}

	let raw: DetectedFaceNative[];

	try {
		raw = await fd.detect(video);
	} catch (error) {
		const notSupported =
			error instanceof DOMException && error.name === "NotSupportedError";

		if (notSupported) {
			supported = false;
			detector = null;
			console.warn("FaceDetector service unavailable. Falling back to backend verification.", error);
			return {
				detected: false,
				faceCount: 0,
				hasSingleForegroundFace: false,
				primaryFace: null,
				faces: [],
				message: "Local face detection is unavailable on this device.",
				reasonCode: "not-supported",
			};
		}

		throw error;
	}

	const faces = rankByProminence(
		raw.map((f) => normaliseBounds(f.boundingBox, video.videoWidth, video.videoHeight)),
	);

	if (faces.length === 0) {
		return {
			detected: false,
			faceCount: 0,
			hasSingleForegroundFace: false,
			primaryFace: null,
			faces: [],
			message: "No face detected.",
			reasonCode: "no-face",
		};
	}

	const primary = faces[0];
	if (!primary) {
		return {
			detected: false,
			faceCount: 0,
			hasSingleForegroundFace: false,
			primaryFace: null,
			faces: [],
			message: "No face detected.",
			reasonCode: "no-face",
		};
	}

	const foregroundFaces = faces.filter(isForeground);
	const hasSingleForegroundFace = foregroundFaces.length === 1 && isForeground(primary);

	if (faces.length > 1 && foregroundFaces.length > 1) {
		return {
			detected: true,
			faceCount: faces.length,
			hasSingleForegroundFace: false,
			primaryFace: primary,
			faces,
			message: "Multiple faces detected.",
			reasonCode: "multiple-faces",
		};
	}

	if (!isForeground(primary)) {
		return {
			detected: true,
			faceCount: faces.length,
			hasSingleForegroundFace: false,
			primaryFace: primary,
			faces,
			message: "Move closer and centre your face.",
			reasonCode: "face-out-of-zone",
		};
	}

	return {
		detected: true,
		faceCount: faces.length,
		hasSingleForegroundFace,
		primaryFace: primary,
		faces,
		message: "Face detected.",
		reasonCode: "ok",
	};
};
