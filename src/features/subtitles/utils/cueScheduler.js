/** 秒をタイムライン比較用の整数ミリ秒へ揃える（IEEE 誤差で境界を落とさない）。 */
export const toTimelineMs = (seconds) => Math.round(Number(seconds) * 1000);

// 同じ時刻に重なる字幕があれば、後に出てきたキューを優先する。
// 判定は [start, end) の半開区間。秒の float ではなくミリ秒整数で比較する。
export const findActiveCueAt = (cues, subtitleSeconds) => {
  const subtitleMs = toTimelineMs(subtitleSeconds);
  let activeCue = null;
  for (const cue of cues) {
    const startMs = toTimelineMs(cue.startTime);
    const endMs = toTimelineMs(cue.endTime);
    if (startMs <= subtitleMs && endMs > subtitleMs) {
      activeCue = cue;
    }
  }
  return activeCue;
};

/** 現在時刻より後の次キュー開始までの秒数。次がなければ null。 */
export const getSecondsUntilNextCue = (cues, subtitleSeconds) => {
  const subtitleMs = toTimelineMs(subtitleSeconds);
  let nextStartMs = null;
  for (const cue of cues) {
    const startMs = toTimelineMs(cue.startTime);
    if (startMs <= subtitleMs) continue;
    if (nextStartMs === null || startMs < nextStartMs) {
      nextStartMs = startMs;
    }
  }
  if (nextStartMs === null) return null;
  return (nextStartMs - subtitleMs) / 1000;
};

// キューの開始と終了の両方で再評価し、字幕が残り続けるタイミングずれを防ぐ。
export const scheduleFutureCueTimelineEvents = ({ cues, baseStartAtMs, subtitleSeconds, syncCueToNow }) => {
  const timerIds = [];
  const scheduledEventTimes = new Set();
  const subtitleMs = toTimelineMs(subtitleSeconds);

  const scheduleAt = (cueTimeSeconds) => {
    const cueTimeMs = toTimelineMs(cueTimeSeconds);
    if (cueTimeMs <= subtitleMs) return;

    const eventAtMs = baseStartAtMs + cueTimeMs;
    if (scheduledEventTimes.has(eventAtMs)) return;
    scheduledEventTimes.add(eventAtMs);

    const delayMs = Math.max(0, eventAtMs - Date.now());
    const timerId = window.setTimeout(syncCueToNow, delayMs);
    timerIds.push(timerId);
  };

  cues.forEach((cue) => {
    if (toTimelineMs(cue.endTime) <= subtitleMs) return;
    scheduleAt(cue.startTime);
    scheduleAt(cue.endTime);
  });

  return timerIds;
};
