export type AppSettings = {
    musicEnabled: boolean;
    musicVolume: number;
    minimumCameraWidth: number;
    minimumCameraHeight: number;
    minimumCameraFps: number;
    mobileSetupUrl: string;
    transitionLoaderMs: number;
};

const SETTINGS_STORAGE_KEY = "sofrs.desktop.settings.v1";

const DEFAULT_APP_SETTINGS: AppSettings = {
    musicEnabled: true,
    musicVolume: 0.35,
    minimumCameraWidth: 1280,
    minimumCameraHeight: 720,
    minimumCameraFps: 24,
    mobileSetupUrl: "https://sofrs-mobile.local/face-setup",
    transitionLoaderMs: 320,
};

const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value));

const toNumber = (value: unknown, fallback: number): number => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return fallback;
};

const normalizeSettings = (
    value: Partial<AppSettings> | null | undefined,
): AppSettings => {
    const source = value ?? {};

    return {
        musicEnabled:
            typeof source.musicEnabled === "boolean"
                ? source.musicEnabled
                : DEFAULT_APP_SETTINGS.musicEnabled,
        musicVolume: clamp(
            toNumber(source.musicVolume, DEFAULT_APP_SETTINGS.musicVolume),
            0,
            1,
        ),
        minimumCameraWidth: Math.round(
            clamp(
                toNumber(
                    source.minimumCameraWidth,
                    DEFAULT_APP_SETTINGS.minimumCameraWidth,
                ),
                320,
                7680,
            ),
        ),
        minimumCameraHeight: Math.round(
            clamp(
                toNumber(
                    source.minimumCameraHeight,
                    DEFAULT_APP_SETTINGS.minimumCameraHeight,
                ),
                240,
                4320,
            ),
        ),
        minimumCameraFps: Math.round(
            clamp(
                toNumber(source.minimumCameraFps, DEFAULT_APP_SETTINGS.minimumCameraFps),
                10,
                120,
            ),
        ),
        mobileSetupUrl:
            typeof source.mobileSetupUrl === "string"
                ? source.mobileSetupUrl.trim()
                : DEFAULT_APP_SETTINGS.mobileSetupUrl,
        transitionLoaderMs: Math.round(
            clamp(
                toNumber(
                    source.transitionLoaderMs,
                    DEFAULT_APP_SETTINGS.transitionLoaderMs,
                ),
                120,
                2000,
            ),
        ),
    };
};

const loadSettings = (): AppSettings => {
    try {
        const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (!raw) {
            return { ...DEFAULT_APP_SETTINGS };
        }
        const parsed = JSON.parse(raw) as Partial<AppSettings>;
        return normalizeSettings({ ...DEFAULT_APP_SETTINGS, ...parsed });
    } catch {
        return { ...DEFAULT_APP_SETTINGS };
    }
};

let currentSettings = loadSettings();

const listeners = new Set<(settings: AppSettings) => void>();

const persistSettings = (): void => {
    try {
        window.localStorage.setItem(
            SETTINGS_STORAGE_KEY,
            JSON.stringify(currentSettings),
        );
    } catch {
        // Ignore storage failures (e.g. private mode constraints).
    }
};

const notifyListeners = (): void => {
    const snapshot = { ...currentSettings };
    for (const listener of listeners) {
        listener(snapshot);
    }
};

export const getDefaultAppSettings = (): AppSettings => ({
    ...DEFAULT_APP_SETTINGS,
});

export const getAppSettings = (): AppSettings => ({ ...currentSettings });

export const updateAppSettings = (patch: Partial<AppSettings>): AppSettings => {
    currentSettings = normalizeSettings({ ...currentSettings, ...patch });
    persistSettings();
    notifyListeners();
    return getAppSettings();
};

export const resetAppSettings = (): AppSettings => {
    currentSettings = { ...DEFAULT_APP_SETTINGS };
    persistSettings();
    notifyListeners();
    return getAppSettings();
};

export const subscribeToSettings = (
    listener: (settings: AppSettings) => void,
): (() => void) => {
    listeners.add(listener);
    listener(getAppSettings());

    return () => {
        listeners.delete(listener);
    };
};

export const resolveMobileSetupUrl = (): string => {
    if (currentSettings.mobileSetupUrl.trim().length > 0) {
        return currentSettings.mobileSetupUrl;
    }

    const envUrl = import.meta.env.VITE_MOBILE_SETUP_URL;
    if (envUrl && envUrl.trim().length > 0) {
        return envUrl.trim();
    }

    return DEFAULT_APP_SETTINGS.mobileSetupUrl;
};
