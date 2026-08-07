import {
  BACKGROUND_COLOR_PRESETS,
  OUTLINE_COLOR_PRESETS,
} from "../../constants/styleColorPresets.js";
import { DEFAULT_RENDER_SETTINGS } from "../../constants/defaultRenderSettings.js";
import { OPACITY_PERCENT_MAX, OPACITY_PERCENT_MIN } from "../../utils/subtitleOpacity.js";
import { ui } from "../../../../shared/uiText.js";

// スタイルタブの機能一覧（色・余白・輪郭など）。表示ロジックは StyleSettingsPanel 側。
export const STYLE_FEATURES = [
  {
    id: "ruby",
    title: ui.ruby,
    enabledKey: "rubyEnabled",
    fields: [
      {
        type: "step",
        key: "rubyDistance",
        label: ui.rubyDistanceLabel,
        min: "0",
        max: "50",
        step: "1",
        reset: DEFAULT_RENDER_SETTINGS.rubyDistance,
        tooltipKey: "style-ruby-distance",
      },
    ],
  },
  {
    id: "background",
    title: ui.background,
    enabledKey: "backgroundEnabled",
    fields: [
      {
        type: "color",
        key: "backgroundColor",
        label: ui.backgroundColorLabel,
        presets: BACKGROUND_COLOR_PRESETS,
        presetKindLabel: ui.backgroundColorKind,
      },
      {
        type: "step",
        key: "backgroundOpacityPercent",
        label: ui.backgroundOpacityPercentLabel,
        description: ui.backgroundOpacityPercentDescription,
        min: String(OPACITY_PERCENT_MIN),
        max: String(OPACITY_PERCENT_MAX),
        step: "1",
        reset: DEFAULT_RENDER_SETTINGS.backgroundOpacityPercent,
        tooltipKey: "style-background-opacity",
      },
      {
        type: "step",
        key: "backgroundPadding",
        label: ui.backgroundPaddingLabel,
        min: "0",
        max: "64",
        step: "2",
        reset: DEFAULT_RENDER_SETTINGS.backgroundPadding,
        tooltipKey: "style-background-padding",
      },
    ],
  },
  {
    id: "outline",
    title: ui.outline,
    enabledKey: "outlineEnabled",
    fields: [
      {
        type: "color",
        key: "outlineColor",
        label: ui.outlineColorLabel,
        presets: OUTLINE_COLOR_PRESETS,
        presetKindLabel: ui.outlineColorKind,
      },
      {
        type: "step",
        key: "outlineWidth",
        label: ui.outlineWidthLabel,
        min: "0",
        max: "18",
        step: "1",
        reset: DEFAULT_RENDER_SETTINGS.outlineWidth,
        tooltipKey: "style-outline-width",
      },
    ],
  },
  {
    id: "shadow",
    title: ui.shadow,
    enabledKey: "shadowEnabled",
    fields: [
      {
        type: "step",
        key: "shadowBlur",
        label: ui.shadowBlurLabel,
        min: "0",
        max: "28",
        step: "1",
        reset: DEFAULT_RENDER_SETTINGS.shadowBlur,
        tooltipKey: "style-shadow-blur",
      },
    ],
  },
];
