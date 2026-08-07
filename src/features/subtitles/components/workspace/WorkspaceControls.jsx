import { useAtom, useAtomValue } from "jotai";
import { memo } from "react";
import { isPlayableAtom, playbackAtom, playbackModes, playbackTimingAtom } from "../../../../stores/subtitleStore.js";
import {
  COUNTDOWN_SECOND_OPTIONS,
  normalizeCountdownSeconds,
  parseTargetTime,
  updateTargetTimePart,
} from "../../utils/playbackFormUtils.js";
import { FieldRow } from "../../../../shared/forms/FieldRow.jsx";
import { PlaybackStopButton } from "./forms/PlaybackStopButton.jsx";
import { PlaybackButton } from "./forms/PlaybackButton.jsx";
import { PlaybackModeSwitch } from "./forms/PlaybackModeSwitch.jsx";
import { SelectControl } from "./forms/SelectControl.jsx";
import { AdjustTriangleIcon } from "../../../../shared/icons/index.jsx";
import { ui } from "../../../../shared/uiText.js";
import styles from "../SubtitleWorkspace.module.scss";

const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

const hourOptions = hours.map((hour) => ({ value: hour, label: hour }));
const minuteOptions = minutes.map((minute) => ({ value: minute, label: minute }));
const countdownSecondOptions = COUNTDOWN_SECOND_OPTIONS.map((seconds) => ({
  value: String(seconds),
  label: ui.countdownSecondsOption(seconds),
}));

const CountdownModePlayingSummary = memo(({ mode, targetTime }) => {
  if (mode !== playbackModes.absolute) return null;
  return <p className={styles.startTimeText}>{ui.startTime}: {targetTime}</p>;
});

CountdownModePlayingSummary.displayName = "CountdownModePlayingSummary";

const CountdownModeEditor = memo(({ playback, setPlayback }) => {
  const { targetHour, targetMinute } = parseTargetTime(playback.targetTime);
  const countdownSeconds = normalizeCountdownSeconds(playback.countdownSeconds);

  const setTargetTimePart = (part, value) => {
    setPlayback((current) => ({
      ...current,
      targetTime: updateTargetTimePart(current.targetTime, part, value),
    }));
  };

  const rightField =
    playback.mode === playbackModes.countdown ? (
      <FieldRow label={ui.startCount} compact>
        <SelectControl
          value={String(countdownSeconds)}
          onChange={(seconds) =>
            setPlayback((current) => ({
              ...current,
              countdownSeconds: normalizeCountdownSeconds(seconds),
            }))
          }
          options={countdownSecondOptions}
        />
      </FieldRow>
    ) : (
      <FieldRow label={ui.startTime} compact>
        <div className={styles.timeSelectInline}>
          <SelectControl
            value={targetHour}
            onChange={(hour) => setTargetTimePart("hour", hour)}
            options={hourOptions}
          />
          <span aria-hidden="true">:</span>
          <SelectControl
            value={targetMinute}
            onChange={(minute) => setTargetTimePart("minute", minute)}
            options={minuteOptions}
          />
        </div>
      </FieldRow>
    );

  return (
    <section className={`${styles.workspaceControlSplit} ${styles.countdownModeSection}`}>
      <FieldRow label={ui.countdownMode} compact>
        <PlaybackModeSwitch
          value={playback.mode}
          onChange={(mode) => setPlayback((current) => ({ ...current, mode }))}
        />
      </FieldRow>
      {rightField}
    </section>
  );
});

CountdownModeEditor.displayName = "CountdownModeEditor";

export const CountdownModeControls = memo(() => {
  const [playback, setPlayback] = useAtom(playbackAtom);

  if (playback.isPlaying) {
    return (
      <CountdownModePlayingSummary mode={playback.mode} targetTime={playback.targetTime} />
    );
  }

  return <CountdownModeEditor playback={playback} setPlayback={setPlayback} />;
});

CountdownModeControls.displayName = "CountdownModeControls";

const CountdownAdjustButton = memo(({ direction, unit, onClick }) => (
  <button
    type="button"
    className={styles.countdownAdjustButton}
    data-direction={direction}
    onClick={onClick}
  >
    <span className={styles.countdownAdjustIcon}>
      <AdjustTriangleIcon direction={direction} />
    </span>
    <span className={styles.countdownAdjustLabel}>{unit}</span>
  </button>
));

CountdownAdjustButton.displayName = "CountdownAdjustButton";

export const CountdownAdjustmentControls = memo(({ mode, isPlaying, remainingSeconds, onAdjust }) => {
  const canAdjust = mode === playbackModes.absolute && isPlaying && Number(remainingSeconds) > 0;
  if (!canAdjust) return null;

  return (
    <div className={styles.countdownAdjustButtons}>
      <div className={styles.countdownAdjustGroup}>
        <CountdownAdjustButton direction="up" unit={ui.adjustMinuteUnit} onClick={() => onAdjust(60)} />
        <CountdownAdjustButton direction="down" unit={ui.adjustMinuteUnit} onClick={() => onAdjust(-60)} />
      </div>
      <div className={styles.countdownAdjustDivider} aria-hidden="true" />
      <div className={styles.countdownAdjustGroup}>
        <CountdownAdjustButton direction="up" unit={ui.adjustSecondUnit} onClick={() => onAdjust(1)} />
        <CountdownAdjustButton direction="down" unit={ui.adjustSecondUnit} onClick={() => onAdjust(-1)} />
      </div>
    </div>
  );
});

CountdownAdjustmentControls.displayName = "CountdownAdjustmentControls";

// 大きい状態バーは置かず、再生中の微調整ボタンだけを必要時に出す。
export const PlaybackRuntimeControls = memo(({ onAdjust }) => {
  const playback = useAtomValue(playbackAtom);
  const timing = useAtomValue(playbackTimingAtom);

  return (
    <CountdownAdjustmentControls
      mode={playback.mode}
      isPlaying={playback.isPlaying}
      remainingSeconds={timing.remainingSeconds}
      onAdjust={onAdjust}
    />
  );
});

PlaybackRuntimeControls.displayName = "PlaybackRuntimeControls";

export const PlaybackControls = memo(({ start, stop }) => {
  const playback = useAtomValue(playbackAtom);
  const isPlayable = useAtomValue(isPlayableAtom);

  return (
    <div className={styles.playbackButtons}>
      {!isPlayable && <p className={styles.noSubtitleText}>{ui.noSubtitle}</p>}
      {isPlayable && (
        playback.isPlaying ? (
          <PlaybackButton variant="playing" disabled>
            {ui.playing}
          </PlaybackButton>
        ) : (
          <PlaybackButton variant="primary" onClick={start}>
            {ui.play}
          </PlaybackButton>
        )
      )}
      {playback.isPlaying && (
        <PlaybackStopButton onClick={stop} />
      )}
    </div>
  );
});

PlaybackControls.displayName = "PlaybackControls";
