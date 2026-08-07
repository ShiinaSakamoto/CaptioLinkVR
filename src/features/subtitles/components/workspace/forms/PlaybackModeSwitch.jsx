import { memo } from "react";
import { playbackModes } from "../../../../../stores/subtitleStore.js";
import { ui } from "../../../../../shared/uiText.js";
import styles from "../../SubtitleWorkspace.module.scss";

// 指定カウント / 指定時刻の2択スイッチ。
export const PlaybackModeSwitch = memo(({ value, onChange }) => (
  <div
    className={styles.playbackModeSwitch}
    data-active={value}
    role="group"
    aria-label={ui.countdownMode}
  >
    <span className={styles.playbackModeSwitchIndicator} aria-hidden="true" />
    <button
      type="button"
      aria-pressed={value === playbackModes.countdown}
      className={[
        styles.playbackModeSwitchOption,
        value === playbackModes.countdown ? styles.playbackModeSwitchOptionActive : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onChange(playbackModes.countdown)}
    >
      {ui.manualCount}
    </button>
    <button
      type="button"
      aria-pressed={value === playbackModes.absolute}
      className={[
        styles.playbackModeSwitchOption,
        value === playbackModes.absolute ? styles.playbackModeSwitchOptionActive : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onChange(playbackModes.absolute)}
    >
      {ui.targetTime}
    </button>
  </div>
));

PlaybackModeSwitch.displayName = "PlaybackModeSwitch";
