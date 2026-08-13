import { describe, expect, it } from "vitest";
import {
  buildWrapUnits,
  isBreakAfterChar,
  wrapMeasuredUnits,
  wrapPreviewText,
} from "./previewTextWrap.js";

const fixedWidth = (px) => () => px;

describe("previewTextWrap kinsoku helpers", () => {
  it("句読点の直後を優先切れ目とみなす", () => {
    expect(isBreakAfterChar("、")).toBe(true);
    expect(isBreakAfterChar("。")).toBe(true);
    expect(isBreakAfterChar("あ")).toBe(false);
  });
});

describe("wrapMeasuredUnits", () => {
  const chars = (text, widthEach) =>
    [...text].map((ch) => ({ type: "char", ch, width: widthEach, source: ch }));

  it("読点の後で折り返す", () => {
    const units = chars("あいうえ、かき", 10);
    const lines = wrapMeasuredUnits(units, 45);
    expect(lines).toHaveLength(2);
    expect(lines[0].map((u) => u.source).join("")).toBe("あいうえ、");
  });

  it("ルビ境界より読点を優先する", () => {
    const units = [
      ...chars("長文でも読みやすい幅に収まるように、折り返し幅を", 10),
      {
        type: "ruby",
        width: 40,
        source: "{調節|ちょうせつ}",
      },
      ...chars("してください。", 10),
    ];
    const lines = wrapMeasuredUnits(units, 280);
    expect(lines[0].map((u) => u.source).join("")).toBe("長文でも読みやすい幅に収まるように、");
  });
});

describe("wrapPreviewText", () => {
  it("ルビトークンを壊さず改行を挿入する", () => {
    const text = "表示を{調節|ちょうせつ}してください。";
    // 各文字/ルビを幅10相当にし、途中で折り返す
    const measureString = (value) => {
      const s = String(value);
      if (s === "調節" || s === "ちょうせつ") return 20;
      return s.length * 10;
    };
    const wrapped = wrapPreviewText(text, {
      rubyEnabled: true,
      wrapWidthPx: 50,
      measureString,
    });
    expect(wrapped).toContain("{調節|ちょうせつ}");
    expect(wrapped.includes("\n")).toBe(true);
  });

  it("明示改行は維持する", () => {
    const wrapped = wrapPreviewText("あ\nい", {
      rubyEnabled: true,
      wrapWidthPx: 1000,
      measureString: fixedWidth(10),
    });
    expect(wrapped).toBe("あ\nい");
  });

  it("buildWrapUnits は ruby を1単位にする", () => {
    const units = buildWrapUnits("a{調|ちょう}b", true, (s) => String(s).length * 10);
    expect(units.some((u) => u.type === "ruby" && u.source === "{調|ちょう}")).toBe(true);
  });
});
