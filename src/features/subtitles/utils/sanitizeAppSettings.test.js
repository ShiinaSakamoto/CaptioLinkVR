import { describe, expect, it } from "vitest";
import { DEFAULT_RENDER_SETTINGS } from "../constants/defaultRenderSettings.js";
import { playbackModes } from "../../../stores/subtitleStore.js";
import {
  labelsForResetKeys,
  sanitizePlaybackSettings,
  sanitizeRenderSettings,
} from "./sanitizeAppSettings.js";

describe("sanitizeRenderSettings", () => {
  it("正常値はそのまま通す", () => {
    const { settings, resetKeys } = sanitizeRenderSettings({
      fontSizePercent: 120,
      backgroundOpacityPercent: 90,
      textColor: "#abcdef",
    });
    expect(settings.fontSizePercent).toBe(120);
    expect(settings.backgroundOpacityPercent).toBe(90);
    expect(settings.textColor).toBe("#abcdef");
    expect(resetKeys).toEqual([]);
  });

  it("欠落はエラーにせず初期値を使う", () => {
    const { settings, resetKeys } = sanitizeRenderSettings({});
    expect(settings).toEqual(DEFAULT_RENDER_SETTINGS);
    expect(resetKeys).toEqual([]);
  });

  it("範囲外・不正値は初期値へ戻してキーを返す", () => {
    const { settings, resetKeys } = sanitizeRenderSettings({
      fontSizePercent: 500,
      backgroundOpacityPercent: 5,
      textColor: "red",
      renderScale: 9,
    });
    expect(settings.fontSizePercent).toBe(DEFAULT_RENDER_SETTINGS.fontSizePercent);
    expect(settings.backgroundOpacityPercent).toBe(DEFAULT_RENDER_SETTINGS.backgroundOpacityPercent);
    expect(settings.textColor).toBe(DEFAULT_RENDER_SETTINGS.textColor);
    expect(settings.renderScale).toBe(DEFAULT_RENDER_SETTINGS.renderScale);
    expect(resetKeys).toEqual(
      expect.arrayContaining(["fontSizePercent", "backgroundOpacityPercent", "textColor", "renderScale"]),
    );
  });

  it("旧形式の変換はせず、想定外の fontSize は初期値へ戻す", () => {
    const { settings, resetKeys } = sanitizeRenderSettings({
      fontSize: 96,
      fontSizePercent: 100,
    });
    expect(settings.fontSize).toBe(DEFAULT_RENDER_SETTINGS.fontSize);
    expect(settings.fontSizePercent).toBe(100);
    expect(resetKeys).toContain("fontSize");
  });
});

describe("sanitizePlaybackSettings", () => {
  it("正常値はそのまま通す", () => {
    const { settings, resetKeys } = sanitizePlaybackSettings({
      mode: playbackModes.absolute,
      countdownSeconds: 30,
      targetTime: "8:5",
    });
    expect(settings).toEqual({
      mode: playbackModes.absolute,
      countdownSeconds: 30,
      targetTime: "08:05",
    });
    expect(resetKeys).toEqual([]);
  });

  it("不正値は初期値へ戻してキーを返す", () => {
    const { settings, resetKeys } = sanitizePlaybackSettings({
      mode: "nope",
      countdownSeconds: 7,
      targetTime: "24:00",
    });
    expect(settings.mode).toBe("countdown");
    expect(settings.countdownSeconds).toBe(10);
    expect(settings.targetTime).toBe("23:00");
    expect(resetKeys).toEqual(expect.arrayContaining(["mode", "countdownSeconds", "targetTime"]));
  });
});

describe("labelsForResetKeys", () => {
  it("分かるキーだけ日本語ラベルにする", () => {
    expect(labelsForResetKeys(["fontSizePercent", "unknown", "mode"])).toEqual([
      "字幕サイズ",
      "カウントダウンモード",
    ]);
  });
});
