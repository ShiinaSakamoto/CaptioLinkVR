import { useAtomValue } from "jotai";
import { memo, useEffect, useRef, useState } from "react";
import {
  overlayStatusAtom,
  playbackAtom,
  timersAtom,
} from "../../../../stores/subtitleStore.js";
import { SubtitleTestIcon, SubtitleTestStopIcon } from "../../../../shared/icons/index.jsx";
import { ui } from "../../../../shared/uiText.js";
import { getActiveSampleTimerId } from "../../utils/sampleOverlayTimer.js";
import styles from "../SubtitleWorkspace.module.scss";

/** 閉じた状態を見せてから展開するまでの待ち（1フレーム潰し防止） */
const INTRO_COLLAPSED_HOLD_MS = 280;
/** 展開表示を維持する時間（ホバー相当） */
const INTRO_EXPAND_MS = 4500;

// container 左下に sticky。収納時はアイコンのみ、展開は横方向だけ。
export const SampleOverlayFab = memo(({ onToggle }) => {
  const playback = useAtomValue(playbackAtom);
  const timers = useAtomValue(timersAtom);
  const overlayStatus = useAtomValue(overlayStatusAtom);
  // 起動イントロ: 閉じた表示 → キーフレームで延びる → 一定時間後に収納
  const [introExpanded, setIntroExpanded] = useState(false);
  const [introAnimating, setIntroAnimating] = useState(false);
  const introStartedRef = useRef(false);

  const visible = !playback.isPlaying;

  useEffect(() => {
    if (!visible || introStartedRef.current) return undefined;

    let collapseTimerId = 0;
    let animDoneTimerId = 0;
    const expandTimerId = window.setTimeout(() => {
      introStartedRef.current = true;
      setIntroExpanded(true);
      setIntroAnimating(true);
      // キーフレーム終了後は通常の isExpanded スタイルで保持（CSS --sample-fab-motion-ms に合わせる）
      animDoneTimerId = window.setTimeout(() => {
        setIntroAnimating(false);
      }, 240);
      collapseTimerId = window.setTimeout(() => {
        setIntroExpanded(false);
      }, INTRO_EXPAND_MS);
    }, INTRO_COLLAPSED_HOLD_MS);

    return () => {
      window.clearTimeout(expandTimerId);
      window.clearTimeout(animDoneTimerId);
      window.clearTimeout(collapseTimerId);
    };
  }, [visible]);

  if (!visible) return null;

  const running = Boolean(timers.sampleTimerId) || getActiveSampleTimerId() != null;
  const steamVrWaiting = !overlayStatus.connected;
  const label = running ? ui.stopSample : ui.sendSample;
  // 送信中はホバー解除と同様に縮めない
  const expanded = introExpanded || running;

  return (
    <div className={styles.sampleOverlayRail}>
      <div
        className={[
          styles.sampleOverlayFab,
          expanded ? styles.isExpanded : "",
          introAnimating ? styles.isIntroExpand : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="region"
        aria-label={ui.sendSample}
      >
        {steamVrWaiting ? (
          <p className={styles.sampleOverlayHint}>{ui.steamVrLaunchWaiting}</p>
        ) : null}
        <button
          className={styles.sampleOverlayButton}
          type="button"
          onClick={onToggle}
          aria-pressed={running}
          aria-label={label}
          title={label}
        >
          <span className={styles.sampleOverlayIcon} aria-hidden="true">
            {running ? <SubtitleTestStopIcon /> : <SubtitleTestIcon />}
          </span>
          <span className={styles.sampleOverlayLabel}>{label}</span>
        </button>
      </div>
    </div>
  );
});

SampleOverlayFab.displayName = "SampleOverlayFab";
