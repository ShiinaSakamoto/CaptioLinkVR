import { STYLE_FEATURES } from "../components/workspace/styleFeatures.js";

// StyleSettingsPanel の冒頭にある、STYLE_FEATURES に含まれない単独フィールド。
export const STANDALONE_STYLE_SETTING_KEYS = ["textColor", "textOpacityPercent"];

// BasicSettingsPanel（VR設定タブ）の調整可能なキー。位置・回転はUI側で符号反転して
// 見せているが、Visual QAは元の renderSettingsAtom のキーを直接動かせばよい。
export const BASIC_ADJUSTABLE_SETTING_KEYS = [
  "fontSizePercent",
  "renderScale",
  "positionX",
  "positionY",
  "positionZ",
  "rotationX",
  "rotationY",
  "rotationZ",
];

// 見た目（描画結果）に影響しないため、Visual QAシナリオの対象外にしている設定。
// ここへ追加する際は、対象外にする理由を必ずコメントで残すこと。
export const VISUAL_QA_EXCLUDED_SETTING_KEYS = [
  "overlayMaxFps", // 更新頻度のみを変え、静止フレームの見た目自体は変えない
  "vrchatChatboxEnabled", // VRChat連携のON/OFFで字幕オーバーレイの見た目は変わらない
  "showDesktopPreview", // デスクトッププレビューの表示可否であり、字幕自体の見た目ではない
  "autoTextureSize", // テクスチャサイズの自動計算方針であり、見た目のスタイルではない
];

const styleFeatureSettingKeys = STYLE_FEATURES.flatMap((feature) => [
  feature.enabledKey,
  ...feature.fields.map((field) => field.key),
]);

// 「見た目に関わる調整可能な設定キー」の正本一覧。
//
// 新しいスライダー/トグルを styleFeatures.js に追加した場合は、この一覧へ自動的に含まれる。
// BasicSettingsPanel や StyleSettingsPanel 直下に新しい単独フィールドを追加した場合は、
// BASIC_ADJUSTABLE_SETTING_KEYS または STANDALONE_STYLE_SETTING_KEYS へ手動で追加する。
//
// この一覧は visualQaScenario.test.js の「全設定キーがQAシナリオでカバーされているか」テストの
// 基準になっている。見た目に無関係で除外したい場合は VISUAL_QA_EXCLUDED_SETTING_KEYS へ理由付きで追加する。
export const ALL_VISUAL_SETTING_KEYS = Array.from(
  new Set([...styleFeatureSettingKeys, ...STANDALONE_STYLE_SETTING_KEYS, ...BASIC_ADJUSTABLE_SETTING_KEYS]),
);
