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
	qualityScore: number;
	primaryFace: DetectedFace | null;
	faces: DetectedFace[];
	message: string;
	reasonCode: "ok" | "no-face" | "multiple-faces" | "face-out-of-zone" | "not-supported";
}

const MIN_FACE_AREA = 0.04;
const MAX_FACE_AREA = 0.35;
const MIN_CENTER_X = 0.18;
const MAX_CENTER_X = 0.82;
const MIN_CENTER_Y = 0.15;
const MAX_CENTER_Y = 0.85;
const TARGET_FACE_AREA = 0.16;
const FACE_AREA_TOLERANCE = 0.12;
const TARGET_ASPECT_RATIO = 1;
const ASPECT_TOLERANCE = 0.45;

type FaceStabilitySnapshot = {
	cx: number;
	cy: number;
	area: number;
	ts: number;
};

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

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const toRoundedScore = (value: number): number =>
	Number(clamp01(value).toFixed(3));

let previousFaceSnapshot: FaceStabilitySnapshot | null = null;

const resetFaceStability = (): void => {
	previousFaceSnapshot = null;
};

const updateFaceStability = (face: DetectedFace, timestamp: number): void => {
	const area = face.width * face.height;
	previousFaceSnapshot = {
		cx: face.x + face.width / 2,
		cy: face.y + face.height / 2,
		area,
		ts: timestamp,
	};
};

const getStabilityScore = (face: DetectedFace, timestamp: number): number => {
	if (!previousFaceSnapshot) {
		return 0.88;
	}

	const age = timestamp - previousFaceSnapshot.ts;
	if (age > 1800) {
		return 0.88;
	}

	const cx = face.x + face.width / 2;
	const cy = face.y + face.height / 2;
	const area = face.width * face.height;
	const centerDelta = Math.hypot(cx - previousFaceSnapshot.cx, cy - previousFaceSnapshot.cy);
	const areaDelta = Math.abs(area - previousFaceSnapshot.area) /
		Math.max(area, previousFaceSnapshot.area, 0.0001);

	const centerStability = clamp01(1 - centerDelta / 0.12);
	const areaStability = clamp01(1 - areaDelta / 0.45);
	return 0.7 * centerStability + 0.3 * areaStability;
};

const getFaceQualityScore = (face: DetectedFace, timestamp: number): number => {
	const area = face.width * face.height;
	const cx = face.x + face.width / 2;
	const cy = face.y + face.height / 2;
	const aspectRatio = face.width / Math.max(face.height, 0.0001);
	const centerDistance = Math.hypot(cx - 0.5, cy - 0.5);

	const centerScore = clamp01(1 - centerDistance / 0.32);
	const sizeScore = clamp01(1 - Math.abs(area - TARGET_FACE_AREA) / FACE_AREA_TOLERANCE);
	const aspectScore = clamp01(1 - Math.abs(aspectRatio - TARGET_ASPECT_RATIO) / ASPECT_TOLERANCE);
	const stabilityScore = getStabilityScore(face, timestamp);

	const blended =
		0.45 * centerScore +
		0.25 * sizeScore +
		0.15 * aspectScore +
		0.15 * stabilityScore;

	const zonePenalty = isForeground(face) ? 1 : 0.72;
	return toRoundedScore(blended * zonePenalty);
};

const withScore = (face: DetectedFace, score: number): DetectedFace => ({
	...face,
	confidence: score,
});

const isForeground = (face: DetectedFace): boolean => {
	const area = face.width * face.height;
	const aspectRatio = face.width / Math.max(face.height, 0.0001);
	const cx = face.x + face.width / 2;
	const cy = face.y + face.height / 2;
	// const inZone = cx >= 0.18 && cx <= 0.82 && cy >= 0.15 && cy <= 0.85;
	const inZone =
		cx >= MIN_CENTER_X &&
		cx <= MAX_CENTER_X &&
		cy >= MIN_CENTER_Y &&
		cy <= MAX_CENTER_Y;
	const inSizeRange = area >= MIN_FACE_AREA && area <= MAX_FACE_AREA;
	const plausibleShape = aspectRatio >= 0.7 && aspectRatio <= 1.35;
	const plausibleSize = area >= 0.06 && face.width >= 0.18 && face.height >= 0.18;
	return plausibleSize && plausibleShape && inSizeRange && inZone;
};

