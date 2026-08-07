import { invoke } from "@tauri-apps/api/core";

// overlayWidthMeters が「このpxのとき」の設計値になる参照。DEFAULT_RENDER_SETTINGS.fontSize とは別。
const OVERLAY_WIDTH_FONT_SIZE_REF = 96;

// 文字サイズ変更をVR内の物理幅にも反映する。
const getEffectiveOverlayWidthMeters = (settings) => {
  const baseScale = Math.max(0.1, Number(settings.fontSize || OVERLAY_WIDTH_FONT_SIZE_REF) / OVERLAY_WIDTH_FONT_SIZE_REF);
  const percentScale = Math.max(0.1, Number(settings.fontSizePercent ?? 100) / 100);
  return settings.overlayWidthMeters * baseScale * percentScale;
};

export const initializeSteamVrOverlay = async (settings) => {
  return invoke("initialize_overlay", {
    width: settings.width,
    height: settings.height,
    widthMeters: getEffectiveOverlayWidthMeters(settings),
    positionX: settings.positionX,
    positionY: settings.positionY,
    positionZ: settings.positionZ,
    rotationX: settings.rotationX,
    rotationY: settings.rotationY,
    rotationZ: settings.rotationZ,
  });
};

// 物理幅は submit_overlay_text_frame がテクスチャ実寸に合わせる（ここでは上書きしない）。
export const updateSteamVrOverlayLayout = async (settings) => {
  return invoke("update_overlay_layout", {
    width: settings.width,
    height: settings.height,
    widthMeters: getEffectiveOverlayWidthMeters(settings),
    positionX: settings.positionX,
    positionY: settings.positionY,
    positionZ: settings.positionZ,
    rotationX: settings.rotationX,
    rotationY: settings.rotationY,
    rotationZ: settings.rotationZ,
  });
};

export const setSteamVrOverlayVisible = async (visible) => {
  return invoke("set_overlay_visible", { visible });
};

export const sendSteamVrOverlayTextFrame = async ({
  text,
  settings,
  sequence,
  allowFullRestart = true,
}) => {
  return invoke("submit_overlay_text_frame", {
    text,
    settings,
    sequence,
    allowFullRestart,
  });
};

/** 予防的な OpenVR 再起動。閾値未満なら false。 */
export const proactiveRestartOverlay = async ({ force = false, minFrames = 0 } = {}) => {
  return invoke("proactive_restart_overlay", {
    force,
    minFrames,
  });
};

export const checkSteamVrRunning = async () => {
  return invoke("check_steamvr_running");
};
