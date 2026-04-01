import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('relay', {
    getPort: (): Promise<number> => ipcRenderer.invoke('relay:getPort'),
    getLocalIp: (): Promise<string> => ipcRenderer.invoke('relay:getLocalIp'),
    onPhoto: (callback: (dataUrl: string) => void): void => {
        ipcRenderer.on('relay:photo', (_event, payload: string) => {
            callback(payload);
        });
    },
    removePhotoListener: (): void => {
        ipcRenderer.removeAllListeners('relay:photo');
    },
});
