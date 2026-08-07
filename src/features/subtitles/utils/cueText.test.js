import { describe, expect, it } from "vitest";
import { buildCueText } from "./cueText.js";

describe("buildCueText", () => {
  it("話者名があれば角括弧付きで本文の前に付ける", () => {
    expect(buildCueText({ actor: "アリス", text: "こんにちは" })).toBe("[アリス] こんにちは");
  });

  it("話者名が空文字なら本文だけを返す", () => {
    expect(buildCueText({ actor: "", text: "こんにちは" })).toBe("こんにちは");
  });

  it("話者名が未定義でも本文だけを返す", () => {
    expect(buildCueText({ text: "こんにちは" })).toBe("こんにちは");
  });
});
