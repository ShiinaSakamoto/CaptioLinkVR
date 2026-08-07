import { describe, expect, it } from "vitest";
import { isRubyTokenBody, parseRubyText } from "./rubyText.js";

describe("isRubyTokenBody", () => {
  it("base|ruby の形なら true", () => {
    expect(isRubyTokenBody("位置|いち")).toBe(true);
  });

  it("区切りが先頭・末尾にあるものは false", () => {
    expect(isRubyTokenBody("|いち")).toBe(false);
    expect(isRubyTokenBody("位置|")).toBe(false);
  });

  it("バックスラッシュを含む（ASSタグ想定）ものは false", () => {
    expect(isRubyTokenBody("\\b1")).toBe(false);
  });

  it("区切りが無いものは false", () => {
    expect(isRubyTokenBody("普通のテキスト")).toBe(false);
  });
});

describe("parseRubyText", () => {
  it("装飾のないテキストはそのまま1つのtextパートになる", () => {
    expect(parseRubyText("こんにちは", true)).toEqual([{ type: "text", text: "こんにちは" }]);
  });

  it("ルビ有効時は{base|ruby}をrubyパートへ変換する", () => {
    expect(parseRubyText("{位置|いち}を確認", true)).toEqual([
      { type: "ruby", base: "位置", ruby: "いち" },
      { type: "text", text: "を確認" },
    ]);
  });

  it("ルビ無効時はbaseだけのtextパートになる", () => {
    expect(parseRubyText("{位置|いち}を確認", false)).toEqual([
      { type: "text", text: "位置" },
      { type: "text", text: "を確認" },
    ]);
  });

  it("ルビ形式でない{}はそのままテキストとして残す", () => {
    expect(parseRubyText("{普通の中括弧}です", true)).toEqual([
      { type: "text", text: "{普通の中括弧}" },
      { type: "text", text: "です" },
    ]);
  });

  it("閉じ括弧がない場合は残り全体をtextにする", () => {
    expect(parseRubyText("前{未閉じ", true)).toEqual([
      { type: "text", text: "前" },
      { type: "text", text: "{未閉じ" },
    ]);
  });

  it("先頭がルビトークンでも前置textを追加しない", () => {
    expect(parseRubyText("{位置|いち}", true)).toEqual([{ type: "ruby", base: "位置", ruby: "いち" }]);
  });

  it("複数のルビトークンを順番に処理する", () => {
    expect(parseRubyText("{位置|いち}と{文字|もじ}", true)).toEqual([
      { type: "ruby", base: "位置", ruby: "いち" },
      { type: "text", text: "と" },
      { type: "ruby", base: "文字", ruby: "もじ" },
    ]);
  });
});
