import { describe, expect, it } from "vitest";
import { START_TRIGGER_LOOP_COUNT, advanceStartTriggerSequence } from "./startTriggerSequence.js";

describe("advanceStartTriggerSequence", () => {
  it("3→2→1→0 を3ループしたあと 0 で止める", () => {
    const frameCount = 4;
    let step = 0;
    let frameIndex = 0;
    let playing = true;
    const seen = [0];

    while (playing) {
      const next = advanceStartTriggerSequence(step, frameCount);
      step = next.step;
      frameIndex = next.frameIndex;
      playing = next.playing;
      if (playing) seen.push(frameIndex);
    }

    expect(seen).toHaveLength(frameCount * START_TRIGGER_LOOP_COUNT);
    expect(seen.slice(0, 4)).toEqual([0, 1, 2, 3]);
    expect(seen.slice(4, 8)).toEqual([0, 1, 2, 3]);
    expect(frameIndex).toBe(3);
    expect(playing).toBe(false);
  });

  it("フレームが1枚以下なら進めずに止める", () => {
    expect(advanceStartTriggerSequence(0, 1)).toEqual({ step: 0, frameIndex: 0, playing: false });
    expect(advanceStartTriggerSequence(0, 0)).toEqual({ step: 0, frameIndex: 0, playing: false });
  });
});
