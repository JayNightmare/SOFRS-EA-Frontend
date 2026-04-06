import bgMusicSrc from "../music/bg-music.mp3";
import { getAppSettings, subscribeToSettings } from "../services/settings";

let backgroundAudio: HTMLAudioElement | null = null;
let detachSettingsListener: (() => void) | null = null;
let waitingForInteraction = false;

const attemptPlayback = (): void => {
  if (!backgroundAudio) {
    return;
  }

  void backgroundAudio.play().catch(() => {
    if (waitingForInteraction) {
      return;
    }

    waitingForInteraction = true;
    window.addEventListener("pointerdown", handleFirstInteraction, {
      once: true,
    });
  });
};

const handleFirstInteraction = (): void => {
  waitingForInteraction = false;
  attemptPlayback();
};

const applyMusicSettings = (): void => {
  if (!backgroundAudio) {
    return;
  }

  const settings = getAppSettings();
  backgroundAudio.volume = settings.musicVolume;

  if (!settings.musicEnabled) {
    backgroundAudio.pause();
    backgroundAudio.currentTime = 0;
    return;
  }

  attemptPlayback();
};

export const initBackgroundMusic = (): void => {
  if (backgroundAudio) {
    applyMusicSettings();
    return;
  }

  backgroundAudio = new Audio(bgMusicSrc);
  backgroundAudio.loop = true;
  backgroundAudio.preload = "auto";

  if (!detachSettingsListener) {
    detachSettingsListener = subscribeToSettings(() => {
      applyMusicSettings();
    });
  }

  applyMusicSettings();
};

export const stopBackgroundMusic = (): void => {
  if (!backgroundAudio) {
    return;
  }

  backgroundAudio.pause();
  backgroundAudio.currentTime = 0;
};
