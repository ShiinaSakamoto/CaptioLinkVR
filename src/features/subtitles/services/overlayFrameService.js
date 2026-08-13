import { sendSteamVrOverlayTextFrame } from "../../steamvrOverlay/steamVrOverlayApi.js";
import { isOverlayFullRestartAllowed } from "./overlayRestartPolicy.js";

let lastSentKey = "";
let overlaySendSequence = 0;

// フレーム画像の見た目に関係する設定だけを抜き出し、送信重複判定を安定させる。
export const getFrameSettings = (settings) => ({
  width: settings.width,
  height: settings.height,
  overlayWidthMeters: settings.overlayWidthMeters,
  fontSize: settings.fontSize,
  fontSizePercent: settings.fontSizePercent,
  wrapWidthPercent: settings.wrapWidthPercent,
  rubyEnabled: settings.rubyEnabled,
  rubyDistance: settings.rubyDistance,
  textOffsetX: settings.textOffsetX,
  textOffsetY: settings.textOffsetY,
  autoTextureSize: settings.autoTextureSize,
  maxTextureWidth: settings.maxTextureWidth,
  maxTextureHeight: settings.maxTextureHeight,
  renderScale: settings.renderScale,
  // 距離連動の実レンダースケール用（姿勢更新時も再描画する）
  positionX: settings.positionX,
  positionY: settings.positionY,
  positionZ: settings.positionZ,
  textColor: settings.textColor,
  textOpacityPercent: settings.textOpacityPercent,
  backgroundEnabled: settings.backgroundEnabled,
  backgroundColor: settings.backgroundColor,
  backgroundOpacityPercent: settings.backgroundOpacityPercent,
  backgroundPadding: settings.backgroundPadding,
  outlineEnabled: settings.outlineEnabled,
  outlineColor: settings.outlineColor,
  outlineWidth: settings.outlineWidth,
  shadowEnabled: settings.shadowEnabled,
  shadowColor: settings.shadowColor,
  shadowBlur: settings.shadowBlur,
});

// OpenVR側の初回テクスチャ確保を、Rust生成の透明1pxで済ませる。
export const prewarmOverlayFrame = async (settings) => {
  const sequence = nextOverlaySendSequence();
  await sendSteamVrOverlayTextFrame({
    text: "",
    settings: getFrameSettings(settings),
    sequence,
  });
  lastSentKey = "__transparent_1px__";
  return lastSentKey;
};

// 表示したい文字と設定だけをRustへ送り、Canvas/getImageData/大容量IPCを避ける。
export const sendOverlayTextFrame = async ({
  text,
  settings,
  force = false,
  allowFullRestart,
} = {}) => {
  const frameSettings = getFrameSettings(settings);
  const key = `${text}\n${JSON.stringify(frameSettings)}`;
  if (!force && key === lastSentKey) {
    return key;
  }
  const sequence = nextOverlaySendSequence();
  // await 前に予約する。そうしないと stop("") と activate(text) が並走したとき、
  // text 側が「まだ前回の text」と見てスキップし、空送信だけが残る。
  lastSentKey = key;
  await sendSteamVrOverlayTextFrame({
    text,
    settings: frameSettings,
    sequence,
    allowFullRestart: allowFullRestart ?? isOverlayFullRestartAllowed(),
  });
  return key;
};

const nextOverlaySendSequence = () => {
  overlaySendSequence += 1;
  return overlaySendSequence;
};

// 直近送信済みのキーを返し、同じフレームの連続送信を避ける。
export const getLastSentOverlayFrameKey = () => lastSentKey;
