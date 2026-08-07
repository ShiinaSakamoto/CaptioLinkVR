import { describe, expect, it } from "vitest";
import { hexToRgba } from "./color.js";

describe("hexToRgba", () => {
  it("#付き16進とアルファからrgba文字列を作る", () => {
    expect(hexToRgba("#ffffff", 1)).toBe("rgba(255, 255, 255, 1)");
  });

  it("#なしの16進でも変換できる", () => {
    expect(hexToRgba("000000", 0.5)).toBe("rgba(0, 0, 0, 0.5)");
  });

  it("任意のアルファ値をそのまま埋め込む", () => {
    expect(hexToRgba("#9ca6e6", 0.62)).toBe("rgba(156, 166, 230, 0.62)");
  });
});
