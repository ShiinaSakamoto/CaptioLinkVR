import { describe, expect, it } from "vitest";
import {
  OPACITY_PERCENT_MAX,
  OPACITY_PERCENT_MIN,
  normalizeBackgroundOpacityPercent,
  normalizeTextOpacityPercent,
} from "./subtitleOpacity.js";

describe("OPACITY_PERCENT_MIN / MAX", () => {
  it("下限10・上限100を保つ", () => {
    expect(OPACITY_PERCENT_MIN).toBe(10);
    expect(OPACITY_PERCENT_MAX).toBe(100);
  });
});

describe("normalizeTextOpacityPercent", () => {
  it("範囲内はそのまま（四捨五入して）返す", () => {
    expect(normalizeTextOpacityPercent(55.4)).toBe(55);
  });

  it("下限未満は下限へクランプする", () => {
    expect(normalizeTextOpacityPercent(0)).toBe(OPACITY_PERCENT_MIN);
    expect(normalizeTextOpacityPercent(9)).toBe(OPACITY_PERCENT_MIN);
  });

  it("上限超過は上限へクランプする", () => {
    expect(normalizeTextOpacityPercent(150)).toBe(OPACITY_PERCENT_MAX);
  });

  it("非数値はデフォルト100を返す", () => {
    expect(normalizeTextOpacityPercent(NaN)).toBe(100);
    expect(normalizeTextOpacityPercent(undefined)).toBe(100);
  });
});

describe("normalizeBackgroundOpacityPercent", () => {
  it("非数値のときは既定の62を返す", () => {
    expect(normalizeBackgroundOpacityPercent(undefined)).toBe(62);
  });

  it("下限未満は下限へクランプする", () => {
    expect(normalizeBackgroundOpacityPercent(5)).toBe(OPACITY_PERCENT_MIN);
  });

  it("上限超過は上限へクランプする", () => {
    expect(normalizeBackgroundOpacityPercent(200)).toBe(OPACITY_PERCENT_MAX);
  });
});
