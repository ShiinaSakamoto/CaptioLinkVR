import { atom } from "jotai";
import {
  DEFAULT_PLAYBACK_SETTINGS,
  DEFAULT_RENDER_SETTINGS,
} from "../features/subtitles/constants/defaultRenderSettings.js";

// --- 再生 ---
export const playbackModes = {
  countdown: "countdown",
  absolute: "absolute",
};

export const playbackAtom = atom({
  mode: DEFAULT_PLAYBACK_SETTINGS.mode,
  countdownSeconds: DEFAULT_PLAYBACK_SETTINGS.countdownSeconds,
  targetTime: DEFAULT_PLAYBACK_SETTINGS.targetTime,
  isPlaying: false,
});

/** 再生中は字幕ソース（プリセット等）の変更をロックする */
export const isPlaybackSourceLockedAtom = atom((get) => get(playbackAtom).isPlaying);

/** 停止ボタンへ注意を促すリップル。インクリメントのたびに 1 回アニメする */
export const stopAttentionPulseAtom = atom(0);

export const playbackTimingAtom = atom({
  scheduledStartAtMs: null,
  remainingSeconds: null,
});

export const timersAtom = atom({
  cueTimerIds: [],
  countdownTimerId: null,
  frameTimerId: null,
  sampleTimerId: null,
});

// --- 字幕キュー ---
export const subtitleCuesAtom = atom([]);
export const selectedCueIdAtom = atom(null);
export const activeCueIdAtom = atom(null);
export const activeCueTextAtom = atom("");
export const cueListScrollTopAtom = atom(0);

// 字幕プレビュー箱を出す条件（再生中 or 字幕テスト中。キュー間の空表示でも維持）
export const isSubtitlePreviewVisibleAtom = atom((get) => {
  const playback = get(playbackAtom);
  const timers = get(timersAtom);
  return playback.isPlaying || Boolean(timers.sampleTimerId);
});

export const isPlayableAtom = atom((get) => get(subtitleCuesAtom).length > 0);

// --- オーバーレイ / ファイル ---
export const overlayStatusAtom = atom({
  connected: false,
  visible: false,
  lastError: "",
});

export const subtitleFileAtom = atom({
  name: "",
  type: "",
  source: "none",
  presetId: "",
  displayName: "",
});

// --- 描画設定 ---
export const renderSettingsAtom = atom({ ...DEFAULT_RENDER_SETTINGS });

/** 設定読み込み失敗時のUI通知。null で非表示 */
export const settingsLoadNoticeAtom = atom(null);

export const updateRenderSettingAtom = atom(null, (_get, set, { key, value }) => {
  set(renderSettingsAtom, (current) => ({ ...current, [key]: value }));
});

// --- プリセット UI ---
export const selectedPresetIdAtom = atom("");
export const presetMetaAtom = atom(null);
export const presetMetaErrorAtom = atom("");
export const loadingPresetIdAtom = atom("");

// --- ワークスペースのタブ状態（Visual QA からも切替できるよう共有） ---
export const workspaceMainPageAtom = atom("settings"); // "settings" | "style" | "cues"
export const vrAdjustPageAtom = atom("position"); // "position" | "rotation"
export const advancedSettingsOpenAtom = atom(false);

// --- Visual QA ---
/** フッターロゴ連打で解禁する隠しQAボタン */
export const visualQaUnlockedAtom = atom(false);
/** 操作中の設定キー（ハイライト＋スクロール） */
export const visualQaHighlightKeyAtom = atom(null);
/** 操作中の部品（slider / reset / increment 等。visualQaEngine の action.kind） */
export const visualQaHighlightTargetAtom = atom(null);
