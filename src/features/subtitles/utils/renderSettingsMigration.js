import {
  normalizeBackgroundOpacityPercent,
  normalizeTextOpacityPercent,
} from "./subtitleOpacity.js";
import { DEFAULT_RENDER_SETTINGS } from "../constants/defaultRenderSettings.js";

const FONT_SIZE_BASE = DEFAULT_RENDER_SETTINGS.fontSize;
// 旧 rubyOffsetY からの変換に使う当時の基準値（現行デフォルトとは別に固定）。
const LEGACY_RUBY_OFFSET_BASE = 10;
const RUBY_DISTANCE_DEFAULT = DEFAULT_RENDER_SETTINGS.rubyDistance;
const MAX_TEXTURE_WIDTH_DEFAULT = DEFAULT_RENDER_SETTINGS.maxTextureWidth;
const MAX_TEXTURE_HEIGHT_DEFAULT = DEFAULT_RENDER_SETTINGS.maxTextureHeight;
// 旧デフォルト。保存済み設定がこの値のままなら新上限へ上げる。
const LEGACY_MAX_TEXTURE_WIDTH = 2048;
const LEGACY_MAX_TEXTURE_HEIGHT = 1024;
const LEGACY_MAX_TEXTURE_HEIGHT_PRE_4096 = 2048;

const clampRubyDistance = (value) => {
  if (!Number.isFinite(value)) return RUBY_DISTANCE_DEFAULT;
  return Math.min(50, Math.max(0, Math.round(value)));
};

// 旧 rubyOffsetY（大きいほど近い）を rubyDistance（大きいほど遠い）へ変換する。
const migrateRubyDistance = (loadedRenderSettings) => {
  if (Number.isFinite(loadedRenderSettings.rubyDistance)) {
    return clampRubyDistance(loadedRenderSettings.rubyDistance);
  }
  if (Number.isFinite(loadedRenderSettings.rubyOffsetY)) {
    return clampRubyDistance(LEGACY_RUBY_OFFSET_BASE - loadedRenderSettings.rubyOffsetY);
  }
  return RUBY_DISTANCE_DEFAULT;
};

const clampFontSizePercent = (value) => {
  if (!Number.isFinite(value)) return DEFAULT_RENDER_SETTINGS.fontSizePercent;
  return Math.min(200, Math.max(50, value));
};

const migrateTextOpacityPercent = (loaded) => {
  if (Number.isFinite(loaded.textOpacityPercent)) {
    return normalizeTextOpacityPercent(loaded.textOpacityPercent);
  }
  return 100;
};

const migrateBackgroundOpacityPercent = (loaded) => {
  if (Number.isFinite(loaded.backgroundOpacityPercent)) {
    return normalizeBackgroundOpacityPercent(loaded.backgroundOpacityPercent);
  }
  if (Number.isFinite(loaded.backgroundOpacity)) {
    return normalizeBackgroundOpacityPercent(loaded.backgroundOpacity * 100);
  }
  return 62;
};

const migrateMaxTextureWidth = (value) => {
  const width = Number(value);
  if (!Number.isFinite(width) || width === LEGACY_MAX_TEXTURE_WIDTH) {
    return MAX_TEXTURE_WIDTH_DEFAULT;
  }
  return Math.min(MAX_TEXTURE_WIDTH_DEFAULT, Math.max(256, Math.round(width)));
};

const migrateMaxTextureHeight = (value) => {
  const height = Number(value);
  if (
    !Number.isFinite(height)
    || height === LEGACY_MAX_TEXTURE_HEIGHT
    || height === LEGACY_MAX_TEXTURE_HEIGHT_PRE_4096
  ) {
    return MAX_TEXTURE_HEIGHT_DEFAULT;
  }
  return Math.min(MAX_TEXTURE_HEIGHT_DEFAULT, Math.max(128, Math.round(height)));
};

// 古いfontSize/% を現行基準（fontSize=53 が100%）へ折り込み、保存済みの見た目を保つ。
// 実効px = fontSize × percent/100 を不変にし、現行 base に対する%へ変換する。
export const normalizeRenderSettings = (loadedRenderSettings, currentSettings) => {
  const nextSettings = { ...currentSettings, ...loadedRenderSettings };
  const loadedFontSize = Number(loadedRenderSettings.fontSize);
  const hasLoadedFontSize = Number.isFinite(loadedFontSize) && loadedFontSize > 0;
  const pixelBase = hasLoadedFontSize ? loadedFontSize : FONT_SIZE_BASE;
  const loadedPercent = Number(
    loadedRenderSettings.fontSizePercent ?? nextSettings.fontSizePercent ?? DEFAULT_RENDER_SETTINGS.fontSizePercent,
  );
  const effectivePx = pixelBase * (loadedPercent / 100);
  const effectivePercent = Math.round((effectivePx / FONT_SIZE_BASE) * 100);

  return {
    ...nextSettings,
    fontSize: FONT_SIZE_BASE,
    fontSizePercent: clampFontSizePercent(effectivePercent),
    rubyDistance: migrateRubyDistance(loadedRenderSettings),
    textOpacityPercent: migrateTextOpacityPercent(loadedRenderSettings),
    backgroundOpacityPercent: migrateBackgroundOpacityPercent(loadedRenderSettings),
    maxTextureWidth: migrateMaxTextureWidth(nextSettings.maxTextureWidth),
    maxTextureHeight: migrateMaxTextureHeight(nextSettings.maxTextureHeight),
  };
};
