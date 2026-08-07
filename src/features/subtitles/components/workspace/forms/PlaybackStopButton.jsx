import { useAtomValue } from "jotai";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { stopAttentionPulseAtom } from "../../../../../stores/subtitleStore.js";
import { ui } from "../../../../../shared/uiText.js";
import styles from "../../SubtitleWorkspace.module.scss";

const ATTENTION_GLOW_MS = 520;

// 停止ボタン。ロックされた操作からの注意リクエストで外側へ広がるリップルを出す。
export const PlaybackStopButton = memo(({ onClick, children = ui.stop }) => {
  const pulse = useAtomValue(stopAttentionPulseAtom);
  const [ripples, setRipples] = useState([]);
  const [attentionGlow, setAttentionGlow] = useState(false);
  const lastPulseRef = useRef(pulse);
  const glowTimerRef = useRef(0);

  useEffect(() => {
    if (pulse === lastPulseRef.current) return undefined;

    lastPulseRef.current = pulse;
    if (pulse === 0) return undefined;

    setRipples((current) => [...current, pulse]);
    setAttentionGlow(true);
    window.clearTimeout(glowTimerRef.current);
    glowTimerRef.current = window.setTimeout(() => {
      setAttentionGlow(false);
    }, ATTENTION_GLOW_MS);

    return () => window.clearTimeout(glowTimerRef.current);
  }, [pulse]);

  const removeRipple = useCallback((rippleId) => {
    setRipples((current) => current.filter((id) => id !== rippleId));
  }, []);

  return (
    <button
      type="button"
      className={[
        styles.playbackButton,
        styles.playbackButtonStop,
        styles.playbackStopButton,
        attentionGlow ? styles.playbackStopButtonAttention : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
    >
      {ripples.map((rippleId) => (
        <span
          key={rippleId}
          className={styles.playbackStopRipple}
          aria-hidden="true"
          onAnimationEnd={() => removeRipple(rippleId)}
        />
      ))}
      <span className={styles.playbackStopButtonLabel}>{children}</span>
    </button>
  );
});

PlaybackStopButton.displayName = "PlaybackStopButton";
