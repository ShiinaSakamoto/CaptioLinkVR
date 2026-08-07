import { describe, expect, it } from "vitest";
import { DEFAULT_RENDER_SETTINGS } from "../constants/defaultRenderSettings.js";
import { normalizeRenderSettings } from "./renderSettingsMigration.js";

const baseCurrent = {
  ...DEFAULT_RENDER_SETTINGS,
};

describe("normalizeRenderSettings", () => {
  it("fontSizeは現行基準へ正規化し、実効pxをfontSizePercentへ折り込む", () => {
    // 旧 96×50% = 48px → 現行53基準では約91%
    const result = normalizeRenderSettings({ fontSize: 96, fontSizePercent: 50 }, baseCurrent);
    expect(result.fontSize).toBe(53);
    expect(result.fontSizePercent).toBe(91);
  });

  it("旧デフォルト見た目（96×55%）は現行100%へ移行する", () => {
    const result = normalizeRenderSettings({ fontSize: 96, fontSizePercent: 55 }, baseCurrent);
    expect(result.fontSize).toBe(53);
    expect(result.fontSizePercent).toBe(100);
  });

  it("現行形式（53×%）は再読み込みしても同じ%を保つ", () => {
    const result = normalizeRenderSettings({ fontSize: 53, fontSizePercent: 120 }, baseCurrent);
    expect(result.fontSize).toBe(53);
    expect(result.fontSizePercent).toBe(120);
  });

  it("fontSizeが無い場合はfontSizePercentをそのまま引き継ぐ", () => {
    const result = normalizeRenderSettings({ fontSizePercent: 150 }, baseCurrent);
    expect(result.fontSizePercent).toBe(150);
  });

  it("fontSizePercentは50〜200にクランプする", () => {
    expect(normalizeRenderSettings({ fontSizePercent: 500 }, baseCurrent).fontSizePercent).toBe(200);
    expect(normalizeRenderSettings({ fontSizePercent: 1 }, baseCurrent).fontSizePercent).toBe(50);
  });

  it("rubyDistanceが保存済みならそのまま使う", () => {
    expect(normalizeRenderSettings({ rubyDistance: 25 }, baseCurrent).rubyDistance).toBe(25);
  });

  it("旧rubyOffsetYからrubyDistanceへ反転変換する", () => {
    // 旧: 大きいほど近い（基準10）→ 新: 大きいほど遠い
    expect(normalizeRenderSettings({ rubyOffsetY: 4 }, baseCurrent).rubyDistance).toBe(6);
  });

  it("どちらも無ければデフォルト6", () => {
    expect(normalizeRenderSettings({}, baseCurrent).rubyDistance).toBe(6);
  });

  it("textOpacityPercentが保存済みなら10〜100にクランプして使う", () => {
    expect(normalizeRenderSettings({ textOpacityPercent: 5 }, baseCurrent).textOpacityPercent).toBe(10);
  });

  it("textOpacityPercentが無ければデフォルト100", () => {
    expect(normalizeRenderSettings({}, baseCurrent).textOpacityPercent).toBe(100);
  });

  it("backgroundOpacityPercentが保存済みならそれを使う", () => {
    expect(normalizeRenderSettings({ backgroundOpacityPercent: 80 }, baseCurrent).backgroundOpacityPercent).toBe(80);
  });

  it("旧backgroundOpacity(0-1)から%へ変換する", () => {
    expect(normalizeRenderSettings({ backgroundOpacity: 0.3 }, baseCurrent).backgroundOpacityPercent).toBe(30);
  });

  it("どちらも無ければデフォルト62", () => {
    expect(normalizeRenderSettings({}, baseCurrent).backgroundOpacityPercent).toBe(62);
  });

  it("旧デフォルトの2048幅はそのまま新デフォルト4096へ引き上げる", () => {
    expect(normalizeRenderSettings({ maxTextureWidth: 2048 }, baseCurrent).maxTextureWidth).toBe(4096);
  });

  it("旧デフォルト以外のカスタム幅は範囲内でそのまま保つ", () => {
    expect(normalizeRenderSettings({ maxTextureWidth: 3000 }, baseCurrent).maxTextureWidth).toBe(3000);
  });

  it("旧デフォルトの1024高はそのまま新デフォルト2048へ引き上げる", () => {
    expect(normalizeRenderSettings({ maxTextureHeight: 1024 }, baseCurrent).maxTextureHeight).toBe(2048);
  });
});
