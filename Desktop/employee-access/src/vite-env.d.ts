/// <reference types="vite/client" />

declare module '*.css' {
	const cssContent: string;
	export default cssContent;
}

type FaceDetectionRequest = {
	tensor: number[];
	width: number;
	height: number;
	threshold?: number;
};

type FaceDetectionResponse = {
	detected: boolean;
	confidence: number;
	modelReady: boolean;
	message: string;
};

interface Window {
	detector: {
		detectFace: (request: FaceDetectionRequest) => Promise<FaceDetectionResponse>;
	};
}
