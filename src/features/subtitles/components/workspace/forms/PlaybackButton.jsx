import { memo } from "react";
import styles from "../../SubtitleWorkspace.module.scss";

const variantClassName = {
  primary: styles.playbackButtonPrimary,
  playing: styles.playbackButtonPlaying,
  stop: styles.playbackButtonStop,
};

export const PlaybackButton = memo(({ variant = "primary", className = "", children, ...buttonProps }) => {
  const classes = [styles.playbackButton, variantClassName[variant], className].filter(Boolean).join(" ");

  return (
    <button type="button" className={classes} {...buttonProps}>
      {children}
    </button>
  );
});

PlaybackButton.displayName = "PlaybackButton";
