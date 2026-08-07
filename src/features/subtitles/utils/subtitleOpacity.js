export const OPACITY_PERCENT_MIN = 10;
export const OPACITY_PERCENT_MAX = 100;

const clampPercent = (value, fallback = 100) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(OPACITY_PERCENT_MAX, Math.max(OPACITY_PERCENT_MIN, Math.round(value)));
};

/** 字幕全体の透過（10〜100%）。VR・プレビュー共通の基準。 */
export const normalizeTextOpacityPercent = (value) => clampPercent(value, 100);

/** 背景透過（10〜100%）。字幕透過を基準にした割合。 */
export const normalizeBackgroundOpacityPercent = (value) => clampPercent(value, 90);

export const calcTextOpacityFactor = (textOpacityPercent) =>
  normalizeTextOpacityPercent(textOpacityPercent) / 100;

/** 実効背景アルファ = 字幕透過 × 背景割合 */
export const calcEffectiveBackgroundOpacity = (textOpacityPercent, backgroundOpacityPercent) =>
  calcTextOpacityFactor(textOpacityPercent) * (normalizeBackgroundOpacityPercent(backgroundOpacityPercent) / 100);
