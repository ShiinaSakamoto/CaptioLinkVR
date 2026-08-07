// 同じ時刻に重なる字幕があれば、後に出てきたキューを優先する。
export const findActiveCueAt = (cues, subtitleSeconds) => {
  let activeCue = null;
  for (const cue of cues) {
    if (cue.startTime <= subtitleSeconds && cue.endTime > subtitleSeconds) {
      activeCue = cue;
    }
  }
  return activeCue;
};

/** 現在時刻より後の次キュー開始までの秒数。次がなければ null。 */
export const getSecondsUntilNextCue = (cues, subtitleSeconds) => {
  let nextStart = null;
  for (const cue of cues) {
    if (cue.startTime <= subtitleSeconds) continue;
    if (nextStart === null || cue.startTime < nextStart) {
      nextStart = cue.startTime;
    }
  }
  if (nextStart === null) return null;
  return nextStart - subtitleSeconds;
};

// キューの開始と終了の両方で再評価し、字幕が残り続けるタイミングずれを防ぐ。
export const scheduleFutureCueTimelineEvents = ({ cues, baseStartAtMs, subtitleSeconds, syncCueToNow }) => {
  const timerIds = [];
  const scheduledEventTimes = new Set();

  const scheduleAt = (cueTimeSeconds) => {
    if (cueTimeSeconds <= subtitleSeconds) return;

    const eventAtMs = Math.round(baseStartAtMs + cueTimeSeconds * 1000);
    if (scheduledEventTimes.has(eventAtMs)) return;
    scheduledEventTimes.add(eventAtMs);

    const delayMs = Math.max(0, eventAtMs - Date.now());
    const timerId = window.setTimeout(syncCueToNow, delayMs);
    timerIds.push(timerId);
  };

  cues.forEach((cue) => {
    if (cue.endTime <= subtitleSeconds) return;
    scheduleAt(cue.startTime);
    scheduleAt(cue.endTime);
  });

  return timerIds;
};
