import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// lastSentKey / overlaySendSequence はモジュール内のミュータブルな状態なので、
// テストごとに vi.resetModules() で新しいモジュールインスタンスに差し替えて隔離する。
const mockSendSteamVrOverlayTextFrame = vi.fn().mockResolvedValue(undefined);

vi.mock("../../steamvrOverlay/steamVrOverlayApi.js", () => ({
  sendSteamVrOverlayTextFrame: (...args) => mockSendSteamVrOverlayTextFrame(...args),
}));

const settings = {
  width: 1024,
  height: 256,
  overlayWidthMeters: 1.45,
  fontSize: 96,
  fontSizePercent: 100,
  wrapWidthPercent: 55,
  rubyEnabled: true,
  rubyDistance: 10,
  textOffsetX: 0,
  textOffsetY: 0,
  autoTextureSize: true,
  maxTextureWidth: 4096,
  maxTextureHeight: 4096,
  renderScale: 1,
  positionX: 0,
  positionY: -0.35,
  positionZ: -1.2,
  textColor: "#ffffff",
  textOpacityPercent: 100,
  backgroundEnabled: true,
  backgroundColor: "#000000",
  backgroundOpacityPercent: 90,
  backgroundPadding: 22,
  outlineEnabled: false,
  outlineColor: "#000000",
  outlineWidth: 8,
  shadowEnabled: true,
  shadowColor: "#000000",
  shadowBlur: 10,
  // 見た目に無関係な項目も混ぜて、getFrameSettingsが必要なキーだけ抜き出すことを確認する
  overlayMaxFps: 30,
  vrchatChatboxEnabled: false,
};

describe("overlayFrameService", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSendSteamVrOverlayTextFrame.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getFrameSettingsは見た目に関わるキーだけを抜き出す", async () => {
    const { getFrameSettings } = await import("./overlayFrameService.js");
    const frameSettings = getFrameSettings(settings);
    expect(frameSettings).not.toHaveProperty("overlayMaxFps");
    expect(frameSettings).not.toHaveProperty("vrchatChatboxEnabled");
    expect(frameSettings).toMatchObject({
      width: 1024,
      textColor: "#ffffff",
      backgroundOpacityPercent: 90,
    });
  });

  it("同一内容の連続送信はスキップする（force未指定）", async () => {
    const { sendOverlayTextFrame } = await import("./overlayFrameService.js");
    await sendOverlayTextFrame({ text: "こんにちは", settings });
    await sendOverlayTextFrame({ text: "こんにちは", settings });
    expect(mockSendSteamVrOverlayTextFrame).toHaveBeenCalledTimes(1);
  });

  it("textまたはsettingsが変われば再送する", async () => {
    const { sendOverlayTextFrame } = await import("./overlayFrameService.js");
    await sendOverlayTextFrame({ text: "こんにちは", settings });
    await sendOverlayTextFrame({ text: "さようなら", settings });
    expect(mockSendSteamVrOverlayTextFrame).toHaveBeenCalledTimes(2);
  });

  it("force指定時は同一内容でも再送する", async () => {
    const { sendOverlayTextFrame } = await import("./overlayFrameService.js");
    await sendOverlayTextFrame({ text: "こんにちは", settings });
    await sendOverlayTextFrame({ text: "こんにちは", settings, force: true });
    expect(mockSendSteamVrOverlayTextFrame).toHaveBeenCalledTimes(2);
  });

  it("allowFullRestartを指定しなければ既定trueで送る", async () => {
    const { sendOverlayTextFrame } = await import("./overlayFrameService.js");
    await sendOverlayTextFrame({ text: "こんにちは", settings });
    expect(mockSendSteamVrOverlayTextFrame).toHaveBeenCalledWith(
      expect.objectContaining({ allowFullRestart: true }),
    );
  });

  it("allowFullRestart=falseをそのまま渡す", async () => {
    const { sendOverlayTextFrame } = await import("./overlayFrameService.js");
    await sendOverlayTextFrame({ text: "こんにちは", settings, allowFullRestart: false });
    expect(mockSendSteamVrOverlayTextFrame).toHaveBeenCalledWith(
      expect.objectContaining({ allowFullRestart: false }),
    );
  });

  it("送信のたびにsequenceを1ずつ増やす", async () => {
    const { sendOverlayTextFrame } = await import("./overlayFrameService.js");
    await sendOverlayTextFrame({ text: "A", settings });
    await sendOverlayTextFrame({ text: "B", settings });
    const sequences = mockSendSteamVrOverlayTextFrame.mock.calls.map((call) => call[0].sequence);
    expect(sequences[1]).toBe(sequences[0] + 1);
  });

  it("getLastSentOverlayFrameKeyは直近送信キーを返す", async () => {
    const { sendOverlayTextFrame, getLastSentOverlayFrameKey } = await import("./overlayFrameService.js");
    const key = await sendOverlayTextFrame({ text: "こんにちは", settings });
    expect(getLastSentOverlayFrameKey()).toBe(key);
  });

  it("prewarmOverlayFrameは空文字を送信し、以後の同一送信判定に影響しない", async () => {
    const { prewarmOverlayFrame, sendOverlayTextFrame } = await import("./overlayFrameService.js");
    await prewarmOverlayFrame(settings);
    expect(mockSendSteamVrOverlayTextFrame).toHaveBeenCalledWith(
      expect.objectContaining({ text: "" }),
    );
    await sendOverlayTextFrame({ text: "こんにちは", settings });
    expect(mockSendSteamVrOverlayTextFrame).toHaveBeenCalledTimes(2);
  });
});