const getOutOfZoneMessage = (face: DetectedFace): string => {
	const area = face.width * face.height;
	const cx = face.x + face.width / 2;
	const cy = face.y + face.height / 2;

	if (area < MIN_FACE_AREA) {
		return "Move closer to the camera.";
	}

	if (area > MAX_FACE_AREA) {
		return "Step back a little. Your face is too close.";
	}

	if (cx < MIN_CENTER_X || cx > MAX_CENTER_X || cy < MIN_CENTER_Y || cy > MAX_CENTER_Y) {
		return "Center your face inside the guide.";
	}

	return "Move closer and centre your face.";
};

const rankByProminence = (faces: DetectedFace[]): DetectedFace[] =>
	[...faces].sort((a, b) => {
		const aArea = a.width * a.height;
		const bArea = b.width * b.height;
		return bArea - aArea; // Largest face first
	});

let detector: FaceDetector | null = null;
let supported: boolean | null = null;
let notSupportedMessage: string | null = null;
let supportProbePromise: Promise<boolean> | null = null;

const DEFAULT_NOT_SUPPORTED_MESSAGE =
	"Face detection is unavailable on this device. Open Settings and run Camera Check to use mobile relay capture.";

const markNotSupported = (message: string): void => {
	supported = false;
	detector = null;
	notSupportedMessage = message;
};

const isNotSupportedError = (error: unknown): boolean => {
	const errorName = error instanceof Error ? error.name : "UnknownError";
	const errorMessage = error instanceof Error ? error.message : String(error);

	return (
		errorName === "NotSupportedError" ||
		/face detection service unavailable/i.test(errorMessage)
	);
};

/**
 * Capability check recommended by Chrome docs:
 * constructor presence is not enough, we also probe a tiny canvas detect.
 */
const ensureDetectorSupport = async (): Promise<boolean> => {
	if (supported !== null) {
		return supported;
	}

	if (typeof FaceDetector === "undefined") {
		markNotSupported(
			"FaceDetector API unavailable. Ensure --enable-experimental-web-platform-features is enabled.",
		);
		console.warn(notSupportedMessage);
		return false;
	}

	if (!supportProbePromise) {
		console.log("Probing FaceDetector support...");
		supportProbePromise = (async () => {
			try {
				console.log("Running FaceDetector support probe...");
				const probe = new FaceDetector({ maxDetectedFaces: 1, fastMode: true });
				console.log("FaceDetector instance created for support probe. Testing detect on a dummy canvas...");
				const probeCanvas = document.createElement("canvas");
				console.log("Running detect on probe canvas...");
				probeCanvas.width = 2;
				probeCanvas.height = 2;
				console.log("Awaiting detect on probe canvas...");
				try {
					console.log("Calling detect on probe canvas...");
					await probe.detect(probeCanvas);
				} catch (error) {
					console.warn("FaceDetector support probe detect call failed", {
						error,
					});
					if (isNotSupportedError(error)) {
						throw error;
					}
				}
				console.log("FaceDetector support probe detect call succeeded.");

				supported = true;
				notSupportedMessage = null;
				console.log("FaceDetector support probe successful");
				return true;
			} catch (error) {
				console.log("FaceDetector support probe failed");

				if (isNotSupportedError(error)) {
					markNotSupported(
						"Face detection service unavailable on this kiosk. Open Settings and run Camera Check to switch to mobile relay capture.",
					);
					console.warn("[face-detector] FaceDetector support probe failed", {
						error,
					});
					return false;
				}

				// Non-support errors (for example transient canvas state) should not permanently disable detection.
				console.warn("[face-detector] Support probe hit a non-blocking error", {
					error,
				});
				supported = true;
				notSupportedMessage = null;
				return true;
			} finally {
				supportProbePromise = null;
			}
		})();
	}

	return supportProbePromise;
};

/**
 * Lazily initialise the native FaceDetector.
 * Returns null if the API is unavailable.
 */
