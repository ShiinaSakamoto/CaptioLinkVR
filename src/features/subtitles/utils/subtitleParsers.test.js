import { describe, expect, it } from "vitest";
import {
  formatClock,
  parseAss,
  parseAssTime,
  parseSrt,
  parseSrtTime,
  parseSubtitleFile,
} from "./subtitleParsers.js";

describe("parseSrtTime", () => {
  it("HH:MM:SS,mmm を秒へ変換する", () => {
    expect(parseSrtTime("00:01:02,500")).toBeCloseTo(62.5);
  });

  it("ミリ秒が省略気味でも桁を補って解釈する", () => {
    expect(parseSrtTime("00:00:01,5")).toBeCloseTo(1.5);
  });
});

describe("parseAssTime", () => {
  it("H:MM:SS を秒へ変換する", () => {
    expect(parseAssTime("1:02:03")).toBe(3723);
  });

  it("センチ秒付き時刻を境界判定可能な値へ変換する", () => {
    // Number("42.52") 直和だと 102.52000000000001 になり、開始境界で欠落しうる。
    expect(Math.round(parseAssTime("0:01:42.52") * 1000)).toBe(102520);
    expect(Math.round(parseAssTime("0:03:32.92") * 1000)).toBe(212920);
    expect(Math.round(parseAssTime("0:03:39.17") * 1000)).toBe(219170);
  });
});

describe("parseSrt", () => {
  it("複数ブロックを解釈しキュー配列を返す", () => {
    const data = [
      "1",
      "00:00:00,000 --> 00:00:02,000",
      "こんにちは",
      "",
      "2",
      "00:00:02,000 --> 00:00:04,000",
      "世界",
    ].join("\n");

    const cues = parseSrt(data);
    expect(cues).toHaveLength(2);
    expect(cues[0]).toMatchObject({ index: 1, startTime: 0, endTime: 2, text: "こんにちは" });
    expect(cues[1]).toMatchObject({ index: 2, startTime: 2, endTime: 4, text: "世界" });
  });

  it("CRLF改行でも解釈できる", () => {
    const data = "1\r\n00:00:00,000 --> 00:00:01,000\r\nテスト\r\n";
    const cues = parseSrt(data);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe("テスト");
  });

  it("時刻行が無い壊れたブロックは読み飛ばす", () => {
    const data = ["1", "壊れたブロック", "", "2", "00:00:00,000 --> 00:00:01,000", "OK"].join("\n");
    const cues = parseSrt(data);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe("OK");
  });

  it("複数行の本文を改行込みで結合する", () => {
    const data = "1\n00:00:00,000 --> 00:00:01,000\n1行目\n2行目";
    const cues = parseSrt(data);
    expect(cues[0].text).toBe("1行目\n2行目");
  });
});

describe("parseAss", () => {
  it("Format行に沿ってDialogue行を解釈する", () => {
    const data = [
      "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
      "Dialogue: 0,0:00:00.00,0:00:02.00,Default,アリス,0,0,0,,こんにちは",
    ].join("\n");

    const cues = parseAss(data);
    expect(cues).toHaveLength(1);
    expect(cues[0]).toMatchObject({ startTime: 0, endTime: 2, actor: "アリス", text: "こんにちは" });
  });

  it("ASSタグを取り除き、\\Nと\\nを改行に変換する", () => {
    const data = [
      "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
      "Dialogue: 0,0:00:00.00,0:00:01.00,Default,,0,0,0,,{\\b1}太字\\N2行目",
    ].join("\n");

    const cues = parseAss(data);
    expect(cues[0].text).toBe("太字\n2行目");
  });

  it("ルビ形式の中括弧は残す", () => {
    const data = [
      "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
      "Dialogue: 0,0:00:00.00,0:00:01.00,Default,,0,0,0,,{位置|いち}を確認",
    ].join("\n");

    const cues = parseAss(data);
    expect(cues[0].text).toBe("{位置|いち}を確認");
  });

  it("Format行が無い場合は既定の列位置（9列目=Text）を使う", () => {
    const data = "Dialogue: 0,0:00:00.00,0:00:01.00,Default,,0,0,0,,テキスト";
    const cues = parseAss(data);
    expect(cues[0].text).toBe("テキスト");
  });

  it("列数が足りない行は読み飛ばす", () => {
    const data = [
      "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
      "Dialogue: 0,0:00:00.00,0:00:01.00",
    ].join("\n");
    expect(parseAss(data)).toHaveLength(0);
  });
});

describe("parseSubtitleFile", () => {
  it(".ass / .assa はASSパーサーへ振り分ける", () => {
    const data = "Dialogue: 0,0:00:00.00,0:00:01.00,Default,,0,0,0,,テキスト";
    expect(parseSubtitleFile("test.ass", data)).toHaveLength(1);
    expect(parseSubtitleFile("test.ASSA", data)).toHaveLength(1);
  });

  it("それ以外はSRTパーサーへ振り分ける", () => {
    const data = "1\n00:00:00,000 --> 00:00:01,000\nテスト";
    expect(parseSubtitleFile("test.srt", data)).toHaveLength(1);
  });
});

describe("formatClock", () => {
  it("nullは--:--", () => {
    expect(formatClock(null)).toBe("--:--");
  });

  it("1時間未満はMM:SS", () => {
    expect(formatClock(65)).toBe("01:05");
  });

  it("1時間以上はHH:MM:SS", () => {
    expect(formatClock(3661)).toBe("01:01:01");
  });

  it("負値は0として扱う", () => {
    expect(formatClock(-10)).toBe("00:00");
  });
});
