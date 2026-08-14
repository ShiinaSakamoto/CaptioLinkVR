export const START_TRIGGER_FRAME_MS = 1000;
export const START_TRIGGER_LOOP_COUNT = 3;

/** 1秒進めたあとの通し番号・表示フレーム・再生継続。step は今表示中の通し番号。 */
export const advanceStartTriggerSequence = (
  step,
  frameCount,
  loopCount = START_TRIGGER_LOOP_COUNT,
) => {
  const lastIndex = Math.max(frameCount - 1, 0);
  if (frameCount < 2) {
    return { step: 0, frameIndex: lastIndex, playing: false };
  }

  const total = frameCount * loopCount;
  const nextStep = step + 1;
  if (total <= 0 || nextStep >= total) {
    return { step: Math.max(total - 1, 0), frameIndex: lastIndex, playing: false };
  }

  return { step: nextStep, frameIndex: nextStep % frameCount, playing: true };
};
