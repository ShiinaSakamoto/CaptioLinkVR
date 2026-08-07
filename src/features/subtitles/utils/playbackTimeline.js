import { playbackModes } from "../../../stores/subtitleStore.js";

const COUNTDOWN_LABEL = "字幕再生まで";
const COUNTDOWN_START_TEXT = "00:00 スタート！";

export const getCountdownDisplaySeconds = (remainingSeconds) => Math.max(0, Math.ceil(Number(remainingSeconds) || 0));

const padTime = (value) => String(value).padStart(2, "0");

export const buildCountdownText = (displaySeconds) => {
  const totalSeconds = getCountdownDisplaySeconds(displaySeconds);
  if (totalSeconds === 0) {
    return COUNTDOWN_START_TEXT;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const timeText = hours > 0
    ? `${padTime(hours)}:${padTime(minutes)}:${padTime(seconds)}`
    : `${padTime(minutes)}:${padTime(seconds)}`;
  return `${COUNTDOWN_LABEL} ${timeText}`;
};

// UI上の開始指定から、本編開始までの秒数を作る。
export const calculateDelaySeconds = (playback) => {
  if (playback.mode === playbackModes.countdown) {
    return Math.max(0, Number(playback.countdownSeconds) || 0);
  }

  const [hour, minute] = playback.targetTime.split(":").map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour || 0, minute || 0, 0, 0);
  if (target.getTime() < now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  return Math.ceil((target.getTime() - now.getTime()) / 1000);
};
