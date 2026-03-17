import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 720,
    height: 1280,
    minWidth: 420,
    minHeight: 740,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.webContents.session.setPermissionRequestHandler((_, permission, callback) => {
    const allowedPermissions = new Set(['media']);
    callback(allowedPermissions.has(permission));
  });
};

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

type OnnxTensor = {
  data: Float32Array | Int32Array | Uint8Array;
  dims: number[];
};

type OnnxSession = {
  inputNames: string[];
  outputNames: string[];
  run: (feeds: Record<string, unknown>) => Promise<Record<string, OnnxTensor>>;
};

type OnnxModule = {
  Tensor: new (type: string, data: Float32Array, dims: number[]) => unknown;
  InferenceSession: {
    create: (modelPath: string, options?: Record<string, unknown>) => Promise<OnnxSession>;
  };
};

let faceSessionPromise: Promise<OnnxSession> | null = null;
let onnxModulePromise: Promise<OnnxModule> | null = null;

const loadOnnxModule = async (): Promise<OnnxModule> => {
  if (onnxModulePromise) {
    return onnxModulePromise;
  }

  const moduleName = 'onnxruntime-node';
  onnxModulePromise = import(moduleName) as Promise<OnnxModule>;
  return onnxModulePromise;
};

const resolveModelPath = (): string => {
  if (process.env.YOLO_FACE_MODEL_PATH) {
    return process.env.YOLO_FACE_MODEL_PATH;
  }

  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'YOLOv26', 'yolo26s.onnx');
  }

  return path.join(app.getAppPath(), 'YOLOv26', 'yolo26s.onnx');
};

const ensureFaceSession = async (): Promise<OnnxSession> => {
  if (faceSessionPromise) {
    return faceSessionPromise;
  }

  faceSessionPromise = (async () => {
    const onnx = await loadOnnxModule();
    const modelPath = resolveModelPath();

    if (!fs.existsSync(modelPath)) {
      throw new Error(`ONNX model not found at: ${modelPath}`);
    }

    return onnx.InferenceSession.create(modelPath, {
      executionProviders: ['cpu'],
      graphOptimizationLevel: 'all',
    });
  })();

  try {
    return await faceSessionPromise;
  } catch (error) {
    faceSessionPromise = null;
    throw error;
  }
};

const getCandidateScore = (attributes: number[]): number => {
  if (attributes.length <= 4) {
    return 0;
  }

  if (attributes.length === 5) {
    return attributes[4];
  }

  const tail = attributes.slice(4);
  const rawMax = Math.max(...tail);
  const objectness = tail[0] ?? 0;
  const classMax = tail.length > 1 ? Math.max(...tail.slice(1)) : objectness;

  return Math.max(rawMax, objectness * classMax);
};

const getMaxFaceScore = (output: OnnxTensor): number => {
  const dims = output.dims;
  const data = output.data;

  if (!(data instanceof Float32Array) || dims.length !== 3 || dims[0] !== 1) {
    return 0;
  }

  const dimensionA = dims[1];
  const dimensionB = dims[2];
  let maxScore = 0;

  if (dimensionA > dimensionB) {
    for (let candidate = 0; candidate < dimensionA; candidate += 1) {
      const offset = candidate * dimensionB;
      const attributes: number[] = [];

      for (let index = 0; index < dimensionB; index += 1) {
        attributes.push(data[offset + index] ?? 0);
      }

      maxScore = Math.max(maxScore, getCandidateScore(attributes));
    }

    return maxScore;
  }

  for (let candidate = 0; candidate < dimensionB; candidate += 1) {
    const attributes: number[] = [];

    for (let index = 0; index < dimensionA; index += 1) {
      attributes.push(data[index * dimensionB + candidate] ?? 0);
    }

    maxScore = Math.max(maxScore, getCandidateScore(attributes));
  }

  return maxScore;
};

const runFaceDetection = async (request: FaceDetectionRequest): Promise<FaceDetectionResponse> => {
  if (!request.tensor || !Array.isArray(request.tensor) || request.tensor.length === 0) {
    return {
      detected: false,
      confidence: 0,
      modelReady: false,
      message: 'Invalid tensor payload.',
    };
  }

  const expectedLength = request.width * request.height * 3;

  if (request.tensor.length !== expectedLength) {
    return {
      detected: false,
      confidence: 0,
      modelReady: false,
      message: `Invalid tensor size. Expected ${expectedLength}, received ${request.tensor.length}.`,
    };
  }

  const session = await ensureFaceSession();
  const onnx = await loadOnnxModule();
  const inputName = session.inputNames[0];

  if (!inputName) {
    return {
      detected: false,
      confidence: 0,
      modelReady: false,
      message: 'Model input is unavailable.',
    };
  }

  const inputTensor = new onnx.Tensor('float32', Float32Array.from(request.tensor), [1, 3, request.height, request.width]);
  const outputs = await session.run({ [inputName]: inputTensor });
  const firstOutputName = session.outputNames[0];
  const firstOutput = firstOutputName ? outputs[firstOutputName] : undefined;

  if (!firstOutput) {
    return {
      detected: false,
      confidence: 0,
      modelReady: false,
      message: 'Model output is unavailable.',
    };
  }

  const confidence = getMaxFaceScore(firstOutput);
  const threshold = request.threshold ?? 0.35;

  return {
    detected: confidence >= threshold,
    confidence,
    modelReady: true,
    message: confidence >= threshold ? 'Face detected' : 'No face detected',
  };
};

ipcMain.handle('detector:face', async (_event, request: FaceDetectionRequest): Promise<FaceDetectionResponse> => {
  try {
    return await runFaceDetection(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown detection error';

    return {
      detected: false,
      confidence: 0,
      modelReady: false,
      message,
    };
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
