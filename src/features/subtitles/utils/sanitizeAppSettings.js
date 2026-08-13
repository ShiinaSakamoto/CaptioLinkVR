import {
  DEFAULT_PLAYBACK_SETTINGS,
  DEFAULT_RENDER_SETTINGS,
} from "../constants/defaultRenderSettings.js";
import { OPACITY_PERCENT_MAX, OPACITY_PERCENT_MIN } from "./subtitleOpacity.js";
import {
  COUNTDOWN_SECOND_OPTIONS,
  DEFAULT_COUNTDOWN_SECONDS,
  DEFAULT_TARGET_TIME,
} from "./playbackFormUtils.js";
import { playbackModes } from "../../../stores/subtitleStore.js";

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/** 設定キー → 通知用の項目名（分かるものだけ） */
export const SETTINGS_FIELD_LABELS = {
  showDesktopPreview: "デスクトッププレビュー",
  autoTextureSize: "テクスチャサイズ自動",
  width: "テクスチャ幅",
  height: "テクスチャ高さ",
  maxTextureWidth: "最大テクスチャ幅",
  maxTextureHeight: "最大テクスチャ高さ",
  renderScale: "字幕画質",
  overlayMaxFps: "VR更新FPS",
  overlayPrepareMs: "オーバーレイ準備時間",
  overlayWidthMeters: "オーバーレイ幅",
  fontSize: "フォントサイズ基準",
  fontSizePercent: "字幕サイズ",
  wrapWidthPercent: "折り返し幅",
  rubyEnabled: "ルビ",
  rubyDistance: "本文とのルビの距離",
  vrchatChatboxEnabled: "VRChatチャットボックスにも送信",
  vrchatChatboxHost: "VRChatチャットボックスホスト",
  vrchatChatboxPort: "VRChatチャットボックスポート",
  textColor: "文字色",
  textOpacityPercent: "字幕の透過",
  backgroundEnabled: "背景",
  backgroundColor: "背景色",
  backgroundOpacityPercent: "背景の透過",
  backgroundPadding: "背景の大きさ（余白）",
  outlineEnabled: "袋文字",
  outlineColor: "袋文字色",
  outlineWidth: "袋文字の大きさ",
  shadowEnabled: "影",
  shadowColor: "影の色",
  shadowBlur: "影の太さ",
  positionX: "表示位置（左右）",
  positionY: "表示位置（上下）",
  positionZ: "表示位置（前後）",
  rotationX: "X軸の回転",
  rotationY: "Y軸の回転",
  rotationZ: "Z軸の回転",
  textOffsetX: "文字オフセットX",
  textOffsetY: "文字オフセットY",
  theme: "テーマ",
  mode: "カウントダウンモード",
  countdownSeconds: "開始カウント",
  targetTime: "開始時刻",
};

const isBool = (value) => typeof value === "boolean";
const isFiniteNumber = (value) => Number.isFinite(Number(value));
const isString = (value) => typeof value === "string";

const acceptNumber = (value, min, max, { integer = false } = {}) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  if (num < min || num > max) return null;
  return integer ? Math.round(num) : num;
};

const acceptHexColor = (value) => {
  if (!isString(value) || !HEX_COLOR_RE.test(value)) return null;
  return value;
};

