import {
  BACKGROUND_COLOR_PRESETS,
  OUTLINE_COLOR_PRESETS,
  TEXT_COLOR_PRESETS,
} from "../constants/styleColorPresets.js";
import { DEFAULT_RENDER_SETTINGS } from "../constants/defaultRenderSettings.js";
import { OPACITY_PERCENT_MAX, OPACITY_PERCENT_MIN } from "../utils/subtitleOpacity.js";
import { buildColorCycleActions, buildNumericSweepActions, buildToggleGachaActions } from "./visualQaEngine.js";

const findPresetValue = (presets, id) => presets.find((preset) => preset.id === id)?.value;

const textColor = (id) => findPresetValue(TEXT_COLOR_PRESETS, id);
const backgroundColor = (id) => findPresetValue(BACKGROUND_COLOR_PRESETS, id);
const outlineColor = (id) => findPresetValue(OUTLINE_COLOR_PRESETS, id);

// tab / adjustPage / openAdvanced: その設定が見えるUI位置。
// dependsOnKey: ステップ中だけ true にし、終了時に戻す機能キー（例: outlineEnabled）。
// 設定追加時はここにステップを足す（忘れると visualQaScenario.test.js が落とす）。
export const DEFAULT_VISUAL_QA_SCENARIO = [
  {
    id: "font-size",
    label: "字幕サイズ",
    tab: "settings",
    category: "general",
    settingKeys: ["fontSizePercent"],
    baseValue: DEFAULT_RENDER_SETTINGS.fontSizePercent,
    actions: buildNumericSweepActions({
      key: "fontSizePercent",
      min: 50,
      max: 200,
      step: 5,
      base: DEFAULT_RENDER_SETTINGS.fontSizePercent,
    }),
  },
  {
    id: "render-scale",
    label: "字幕画質（描画倍率）",
    tab: "settings",
    category: "general",
    openAdvanced: true,
    settingKeys: ["renderScale"],
    baseValue: 1,
    actions: buildNumericSweepActions({ key: "renderScale", min: 0.5, max: 1.5, step: 0.05, base: 1 }),
  },
  // 位置/回転はAxisControls上の見た目（表示値）を軸ごとに正負反転している場合があるが、
  // ここでは実データキー（renderSettingsの生値）をそのまま最小〜最大まで動かす。
  // 表示レンジ・既定値は BasicSettingsPanel.jsx の axisRanges / axisDefaults と必ず一致させること。
  {
    id: "position-x",
    label: "表示位置（左右）",
    tab: "settings",
    category: "position",
    adjustPage: "position",
    settingKeys: ["positionX"],
    baseValue: 0,
    actions: buildNumericSweepActions({ key: "positionX", min: -2, max: 2, step: 0.05, base: 0 }),
  },
  {
    id: "position-y",
    label: "表示位置（上下）",
    tab: "settings",
    category: "position",
    adjustPage: "position",
    settingKeys: ["positionY"],
    baseValue: DEFAULT_RENDER_SETTINGS.positionY,
    actions: buildNumericSweepActions({
      key: "positionY",
      min: -1,
      max: 3,
      step: 0.05,
      base: DEFAULT_RENDER_SETTINGS.positionY,
    }),
  },
  {
    id: "position-z",
    label: "表示位置（前後）",
    tab: "settings",
    category: "position",
    adjustPage: "position",
    settingKeys: ["positionZ"],
    baseValue: -1.2,
    // 表示上は z:[0,4] だが、UIの表示値は -positionZ なので生値の範囲は [-4, 0]
    // UI上の「前へ(+)」ボタンは実データを減らす操作なので、increment/decrementを逆にする
    invertedIncrement: true,
    actions: buildNumericSweepActions({ key: "positionZ", min: -4, max: 0, step: 0.05, base: -1.2 }),
  },
  {
    id: "rotation-x",
    label: "回転（X軸）",
    tab: "settings",
    category: "rotation",
    adjustPage: "rotation",
    settingKeys: ["rotationX"],
    baseValue: DEFAULT_RENDER_SETTINGS.rotationX,
    // 表示上は y:[-45,45] だが、UIの表示値は -rotationX（対称なので範囲自体は同じ）
    // UI上の「上(+)」ボタンは実データを減らす操作なので、increment/decrementを逆にする
    invertedIncrement: true,
    actions: buildNumericSweepActions({
      key: "rotationX",
      min: -45,
      max: 45,
      step: 1,
      base: DEFAULT_RENDER_SETTINGS.rotationX,
    }),
  },
  {
    id: "rotation-y",
    label: "回転（Y軸）",
    tab: "settings",
    category: "rotation",
    adjustPage: "rotation",
    settingKeys: ["rotationY"],
    baseValue: 0,
    actions: buildNumericSweepActions({ key: "rotationY", min: -90, max: 90, step: 1, base: 0 }),
  },
  {
    id: "rotation-z",
    label: "回転（Z軸）",
    tab: "settings",
    category: "rotation",
    adjustPage: "rotation",
    settingKeys: ["rotationZ"],
    baseValue: 0,
    // 表示上は z:[-45,45] だが、UIの表示値は -rotationZ（対称なので範囲自体は同じ）
    // UI上の「右(+)」ボタンは実データを減らす操作なので、increment/decrementを逆にする
    invertedIncrement: true,
    actions: buildNumericSweepActions({ key: "rotationZ", min: -45, max: 45, step: 1, base: 0 }),
  },
  {
    id: "text-color",
    label: "文字色",
    tab: "style",
    category: "text",
    settingKeys: ["textColor"],
    baseValue: textColor("white"),
    actions: buildColorCycleActions({
      key: "textColor",
      base: textColor("white"),
      colors: TEXT_COLOR_PRESETS.map((preset) => preset.value),
    }),
  },
  {
    id: "text-opacity",
    label: "字幕の透過",
    tab: "style",
    category: "text",
    settingKeys: ["textOpacityPercent"],
    baseValue: 100,
    actions: buildNumericSweepActions({
      key: "textOpacityPercent",
      min: OPACITY_PERCENT_MIN,
      max: OPACITY_PERCENT_MAX,
      step: 1,
      base: 100,
    }),
  },
  {
    id: "ruby-enabled",
    label: "ルビ ON/OFF",
    tab: "style",
    category: "ruby",
    settingKeys: ["rubyEnabled"],
    baseValue: true,
    actions: buildToggleGachaActions({ key: "rubyEnabled", base: true }),
  },
  {
    id: "ruby-distance",
    label: "ルビの距離",
    tab: "style",
    category: "ruby",
    dependsOnKey: "rubyEnabled",
    settingKeys: ["rubyDistance"],
    baseValue: DEFAULT_RENDER_SETTINGS.rubyDistance,
    actions: buildNumericSweepActions({
      key: "rubyDistance",
      min: 0,
      max: 50,
      step: 1,
      base: DEFAULT_RENDER_SETTINGS.rubyDistance,
    }),
  },
  {
    id: "background-enabled",
    label: "背景 ON/OFF",
    tab: "style",
    category: "background",
    settingKeys: ["backgroundEnabled"],
    baseValue: true,
    actions: buildToggleGachaActions({ key: "backgroundEnabled", base: true }),
  },
  {
    id: "background-color",
    label: "背景色",
    tab: "style",
    category: "background",
    dependsOnKey: "backgroundEnabled",
    settingKeys: ["backgroundColor"],
    baseValue: backgroundColor("black"),
    actions: buildColorCycleActions({
      key: "backgroundColor",
      base: backgroundColor("black"),
      colors: BACKGROUND_COLOR_PRESETS.map((preset) => preset.value),
    }),
  },
  {
    id: "background-opacity",
    label: "背景の透過",
    tab: "style",
    category: "background",
    dependsOnKey: "backgroundEnabled",
    settingKeys: ["backgroundOpacityPercent"],
    baseValue: 62,
    actions: buildNumericSweepActions({
      key: "backgroundOpacityPercent",
      min: OPACITY_PERCENT_MIN,
      max: OPACITY_PERCENT_MAX,
      step: 1,
      base: 62,
    }),
  },
  {
    id: "background-padding",
    label: "背景の余白",
    tab: "style",
    category: "background",
    dependsOnKey: "backgroundEnabled",
    settingKeys: ["backgroundPadding"],
    baseValue: 22,
    actions: buildNumericSweepActions({ key: "backgroundPadding", min: 0, max: 64, step: 2, base: 22 }),
  },
  {
    id: "outline-enabled",
    label: "袋文字 ON/OFF",
    tab: "style",
    category: "outline",
    settingKeys: ["outlineEnabled"],
    baseValue: false,
    actions: buildToggleGachaActions({ key: "outlineEnabled", base: false }),
  },
  {
    id: "outline-color",
    label: "袋文字の色",
    tab: "style",
    category: "outline",
    dependsOnKey: "outlineEnabled",
    settingKeys: ["outlineColor"],
    baseValue: outlineColor("black"),
    actions: buildColorCycleActions({
      key: "outlineColor",
      base: outlineColor("black"),
      colors: OUTLINE_COLOR_PRESETS.map((preset) => preset.value),
    }),
  },
  {
    id: "outline-width",
    label: "袋文字の太さ",
    tab: "style",
    category: "outline",
    dependsOnKey: "outlineEnabled",
    settingKeys: ["outlineWidth"],
    baseValue: 8,
    actions: buildNumericSweepActions({ key: "outlineWidth", min: 0, max: 18, step: 1, base: 8 }),
  },
  {
    id: "shadow-enabled",
    label: "影 ON/OFF",
    tab: "style",
    category: "shadow",
    settingKeys: ["shadowEnabled"],
    baseValue: DEFAULT_RENDER_SETTINGS.shadowEnabled,
    actions: buildToggleGachaActions({
      key: "shadowEnabled",
      base: DEFAULT_RENDER_SETTINGS.shadowEnabled,
    }),
  },
  {
    id: "shadow-blur",
    label: "影の太さ",
    tab: "style",
    category: "shadow",
    dependsOnKey: "shadowEnabled",
    settingKeys: ["shadowBlur"],
    baseValue: DEFAULT_RENDER_SETTINGS.shadowBlur,
    actions: buildNumericSweepActions({
      key: "shadowBlur",
      min: 0,
      max: 28,
      step: 1,
      base: DEFAULT_RENDER_SETTINGS.shadowBlur,
    }),
  },
];

// ワークスペースのタブ単位、またはカテゴリ単位で目視チェックを絞り込めるようにするブロック定義。
// "all" は絞り込みなし（全ステップ）。
// "settings" / "style" は step.tab と一致するステップ（タブ全体）。
// "settings.*" / "style.*" は step.tab && step.category が一致するステップ（カテゴリ単位）。
// ラベルはUI側（shared/uiText.js / VisualQaFab.jsx）で表示用テキストへマッピングする。
export const VISUAL_QA_BLOCK_IDS = [
  "all",
  "settings",
  "settings.general",
  "settings.position",
  "settings.rotation",
  "style",
  "style.text",
  "style.ruby",
  "style.background",
  "style.outline",
  "style.shadow",
];

export const filterVisualQaScenarioByBlock = (scenario, blockId) => {
  if (blockId === "all" || !blockId) return scenario;
  
  // タブ全体（"settings" or "style"）
  if (blockId === "settings" || blockId === "style") {
    return scenario.filter((step) => step.tab === blockId);
  }
  
  // カテゴリ単位（"settings.general", "style.text" など）
  const [tab, category] = blockId.split(".");
  if (tab && category) {
    return scenario.filter((step) => step.tab === tab && step.category === category);
  }
  
  return scenario;
};
