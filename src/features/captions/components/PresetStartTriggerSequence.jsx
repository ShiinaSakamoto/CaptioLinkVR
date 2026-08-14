import { memo, useEffect, useRef, useState } from "react";
import { PlayIcon } from "../../../shared/icons/index.jsx";
import { ui } from "../../../shared/uiText.js";
import {
  START_TRIGGER_FRAME_MS,
  START_TRIGGER_LOOP_COUNT,
  advanceStartTriggerSequence,
} from "../startTriggerSequence.js";
import styles from "../Captions.module.scss";

export const PresetStartTriggerSequence = memo(({ frames, alt, startTiming }) => {
  const [playing, setPlaying] = useState(frames.length >= 2);
  const [frameIndex, setFrameIndex] = useState(0);
  const stepRef = useRef(0);

  useEffect(() => {
    stepRef.current = 0;
    setFrameIndex(0);
    setPlaying(frames.length >= 2);
  }, [frames]);

  useEffect(() => {
    if (!playing || frames.length < 2) return undefined;

    const timerId = window.setInterval(() => {
      const next = advanceStartTriggerSequence(
        stepRef.current,
        frames.length,
        START_TRIGGER_LOOP_COUNT,
      );
      stepRef.current = next.step;
      setFrameIndex(next.frameIndex);
      if (!next.playing) setPlaying(false);
    }, START_TRIGGER_FRAME_MS);

    return () => window.clearInterval(timerId);
  }, [playing, frames.length]);

  if (frames.length === 0) return null;

  const replay = () => {
    stepRef.current = 0;
    setFrameIndex(0);
    setPlaying(true);
  };

  const paused = !playing && frames.length >= 2;

  return (
    <figure className={styles.presetStartTrigger}>
      <div className={styles.presetStartTriggerStage}>
        {frames.map((src, index) => (
          <img
            key={`${index}-${src.slice(-24)}`}
            className={[
              styles.presetStartTriggerImage,
              index === frameIndex ? "" : styles.presetStartTriggerImageHidden,
              paused && index === frameIndex ? styles.presetStartTriggerImagePaused : "",
            ]
              .filter(Boolean)
              .join(" ")}
            src={src}
            alt={index === frameIndex ? alt : ""}
            aria-hidden={index === frameIndex ? undefined : true}
          />
        ))}
        {paused ? (
          <button type="button" className={styles.presetStartTriggerReplay} onClick={replay}>
            <PlayIcon />
            <span>{ui.replayStartTrigger}</span>
          </button>
        ) : null}
      </div>
      {startTiming ? (
        <figcaption className={styles.presetStartTriggerCaption}>
          <span className={styles.presetInfoLabel}>{ui.usageStartTiming}</span>
          <span className={styles.presetStartTriggerCaptionText}>{startTiming}</span>
        </figcaption>
      ) : null}
    </figure>
  );
});

PresetStartTriggerSequence.displayName = "PresetStartTriggerSequence";