const FIELD_VALIDATORS = {
  showDesktopPreview: (value) => (isBool(value) ? value : null),
  autoTextureSize: (value) => (isBool(value) ? value : null),
  width: (value) => acceptNumber(value, 256, 4096, { integer: true }),
  height: (value) => acceptNumber(value, 64, 4096, { integer: true }),
  maxTextureWidth: (value) => acceptNumber(value, 256, 4096, { integer: true }),
  maxTextureHeight: (value) => acceptNumber(value, 128, 4096, { integer: true }),
  renderScale: (value) => acceptNumber(value, 0.5, 1.5),
  overlayMaxFps: (value) => acceptNumber(value, 1, 120, { integer: true }),
  overlayPrepareMs: (value) => acceptNumber(value, 0, 10_000, { integer: true }),
  overlayWidthMeters: (value) => acceptNumber(value, 0.1, 10),
  fontSize: (value) => {
    const num = acceptNumber(value, 1, 512, { integer: true });
    return num === DEFAULT_RENDER_SETTINGS.fontSize ? num : null;
  },
  fontSizePercent: (value) => acceptNumber(value, 50, 200, { integer: true }),
  wrapWidthPercent: (value) => acceptNumber(value, 30, 100, { integer: true }),
  rubyEnabled: (value) => (isBool(value) ? value : null),
  rubyDistance: (value) => acceptNumber(value, 0, 50, { integer: true }),
  vrchatChatboxEnabled: (value) => (isBool(value) ? value : null),
  vrchatChatboxHost: (value) => (isString(value) && value.trim() ? value.trim() : null),
  vrchatChatboxPort: (value) => acceptNumber(value, 1, 65535, { integer: true }),
  textColor: acceptHexColor,
  textOpacityPercent: (value) => acceptNumber(value, OPACITY_PERCENT_MIN, OPACITY_PERCENT_MAX, { integer: true }),
  backgroundEnabled: (value) => (isBool(value) ? value : null),
  backgroundColor: acceptHexColor,
  backgroundOpacityPercent: (value) =>
    acceptNumber(value, OPACITY_PERCENT_MIN, OPACITY_PERCENT_MAX, { integer: true }),
  backgroundPadding: (value) => acceptNumber(value, 0, 64, { integer: true }),
  outlineEnabled: (value) => (isBool(value) ? value : null),
  outlineColor: acceptHexColor,
  outlineWidth: (value) => acceptNumber(value, 0, 18, { integer: true }),
  shadowEnabled: (value) => (isBool(value) ? value : null),
  shadowColor: acceptHexColor,
  shadowBlur: (value) => acceptNumber(value, 0, 28, { integer: true }),
  positionX: (value) => acceptNumber(value, -2, 2),
  positionY: (value) => acceptNumber(value, -1, 3),
  positionZ: (value) => acceptNumber(value, -4, 0),
  rotationX: (value) => acceptNumber(value, -90, 90),
  rotationY: (value) => acceptNumber(value, -90, 90),
  rotationZ: (value) => acceptNumber(value, -90, 90),
  textOffsetX: (value) => acceptNumber(value, -200, 200, { integer: true }),
  textOffsetY: (value) => acceptNumber(value, -200, 200, { integer: true }),
  theme: (value) => (isString(value) && value.trim() ? value.trim() : null),
};

/**
 * 保存済み描画設定を検証する。不正な項目は初期値へ戻し、キーを返す。
 * 欠落はエラーにせず初期値を使う。
 */
export const sanitizeRenderSettings = (loaded, defaults = DEFAULT_RENDER_SETTINGS) => {
  const settings = { ...defaults };
  const resetKeys = [];
  if (!loaded || typeof loaded !== "object") {
    return { settings, resetKeys };
  }

  for (const key of Object.keys(defaults)) {
    if (!Object.prototype.hasOwnProperty.call(loaded, key) || loaded[key] == null) {
      continue;
    }
    const validator = FIELD_VALIDATORS[key];
    if (!validator) {
      continue;
    }
    const accepted = validator(loaded[key]);
    if (accepted == null) {
      resetKeys.push(key);
      continue;
    }
    settings[key] = accepted;
  }

  return { settings, resetKeys };
};

const acceptPlaybackMode = (value) => {
  if (value === playbackModes.countdown || value === playbackModes.absolute) return value;
  return null;
};

const acceptCountdownSeconds = (value) => {
  const seconds = Number(value);
  if (!COUNTDOWN_SECOND_OPTIONS.includes(seconds)) return null;
  return seconds;
};

const acceptTargetTime = (value) => {
  if (!isString(value) && !isFiniteNumber(value)) return null;
  const [rawHour, rawMinute] = String(value).split(":");
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

/**
 * 保存済み再生設定を検証する。不正な項目は初期値へ戻し、キーを返す。
 */
export const sanitizePlaybackSettings = (loaded, defaults = DEFAULT_PLAYBACK_SETTINGS) => {
  const settings = {
    mode: defaults.mode ?? "countdown",
    countdownSeconds: defaults.countdownSeconds ?? DEFAULT_COUNTDOWN_SECONDS,
    targetTime: defaults.targetTime ?? DEFAULT_TARGET_TIME,
  };
  const resetKeys = [];
  if (!loaded || typeof loaded !== "object") {
    return { settings, resetKeys };
  }

  if (Object.prototype.hasOwnProperty.call(loaded, "mode") && loaded.mode != null) {
    const mode = acceptPlaybackMode(loaded.mode);
    if (mode == null) resetKeys.push("mode");
    else settings.mode = mode;
  }

  if (Object.prototype.hasOwnProperty.call(loaded, "countdownSeconds") && loaded.countdownSeconds != null) {
    const seconds = acceptCountdownSeconds(loaded.countdownSeconds);
    if (seconds == null) resetKeys.push("countdownSeconds");
    else settings.countdownSeconds = seconds;
  }

  if (Object.prototype.hasOwnProperty.call(loaded, "targetTime") && loaded.targetTime != null) {
    const time = acceptTargetTime(loaded.targetTime);
    if (time == null) resetKeys.push("targetTime");
    else settings.targetTime = time;
  }

  return { settings, resetKeys };
};

export const labelsForResetKeys = (keys) =>
  [...new Set(keys)]
    .map((key) => SETTINGS_FIELD_LABELS[key])
    .filter(Boolean);
