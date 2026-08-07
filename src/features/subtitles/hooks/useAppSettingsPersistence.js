import { useAtom, useSetAtom } from "jotai";
import { useEffect, useRef } from "react";
import { loadAppSettings, saveAppSettings } from "../../settings/settingsApi.js";
import {
  playbackAtom,
  renderSettingsAtom,
  settingsLoadNoticeAtom,
} from "../../../stores/subtitleStore.js";
import { ui } from "../../../shared/uiText.js";
import {
  labelsForResetKeys,
  sanitizePlaybackSettings,
  sanitizeRenderSettings,
} from "../utils/sanitizeAppSettings.js";

const SETTINGS_SAVE_DELAY_MS = 700;

const buildSettingsLoadNotice = (resetKeys) => {
  const prefix = ui.settingsLoadFailed;
  const labels = labelsForResetKeys(resetKeys);
  if (labels.length > 0) {
    return `${prefix}${ui.settingsLoadResetFields(labels)}`;
  }
  return `${prefix}${ui.settingsLoadResetAll}`;
};

// 起動時の settings.json 読み込みと、変更の遅延保存を担う。
export const useAppSettingsPersistence = () => {
  const [settings, setSettings] = useAtom(renderSettingsAtom);
  const [playback, setPlayback] = useAtom(playbackAtom);
  const setSettingsLoadNotice = useSetAtom(settingsLoadNoticeAtom);
  const settingsLoadedRef = useRef(false);
  const saveSettingsTimerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    loadAppSettings()
      .then((loadedSettings) => {
        if (cancelled) return;

        const renderResult = sanitizeRenderSettings(loadedSettings?.renderSettings);
        const playbackResult = sanitizePlaybackSettings(loadedSettings?.playbackSettings);
        const resetKeys = [...renderResult.resetKeys, ...playbackResult.resetKeys];

        setSettings(renderResult.settings);
        setPlayback((current) => ({
          ...current,
          ...playbackResult.settings,
        }));

        if (resetKeys.length > 0) {
          setSettingsLoadNotice(buildSettingsLoadNotice(resetKeys));
        }
      })
      .catch((error) => {
        console.warn("settings.json could not be loaded", error);
        if (cancelled) return;
        // atom 側は既に初期値。全体失敗として通知する。
        setSettingsLoadNotice(buildSettingsLoadNotice([]));
      })
      .finally(() => {
        if (cancelled) return;
        settingsLoadedRef.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, [setPlayback, setSettings, setSettingsLoadNotice]);

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
