import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findActiveCueAt, getSecondsUntilNextCue, scheduleFutureCueTimelineEvents } from "./cueScheduler.js";

describe("findActiveCueAt", () => {
  const cues = [
    { id: "a", startTime: 0, endTime: 5 },
    { id: "b", startTime: 3, endTime: 8 },
  ];

  it("開始<=t<終了のキューを返す", () => {
    expect(findActiveCueAt(cues, 1)?.id).toBe("a");
  });

  it("重なっている場合は後方のキューを優先する", () => {
    expect(findActiveCueAt(cues, 4)?.id).toBe("b");
  });

  it("終了時刻ちょうどはそのキューを含まない（半開区間）", () => {
    expect(findActiveCueAt(cues, 5)?.id).toBe("b");
  });

  it("どのキューにも該当しなければnull", () => {
    expect(findActiveCueAt(cues, 100)).toBeNull();
  });

  it("ASSセンチ秒由来の float でも開始境界で欠落しない", () => {
    // 旧実装: Number 直和の 102.52000000000001 と timer 側 102.52 の比較で欠落した。
    const startTime = 102.52000000000001;
    const endTime = 105.23;
    const cuesWithFloat = [{ id: "summer", startTime, endTime }];
    const measuredAtStart = Math.round(startTime * 1000) / 1000;

    expect(startTime <= measuredAtStart).toBe(false);
    expect(findActiveCueAt(cuesWithFloat, measuredAtStart)?.id).toBe("summer");
  });

  it("ASSセンチ秒由来の float でも終了境界で残り続けない", () => {
    const startTime = 216.3;
    const endTime = 219.17000000000002;
    const cuesWithFloat = [{ id: "hah", startTime, endTime }];
    const measuredAtEnd = Math.round(endTime * 1000) / 1000;

    expect(endTime > measuredAtEnd).toBe(true);
    expect(findActiveCueAt(cuesWithFloat, measuredAtEnd)).toBeNull();
  });
});

describe("getSecondsUntilNextCue", () => {
  const cues = [
    { id: "a", startTime: 0, endTime: 2 },
    { id: "b", startTime: 10, endTime: 12 },
    { id: "c", startTime: 20, endTime: 22 },
  ];

  it("次キューまでの秒数を返す", () => {
    expect(getSecondsUntilNextCue(cues, 2)).toBe(8);
    expect(getSecondsUntilNextCue(cues, 10)).toBe(10);
  });

  it("次キューがなければnull", () => {
    expect(getSecondsUntilNextCue(cues, 22)).toBeNull();
  });
});

describe("scheduleFutureCueTimelineEvents", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("未来の開始/終了それぞれにタイマーを1つずつ張る", () => {
    const baseStartAtMs = Date.now();
    const cues = [{ startTime: 1, endTime: 2 }];
    const syncCueToNow = vi.fn();

    const timerIds = scheduleFutureCueTimelineEvents({
      cues,
      baseStartAtMs,
      subtitleSeconds: 0,
      syncCueToNow,
    });

    expect(timerIds).toHaveLength(2);
    vi.advanceTimersByTime(2000);
    expect(syncCueToNow).toHaveBeenCalledTimes(2);
  });

  it("既に終了したキューはスケジュールしない", () => {
    const baseStartAtMs = Date.now();
    const cues = [{ startTime: 0, endTime: 1 }];
    const syncCueToNow = vi.fn();

    const timerIds = scheduleFutureCueTimelineEvents({
      cues,
      baseStartAtMs,
      subtitleSeconds: 5,
      syncCueToNow,
    });

    expect(timerIds).toHaveLength(0);
  });

  it("同一ミリ秒に重なるイベントは1回だけスケジュールする", () => {
    const baseStartAtMs = Date.now();
    const cues = [
      { startTime: 1, endTime: 2 },
      { startTime: 2, endTime: 3 },
    ];
    const syncCueToNow = vi.fn();

    const timerIds = scheduleFutureCueTimelineEvents({
      cues,
      baseStartAtMs,
      subtitleSeconds: 0,
      syncCueToNow,
    });

    // 1s, 2s(重複除去), 3s の3イベント
    expect(timerIds).toHaveLength(3);
  });

  it("過去分の開始/終了だけ除外し、現在より後は残す", () => {
    const baseStartAtMs = Date.now();
    const cues = [{ startTime: 1, endTime: 3 }];
    const syncCueToNow = vi.fn();

    const timerIds = scheduleFutureCueTimelineEvents({
      cues,
      baseStartAtMs,
      subtitleSeconds: 2,
      syncCueToNow,
    });

    expect(timerIds).toHaveLength(1);
    vi.advanceTimersByTime(3000);
    expect(syncCueToNow).toHaveBeenCalledTimes(1);
  });

  it("開始境界の float 誤差があっても開始タイマーで active になる", () => {
    const baseStartAtMs = Date.now();
    const cue = {
      id: "summer",
      startTime: 102.52000000000001,
      endTime: 105.23,
    };
    let active = null;

    scheduleFutureCueTimelineEvents({
      cues: [cue],
      baseStartAtMs,
      subtitleSeconds: 0,
      syncCueToNow: () => {
        const currentSubtitleSeconds = (Date.now() - baseStartAtMs) / 1000;
        active = findActiveCueAt([cue], currentSubtitleSeconds);
      },
    });

    vi.advanceTimersByTime(102520);
    expect(active?.id).toBe("summer");

    vi.advanceTimersByTime(105230 - 102520);
    expect(active).toBeNull();
  });
});
