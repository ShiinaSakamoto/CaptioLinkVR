import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { playbackModes } from "../../../stores/subtitleStore.js";
import { buildCountdownText, calculateDelaySeconds, getCountdownDisplaySeconds } from "./playbackTimeline.js";

describe("getCountdownDisplaySeconds", () => {
  it("小数は切り上げる", () => {
    expect(getCountdownDisplaySeconds(9.2)).toBe(10);
  });

  it("負値や非数値は0にする", () => {
    expect(getCountdownDisplaySeconds(-5)).toBe(0);
    expect(getCountdownDisplaySeconds(NaN)).toBe(0);
    expect(getCountdownDisplaySeconds(undefined)).toBe(0);
  });
});

describe("buildCountdownText", () => {
  it("1時間未満は MM:SS 表記", () => {
    expect(buildCountdownText(65)).toBe("字幕再生まで 01:05");
  });

  it("1時間以上は HH:MM:SS 表記", () => {
    expect(buildCountdownText(3661)).toBe("字幕再生まで 01:01:01");
  });

  it("0秒はスタート表示に差し替える", () => {
    expect(buildCountdownText(0)).toBe("00:00 スタート！");
    expect(buildCountdownText(-1)).toBe("00:00 スタート！");
  });
});

describe("calculateDelaySeconds", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("カウントダウンモードは指定秒数をそのまま返す", () => {
    expect(
      calculateDelaySeconds({ mode: playbackModes.countdown, countdownSeconds: 10 }),
    ).toBe(10);
  });

  it("カウントダウン秒が負や非数値なら0", () => {
    expect(calculateDelaySeconds({ mode: playbackModes.countdown, countdownSeconds: -3 })).toBe(0);
  });

  it("指定時刻モードは当日の未来時刻までの秒数を返す", () => {
    vi.setSystemTime(new Date(2026, 0, 1, 10, 0, 0, 0));
    const delay = calculateDelaySeconds({ mode: playbackModes.absolute, targetTime: "10:05" });
    expect(delay).toBe(300);
  });

  it("指定時刻が現在より過去なら翌日として計算する", () => {
    vi.setSystemTime(new Date(2026, 0, 1, 10, 0, 0, 0));
    const delay = calculateDelaySeconds({ mode: playbackModes.absolute, targetTime: "09:00" });
    // 翌日9:00まで = 23時間
    expect(delay).toBe(23 * 3600);
  });
});
