import { describe, expect, it } from "vitest";
import { resolveRubyLinePositions } from "./rubyVisualLines.js";

describe("resolveRubyLinePositions", () => {
  it("1行だけならすべて over", () => {
    expect(resolveRubyLinePositions([10, 10], [10])).toEqual(["over", "over"]);
  });

  it("最終行のルビだけ under", () => {
    expect(resolveRubyLinePositions([10, 34, 58], [10, 34, 58])).toEqual([
      "over",
      "over",
      "under",
    ]);
  });

  it("最終行にルビが無ければすべて over", () => {
    expect(resolveRubyLinePositions([10, 34], [10, 34, 58])).toEqual(["over", "over"]);
  });

  it("許容誤差内なら同一行とみなす", () => {
    expect(resolveRubyLinePositions([57], [10, 34, 58], 3)).toEqual(["under"]);
  });
});
