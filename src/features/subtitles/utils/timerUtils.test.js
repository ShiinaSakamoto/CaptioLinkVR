import { afterEach, describe, expect, it, vi } from "vitest";
import { clearTimerId, clearTimerIds } from "./timerUtils.js";

describe("clearTimerId", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clearTimeoutとclearIntervalの両方を同じIDで呼ぶ（種別を問わず安全に止める）", () => {
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");

    clearTimerId(42);

    expect(clearTimeoutSpy).toHaveBeenCalledWith(42);
    expect(clearIntervalSpy).toHaveBeenCalledWith(42);
  });
});

describe("clearTimerIds", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("配列内の全IDを止める", () => {
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

    clearTimerIds([1, 2, 3]);

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(3);
  });

  it("falsyなIDはスキップする", () => {
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

    clearTimerIds([0, null, undefined, 5]);

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(clearTimeoutSpy).toHaveBeenCalledWith(5);
  });
});
