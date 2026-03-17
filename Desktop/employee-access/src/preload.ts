import { contextBridge, ipcRenderer } from 'electron';

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

contextBridge.exposeInMainWorld('detector', {
    detectFace: (request: FaceDetectionRequest): Promise<FaceDetectionResponse> => ipcRenderer.invoke('detector:face', request),
});
