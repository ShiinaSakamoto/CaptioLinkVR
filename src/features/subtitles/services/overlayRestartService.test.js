import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockProactiveRestartOverlay = vi.fn();
const mockSendOverlayTextFrame = vi.fn().mockResolvedValue("key");

vi.mock("../../steamvrOverlay/steamVrOverlayApi.js", () => ({
  proactiveRestartOverlay: (...args) => mockProactiveRestartOverlay(...args),
}));

vi.mock("./overlayFrameService.js", () => ({
  sendOverlayTextFrame: (...args) => mockSendOverlayTextFrame(...args),
}));

const settings = {
  width: 1024,
  height: 256,
  overlayWidthMeters: 1.45,
  fontSize: 96,
  fontSizePercent: 100,
};

describe("overlayRestartService", () => {
  beforeEach(() => {
    vi.resetModules();
    mockProactiveRestartOverlay.mockReset();
    mockSendOverlayTextFrame.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolveMinFramesは再生中50・停止中150・force時は0", async () => {
    const { resolveMinFrames, MIN_FRAMES_PLAYING, MIN_FRAMES_IDLE } = await import("./overlayRestartService.js");
    expect(resolveMinFrames({ force: true, playing: true })).toBe(0);
    expect(resolveMinFrames({ force: false, playing: true })).toBe(MIN_FRAMES_PLAYING);
    expect(resolveMinFrames({ force: false, playing: false })).toBe(MIN_FRAMES_IDLE);
    expect(MIN_FRAMES_PLAYING).toBe(50);
    expect(MIN_FRAMES_IDLE).toBe(150);
  });

  it("requestOverlayRestartは再起動成功時だけforce再送する", async () => {
    mockProactiveRestartOverlay.mockResolvedValueOnce(true);
    const { requestOverlayRestart } = await import("./overlayRestartService.js");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const restarted = await requestOverlayRestart({
      force: true,
      text: "hello",
      settings,
      reason: "字幕テスト終了",
    });
    expect(restarted).toBe(true);
    expect(mockProactiveRestartOverlay).toHaveBeenCalledWith({ force: true, minFrames: 0 });
    expect(mockSendOverlayTextFrame).toHaveBeenCalledWith({
      text: "hello",
      settings,
      force: true,
      allowFullRestart: true,
    });
    expect(logSpy).toHaveBeenCalledWith(
      "[overlay] proactive restart: 字幕テスト終了",
      expect.objectContaining({ force: true, minFrames: 0 }),
    );
    logSpy.mockRestore();
  });

  it("requestOverlayRestartは再起動しなければ再送しない", async () => {
    mockProactiveRestartOverlay.mockResolvedValueOnce(false);
    const { requestOverlayRestart } = await import("./overlayRestartService.js");
    const restarted = await requestOverlayRestart({
      force: false,
      playing: true,
      text: "hello",
      settings,
    });
    expect(restarted).toBe(false);
    expect(mockProactiveRestartOverlay).toHaveBeenCalledWith({ force: false, minFrames: 50 });
    expect(mockSendOverlayTextFrame).not.toHaveBeenCalled();
  });

  it("isCriticalOverlayRestartWindowは残り3秒未満と本編開始2秒未満を検出する", async () => {
    const { isCriticalOverlayRestartWindow } = await import("./overlayRestartService.js");
    expect(isCriticalOverlayRestartWindow({ remainingSeconds: 2 })).toBe(true);
    expect(isCriticalOverlayRestartWindow({ remainingSeconds: 3 })).toBe(false);
    expect(isCriticalOverlayRestartWindow({ remainingSeconds: 0 })).toBe(false);
    expect(isCriticalOverlayRestartWindow({ mainElapsedMs: 1999 })).toBe(true);
    expect(isCriticalOverlayRestartWindow({ mainElapsedMs: 2000 })).toBe(false);
  });
});
