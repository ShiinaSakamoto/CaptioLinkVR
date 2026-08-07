import { memo } from "react";
import styles from "../Captions.module.scss";

export const PresetPickerCard = memo(
  ({ title, subtitle, selected = false, focused = false, disabled = false, onSelect, variant = "preset" }) => (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      disabled={disabled}
      className={[
        styles.presetPickerCard,
        variant === "custom" ? styles.presetPickerCardCustom : "",
        selected ? styles.presetPickerCardSelected : "",
        focused ? styles.presetPickerCardFocused : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!disabled) onSelect();
      }}
    >
      <span className={styles.presetPickerCardTitle}>{title}</span>
      {subtitle ? <span className={styles.presetPickerCardSubtitle}>{subtitle}</span> : null}
    </button>
  ),
);

PresetPickerCard.displayName = "PresetPickerCard";