const getDetector = async (): Promise<FaceDetector | null> => {
	const isSupported = await ensureDetectorSupport();
	if (!isSupported) return null;

	if (!detector) {
		try {
			console.log("Initializing FaceDetector...");
			detector = new FaceDetector({ maxDetectedFaces: 5, fastMode: false });
		} catch (error) {
			if (isNotSupportedError(error)) {
				markNotSupported(
					"Face detection service unavailable on this kiosk. Open Settings and run Camera Check to switch to mobile relay capture.",
				);
				console.warn("[face-detector] FaceDetector constructor unavailable", {
					error,
				});
				return null;
			}

			throw error;
		}
	}

	return detector;
};

const buildNotSupportedResult = (message?: string): FaceDetectionResult => ({
	detected: false,
	faceCount: 0,
	hasSingleForegroundFace: false,
	qualityScore: 0,
	primaryFace: null,
	faces: [],
	message: message ?? notSupportedMessage ?? DEFAULT_NOT_SUPPORTED_MESSAGE,
	reasonCode: "not-supported",
});

/**
 * Detect faces directly from a video element.
 * No IPC, no tensor serialization — runs on the GPU in the renderer process.
 */
export const detectFaces = async (
	video: HTMLVideoElement,
): Promise<FaceDetectionResult> => {
	const fd = await getDetector();

	if (!fd) {
		return buildNotSupportedResult();
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
			qualityScore: 0,
			primaryFace: null,
			faces: [],
			message: "Video not ready.",
			reasonCode: "no-face",
		};
	}

	// let raw: Awaited<ReturnType<FaceDetector['detect']>>;
	let raw: DetectedFaceNative[];
	try {
		raw = await fd.detect(video);
	} catch (error) {
		if (isNotSupportedError(error)) {
			markNotSupported(
				"Face detection service unavailable on this kiosk. Open Settings and run Camera Check to switch to mobile relay capture.",
			);
			const errorName = error instanceof Error ? error.name : "UnknownError";
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.warn("[face-detector] Native face detector unavailable", {
				errorName,
				errorMessage,
			});
			return buildNotSupportedResult();
		}

		console.error("[face-detector] FaceDetector.detect failed", {
			error,
			videoReadyState: video.readyState,
			videoWidth: video.videoWidth,
			videoHeight: video.videoHeight,
		});
		throw error;
	}
	const faces = rankByProminence(
		raw.map((f) => normaliseBounds(f.boundingBox, video.videoWidth, video.videoHeight)),
	);

	if (faces.length === 0) {
		resetFaceStability();
		return {
			detected: false,
			faceCount: 0,
			hasSingleForegroundFace: false,
			qualityScore: 0,
			primaryFace: null,
			faces: [],
			message: "No face detected.",
			reasonCode: "no-face",
		};
	}

	const primary = faces[0];
	if (!primary) {
		resetFaceStability();
		return {
			detected: false,
			faceCount: 0,
			hasSingleForegroundFace: false,
			qualityScore: 0,
			primaryFace: null,
			faces: [],
			message: "No face detected.",
			reasonCode: "no-face",
		};
	}

	const timestamp = performance.now();
	const qualityScore = getFaceQualityScore(primary, timestamp);
	const scoredPrimary = withScore(primary, qualityScore);
	const scoredFaces = [scoredPrimary, ...faces.slice(1)];

	const foregroundFaces = scoredFaces.filter(isForeground);
	const hasSingleForegroundFace =
		foregroundFaces.length === 1 && isForeground(scoredPrimary);

	if (faces.length > 1) {
		resetFaceStability();
		return {
			detected: true,
			faceCount: faces.length,
			hasSingleForegroundFace: false,
			qualityScore,
			primaryFace: scoredPrimary,
			faces: scoredFaces,
			message: "Multiple faces detected. Only one person can scan at a time.",
			reasonCode: "multiple-faces",
		};
	}

	if (!isForeground(scoredPrimary)) {
		resetFaceStability();
		return {
			detected: true,
			faceCount: faces.length,
			hasSingleForegroundFace: false,
			qualityScore,
			primaryFace: scoredPrimary,
			faces: scoredFaces,
			message: getOutOfZoneMessage(scoredPrimary),
			reasonCode: "face-out-of-zone",
		};
	}

	updateFaceStability(scoredPrimary, timestamp);

	return {
		detected: true,
		faceCount: faces.length,
		hasSingleForegroundFace,
		qualityScore,
		primaryFace: scoredPrimary,
		faces: scoredFaces,
		message: "Face detected.",
		reasonCode: "ok",
	};
};
