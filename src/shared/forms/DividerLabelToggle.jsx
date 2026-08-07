import { memo } from "react";
import styles from "./SharedForms.module.scss";

export const DividerLabelToggle = memo(({
  open,
  panelId,
  onToggle,
  openLabel,
  closeLabel,
  className = "",
}) => {
  const label = open ? closeLabel : openLabel;
  const classes = [
    styles.dividerLabelToggle,
    className,
  ].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      className={classes}
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={panelId}
      aria-label={label}
    >
      <span className={styles.dividerLabelLine} aria-hidden="true" />
      <span className={styles.dividerLabelText}>{label}</span>
      <span className={styles.dividerLabelLine} aria-hidden="true" />
    </button>
  );
});

DividerLabelToggle.displayName = "DividerLabelToggle";
