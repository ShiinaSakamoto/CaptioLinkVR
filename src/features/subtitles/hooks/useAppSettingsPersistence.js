import { useAtom } from "jotai";
import { useEffect, useRef } from "react";
import { loadAppSettings, saveAppSettings } from "../../settings/settingsApi.js";
import { playbackAtom, renderSettingsAtom } from "../../../stores/subtitleStore.js";
import { normalizePlaybackSettings } from "../utils/playbackFormUtils.js";
import { normalizeRenderSettings } from "../utils/renderSettingsMigration.js";

const SETTINGS_SAVE_DELAY_MS = 700;

// 起動時の settings.json 読み込みと、変更の遅延保存を担う。
export const useAppSettingsPersistence = () => {
  const [settings, setSettings] = useAtom(renderSettingsAtom);
  const [playback, setPlayback] = useAtom(playbackAtom);
  const settingsLoadedRef = useRef(false);
  const saveSettingsTimerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    loadAppSettings()
      .then((loadedSettings) => {
        if (cancelled) return;
        if (loadedSettings?.renderSettings) {
          setSettings((current) => normalizeRenderSettings(loadedSettings.renderSettings, current));
        }
        if (loadedSettings?.playbackSettings) {
          setPlayback((current) => normalizePlaybackSettings(loadedSettings.playbackSettings, current));
        }
      })
      .catch((error) => {
        console.warn("settings.json could not be loaded", error);
      })
      .finally(() => {
        if (cancelled) return;
        settingsLoadedRef.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, [setPlayback, setSettings]);

  useEffect(() => {
    if (!settingsLoadedRef.current) return;

    if (saveSettingsTimerRef.current) window.clearTimeout(saveSettingsTimerRef.current);
    saveSettingsTimerRef.current = window.setTimeout(() => {
      saveAppSettings({
        renderSettings: settings,
        playbackSettings: {
          mode: playback.mode,
          countdownSeconds: playback.countdownSeconds,
          targetTime: playback.targetTime,
        },
      }).catch((error) => console.warn("settings.json could not be saved", error));
      saveSettingsTimerRef.current = null;
    }, SETTINGS_SAVE_DELAY_MS);

    return () => {
      if (saveSettingsTimerRef.current) window.clearTimeout(saveSettingsTimerRef.current);
    };
  }, [playback.countdownSeconds, playback.mode, playback.targetTime, settings]);
};
