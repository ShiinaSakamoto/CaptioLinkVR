import { describe, expect, it } from "vitest";
import { playbackModes } from "../../../stores/subtitleStore.js";
import {
  DEFAULT_COUNTDOWN_SECONDS,
  DEFAULT_TARGET_TIME,
  normalizeCountdownSeconds,
  normalizePlaybackMode,
  normalizePlaybackSettings,
  normalizeTargetTime,
  parseTargetTime,
  updateTargetTimePart,
} from "./playbackFormUtils.js";

describe("normalizeCountdownSeconds", () => {
  it("候補一覧に含まれる値はそのまま返す", () => {
    expect(normalizeCountdownSeconds(30)).toBe(30);
  });

  it("候補外や非数値はデフォルトへ丸める", () => {
    expect(normalizeCountdownSeconds(7)).toBe(DEFAULT_COUNTDOWN_SECONDS);
    expect(normalizeCountdownSeconds("abc")).toBe(DEFAULT_COUNTDOWN_SECONDS);
  });
});

describe("normalizePlaybackMode", () => {
  it("absoluteはそのまま通す", () => {
    expect(normalizePlaybackMode(playbackModes.absolute)).toBe(playbackModes.absolute);
  });

  it("それ以外はcountdownへ丸める", () => {
    expect(normalizePlaybackMode("invalid")).toBe(playbackModes.countdown);
  });
});

describe("normalizeTargetTime", () => {
  it("正常な時刻はゼロ埋めして返す", () => {
    expect(normalizeTargetTime("9:5")).toBe("09:05");
  });

  it("範囲外の時・分はデフォルトへ丸める", () => {
    expect(normalizeTargetTime("24:00")).toBe(DEFAULT_TARGET_TIME);
    expect(normalizeTargetTime("10:60")).toBe(DEFAULT_TARGET_TIME);
  });
});

describe("parseTargetTime / updateTargetTimePart", () => {
  it("時と分に分解できる", () => {
    expect(parseTargetTime("07:30")).toEqual({ targetHour: "07", targetMinute: "30" });
  });

  it("hour側だけを更新できる", () => {
    expect(updateTargetTimePart("07:30", "hour", "12")).toBe("12:30");
  });

  it("minute側だけを更新できる", () => {
    expect(updateTargetTimePart("07:30", "minute", "45")).toBe("07:45");
  });
});

describe("normalizePlaybackSettings", () => {
  const current = { mode: playbackModes.countdown, countdownSeconds: 10, targetTime: "23:00", isPlaying: false };

  it("読み込んだ値を正規化しつつ現在値をベースにマージする", () => {
    const result = normalizePlaybackSettings(
      { mode: playbackModes.absolute, countdownSeconds: 999, targetTime: "8:0" },
      current,
    );
    expect(result).toEqual({
      mode: playbackModes.absolute,
      countdownSeconds: DEFAULT_COUNTDOWN_SECONDS,
      targetTime: "08:00",
      isPlaying: false,
    });
  });

  it("読み込み値が無い項目は現在値を維持する", () => {
    const result = normalizePlaybackSettings({}, current);
    expect(result).toEqual(current);
  });
});
