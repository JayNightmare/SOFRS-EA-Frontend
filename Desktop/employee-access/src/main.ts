import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-sandbox');

if (!app.isPackaged) {
  app.commandLine.appendSwitch('no-sandbox');
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

  mainWindow.maximize();
};

type FaceDetectionRequest = {
  tensor: number[];
  width: number;
  height: number;
  threshold?: number;
};

type FaceReasonCode =
  | 'ok'
  | 'no-face'
  | 'multiple-faces'
  | 'face-out-of-zone'
  | 'model-error'
  | 'invalid-input';

type FaceBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
};

type FaceDetectionResponse = {
  detected: boolean;
  confidence: number;
  modelReady: boolean;
  message: string;
  faceCount: number;
  reasonCode: FaceReasonCode;
  hasSingleForegroundFace: boolean;
  primaryFace: FaceBox | null;
  faces: FaceBox[];
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

const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
};

const getIntersectionOverUnion = (a: FaceBox, b: FaceBox): number => {
  const aRight = a.x + a.width;
  const aBottom = a.y + a.height;
  const bRight = b.x + b.width;
  const bBottom = b.y + b.height;

  const intersectX = Math.max(a.x, b.x);
  const intersectY = Math.max(a.y, b.y);
  const intersectRight = Math.min(aRight, bRight);
  const intersectBottom = Math.min(aBottom, bBottom);

  const intersectWidth = Math.max(0, intersectRight - intersectX);
  const intersectHeight = Math.max(0, intersectBottom - intersectY);
  const intersectArea = intersectWidth * intersectHeight;

  const aArea = a.width * a.height;
  const bArea = b.width * b.height;
  const union = aArea + bArea - intersectArea;

  if (union <= 0) {
    return 0;
  }

  return intersectArea / union;
};

const applyNms = (boxes: FaceBox[], iouThreshold = 0.45): FaceBox[] => {
  const sorted = [...boxes].sort((left, right) => right.confidence - left.confidence);
  const selected: FaceBox[] = [];

  for (const candidate of sorted) {
    const overlaps = selected.some((chosen) => getIntersectionOverUnion(candidate, chosen) > iouThreshold);

    if (!overlaps) {
      selected.push(candidate);
    }
  }

  return selected;
};

const normalizeCandidateBox = (x: number, y: number, width: number, height: number, inputWidth: number, inputHeight: number): FaceBox => {
  const useAbsoluteCoordinates = Math.max(Math.abs(x), Math.abs(y), Math.abs(width), Math.abs(height)) > 2;
  const rawCenterX = useAbsoluteCoordinates ? x / inputWidth : x;
  const rawCenterY = useAbsoluteCoordinates ? y / inputHeight : y;
  const rawWidth = useAbsoluteCoordinates ? width / inputWidth : width;
  const rawHeight = useAbsoluteCoordinates ? height / inputHeight : height;

  const clampedWidth = clamp01(Math.abs(rawWidth));
  const clampedHeight = clamp01(Math.abs(rawHeight));
  const left = clamp01(rawCenterX - (clampedWidth / 2));
  const top = clamp01(rawCenterY - (clampedHeight / 2));
  const maxWidth = clamp01(1 - left);
  const maxHeight = clamp01(1 - top);

  return {
    x: left,
    y: top,
    width: Math.min(clampedWidth, maxWidth),
    height: Math.min(clampedHeight, maxHeight),
    confidence: 0,
  };
};

