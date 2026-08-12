import { afterEach, describe, expect, it } from "vitest";
import {
  armSampleTimer,
  disarmSampleTimer,
  getActiveSampleTimerId,
} from "./sampleOverlayTimer.js";

describe("sampleOverlayTimer", () => {
  afterEach(() => {
    disarmSampleTimer();
  });

  it("arm した id を get できる", () => {
    armSampleTimer(42);
    expect(getActiveSampleTimerId()).toBe(42);
  });

  it("disarm で null に戻る", () => {
    armSampleTimer(7);
    disarmSampleTimer();
    expect(getActiveSampleTimerId()).toBeNull();
  });

  it("別 id を arm すると前の interval を clear する", () => {
    const cleared = [];
    const original = window.clearInterval;
    window.clearInterval = (id) => {
      cleared.push(id);
      original(id);
    };

    try {
      armSampleTimer(1);
      armSampleTimer(2);
      expect(cleared).toContain(1);
      expect(getActiveSampleTimerId()).toBe(2);
    } finally {
      window.clearInterval = original;
    }
  });
});
