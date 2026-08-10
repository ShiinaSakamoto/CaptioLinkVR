import { STYLE_FEATURES } from "../components/workspace/styleFeatures.js";
import {
  BASIC_ADJUSTABLE_SETTING_KEYS,
  STANDALONE_STYLE_SETTING_KEYS,
} from "./visualQaSettingKeys.js";

// VR設定タブで初期化するキー（高度な設定含む）。
export const VR_SETTINGS_RESET_KEYS = [
  ...BASIC_ADJUSTABLE_SETTING_KEYS,
  "overlayMaxFps",
  "vrchatChatboxEnabled",
];

// 字幕スタイルタブで初期化するキー。
export const STYLE_SETTINGS_RESET_KEYS = [
  ...STANDALONE_STYLE_SETTING_KEYS,
  ...STYLE_FEATURES.flatMap((feature) => [
    feature.enabledKey,
    ...feature.fields.map((field) => field.key),
  ]),
  // UI未表示だがスタイル系として一緒に戻す。
  "shadowColor",
];
