// 再生開始時刻フォーム用の純粋関数。
import { playbackModes } from "../../../stores/subtitleStore.js";

export const COUNTDOWN_SECOND_OPTIONS = [3, 5, 10, 15, 20, 30, 60];

export const DEFAULT_COUNTDOWN_SECONDS = 10;
export const DEFAULT_TARGET_TIME = "23:00";

export const normalizeCountdownSeconds = (value) => {
  const seconds = Number(value);
  if (COUNTDOWN_SECOND_OPTIONS.includes(seconds)) return seconds;
  return DEFAULT_COUNTDOWN_SECONDS;
};

export const normalizePlaybackMode = (value) => {
  return value === playbackModes.absolute ? playbackModes.absolute : playbackModes.countdown;
};

export const normalizeTargetTime = (value) => {
  const { targetHour, targetMinute } = parseTargetTime(value);
  const hour = Number(targetHour);
  const minute = Number(targetMinute);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return DEFAULT_TARGET_TIME;
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return DEFAULT_TARGET_TIME;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

export const normalizePlaybackSettings = (loadedPlaybackSettings, currentPlayback) => ({
  ...currentPlayback,
  mode: normalizePlaybackMode(loadedPlaybackSettings?.mode ?? currentPlayback.mode),
  countdownSeconds: normalizeCountdownSeconds(
    loadedPlaybackSettings?.countdownSeconds ?? currentPlayback.countdownSeconds,
  ),
  targetTime: normalizeTargetTime(loadedPlaybackSettings?.targetTime ?? currentPlayback.targetTime),
});

export const parseTargetTime = (targetTime) => {
  const [targetHour = "00", targetMinute = "00"] = String(targetTime).split(":");
  return { targetHour, targetMinute };
};

export const updateTargetTimePart = (targetTime, part, value) => {
  const { targetHour, targetMinute } = parseTargetTime(targetTime);
  return part === "hour" ? `${value}:${targetMinute}` : `${targetHour}:${value}`;
};