const extractFaceCandidates = (output: OnnxTensor, threshold: number, inputWidth: number, inputHeight: number): FaceBox[] => {
  const dims = output.dims;
  const data = output.data;

  if (!(data instanceof Float32Array) || dims.length !== 3 || dims[0] !== 1) {
    return [];
  }

  const dimensionA = dims[1];
  const dimensionB = dims[2];
  const candidates: FaceBox[] = [];

  if (dimensionA > dimensionB) {
    for (let candidate = 0; candidate < dimensionA; candidate += 1) {
      const offset = candidate * dimensionB;
      const x = data[offset] ?? 0;
      const y = data[offset + 1] ?? 0;
      const width = data[offset + 2] ?? 0;
      const height = data[offset + 3] ?? 0;
      const attributes = Array.from(data.slice(offset, offset + dimensionB));
      const score = getCandidateScore(attributes);

      if (score >= threshold) {
        const box = normalizeCandidateBox(x, y, width, height, inputWidth, inputHeight);
        box.confidence = score;
        candidates.push(box);
      }
    }

    return applyNms(candidates).slice(0, 5);
  }

  for (let candidate = 0; candidate < dimensionB; candidate += 1) {
    const attributes: number[] = [];

    for (let index = 0; index < dimensionA; index += 1) {
      attributes.push(data[index * dimensionB + candidate] ?? 0);
    }

    const score = getCandidateScore(attributes);

    if (score >= threshold) {
      const box = normalizeCandidateBox(
        attributes[0] ?? 0,
        attributes[1] ?? 0,
        attributes[2] ?? 0,
        attributes[3] ?? 0,
        inputWidth,
        inputHeight,
      );
      box.confidence = score;
      candidates.push(box);
    }
  }

  return applyNms(candidates).slice(0, 5);
};

const isForegroundFace = (face: FaceBox): boolean => {
  const area = face.width * face.height;
  const centerX = face.x + (face.width / 2);
  const centerY = face.y + (face.height / 2);
  const inFocusZone = centerX >= 0.18 && centerX <= 0.82 && centerY >= 0.15 && centerY <= 0.85;

  return area >= 0.06 && inFocusZone;
};

const runFaceDetection = async (request: FaceDetectionRequest): Promise<FaceDetectionResponse> => {
  if (!request.tensor || !Array.isArray(request.tensor) || request.tensor.length === 0) {
    return {
      detected: false,
      confidence: 0,
      modelReady: false,
      message: 'Invalid tensor payload.',
      faceCount: 0,
      reasonCode: 'invalid-input',
      hasSingleForegroundFace: false,
      primaryFace: null,
      faces: [],
    };
  }

  const expectedLength = request.width * request.height * 3;

  if (request.tensor.length !== expectedLength) {
    return {
      detected: false,
      confidence: 0,
      modelReady: false,
      message: `Invalid tensor size. Expected ${expectedLength}, received ${request.tensor.length}.`,
      faceCount: 0,
      reasonCode: 'invalid-input',
      hasSingleForegroundFace: false,
      primaryFace: null,
      faces: [],
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
      faceCount: 0,
      reasonCode: 'model-error',
      hasSingleForegroundFace: false,
      primaryFace: null,
      faces: [],
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
      faceCount: 0,
      reasonCode: 'model-error',
      hasSingleForegroundFace: false,
      primaryFace: null,
      faces: [],
    };
  }

  const threshold = request.threshold ?? 0.35;
  const faces = extractFaceCandidates(firstOutput, threshold, request.width, request.height);
  const primaryFace = faces[0] ?? null;
  const confidence = primaryFace?.confidence ?? 0;
  const hasSingleForegroundFace = primaryFace !== null && faces.length === 1 && isForegroundFace(primaryFace);

  let reasonCode: FaceReasonCode = 'ok';
  let message = 'Face detected';

  if (faces.length === 0) {
    reasonCode = 'no-face';
    message = 'No face detected';
  } else if (faces.length > 1) {
    reasonCode = 'multiple-faces';
    message = 'Multiple faces detected';
  } else if (!hasSingleForegroundFace) {
    reasonCode = 'face-out-of-zone';
    message = 'Move closer and center your face in frame';
  }

  return {
    detected: faces.length > 0,
    confidence,
    modelReady: true,
    message,
    faceCount: faces.length,
    reasonCode,
    hasSingleForegroundFace,
    primaryFace,
    faces,
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
      faceCount: 0,
      reasonCode: 'model-error',
      hasSingleForegroundFace: false,
      primaryFace: null,
      faces: [],
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
