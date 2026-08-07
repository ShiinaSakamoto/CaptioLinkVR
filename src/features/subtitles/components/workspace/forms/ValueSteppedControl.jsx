import { memo } from "react";
import { useVisualQaHighlight } from "../../../hooks/useVisualQaHighlight.js";
import { RangeSlider, ResetButton, StepButtonGroup } from "./sliderPrimitives.jsx";
import styles from "../../SubtitleWorkspace.module.scss";

// ラベルに現在値を含め、左に増減・右にリセット付きスライダーを並べる設定UI。
// settingKey: renderSettingsAtom のキー名。Visual QA がこの値を操作中のとき自動でハイライトする。
export const ValueSteppedControl = memo(
  ({
    label,
    description,
    value,
    min,
    max,
    step,
    onChange,
    onReset,
    disabled = false,
    tooltip,
    tooltipKey,
    settingKey,
  }) => {
    const { isHighlighted, ref, target } = useVisualQaHighlight(settingKey);
    // スライダーを動かしている間だけ行全体を光らせ、リセット/増減ボタンを押している間はそのボタン
    // だけを光らせる（同時に複数が光ると「今どれが押されているか」が分かりにくくなるため）。
    const rowHighlighted = isHighlighted && (!target || target === "slider");

    return (
      <div
        ref={ref}
        className={[
          styles.valueSteppedControl,
          disabled ? styles.settingControlDisabled : "",
          rowHighlighted ? styles.isQaHighlighted : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.valueSteppedHeader}>
          <span className={styles.valueSteppedLabel}>{label}</span>
          {description ? <p className={styles.valueSteppedDescription}>{description}</p> : null}
        </div>
        <div className={styles.valueSteppedRow}>
          <StepButtonGroup
            orientation="horizontal"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            label={label}
            disabled={disabled}
            minusHighlighted={target === "decrement"}
            plusHighlighted={target === "increment"}
          />
          <RangeSlider
            label={label}
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            disabled={disabled}
            tooltip={tooltip}
            tooltipKey={tooltipKey}
          />
          {onReset && (
            <ResetButton
              label={`${label} reset`}
              onClick={onReset}
              disabled={disabled}
              highlighted={target === "reset"}
            />
          )}
        </div>
      </div>
    );
  },
);

ValueSteppedControl.displayName = "ValueSteppedControl";
