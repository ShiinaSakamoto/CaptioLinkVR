import { memo } from "react";
import { useHighlightRef } from "../../../hooks/useHighlightRef.js";
import { RangeSlider, ResetButton, StepButtonGroup } from "../forms/sliderPrimitives.jsx";
import styles from "../../SubtitleWorkspace.module.scss";

// highlightedAxis: "x" | "y" | "z" | null。Visual QA が操作中の軸。
// highlightedTarget: リセット/増減など、押下中の部品（ValueSteppedControl と同様）。
export const AxisControls = memo(
  ({ mode, labels, values, ranges, defaults, onChange, tooltipContextKey, highlightedAxis = null, highlightedTarget = null }) => {
    const isRotation = mode === "rotation";

    return (
      <div className={[styles.axisConsole, isRotation ? styles.isRotationConsole : styles.isPositionConsole].join(" ")}>
        <div className={styles.axisBoard}>
          <div className={styles.axisBoardInner}>
            <DirectionalAxis
              className={styles.yAxisControl}
              label={labels.y}
              value={values.y}
              range={ranges.y}
              onChange={(value) => onChange("y", value)}
              onReset={() => onChange("y", defaults.y)}
              orientation="vertical"
              tooltip={{ placement: "right", upright: true }}
              tooltipKey="axis-y"
              tooltipContextKey={tooltipContextKey}
              highlighted={highlightedAxis === "y"}
              highlightedTarget={highlightedAxis === "y" ? highlightedTarget : null}
            />

            <DirectionalAxis
              className={styles.zAxisControl}
              label={labels.z}
              value={values.z}
              range={ranges.z}
              onChange={(value) => onChange("z", value)}
              onReset={() => onChange("z", defaults.z)}
              orientation={isRotation ? "diagonalBack" : "diagonalForward"}
              tooltip={isRotation ? { placement: "bottom", upright: true } : { upright: true }}
              tooltipKey="axis-z"
              tooltipContextKey={tooltipContextKey}
              highlighted={highlightedAxis === "z"}
              highlightedTarget={highlightedAxis === "z" ? highlightedTarget : null}
            />

            <DirectionalAxis
              className={styles.xAxisControl}
              label={labels.x}
              value={values.x}
              range={ranges.x}
              onChange={(value) => onChange("x", value)}
              onReset={() => onChange("x", defaults.x)}
              orientation="horizontal"
              tooltip={{ upright: true }}
              tooltipKey="axis-x"
              tooltipContextKey={tooltipContextKey}
              highlighted={highlightedAxis === "x"}
              highlightedTarget={highlightedAxis === "x" ? highlightedTarget : null}
            />
          </div>
        </div>
      </div>
    );
  },
);

AxisControls.displayName = "AxisControls";

const DirectionalAxis = memo(
  ({
    className,
    label,
    value,
    range,
    onChange,
    onReset,
    orientation,
    tooltip,
    tooltipKey,
    tooltipContextKey,
    highlighted = false,
    highlightedTarget = null,
  }) => {
    const [min, max, step] = range;
    const stepOrientation = orientation === "vertical" ? "vertical" : "horizontal";
    // スライダー自体のハイライトは、増減/リセットボタンを個別に強調していない間だけ付ける
    // （どのボタンが「今押されているか」を分かりやすくするため、同時に光らせすぎない）。
    const sliderHighlighted = highlighted && (!highlightedTarget || highlightedTarget === "slider");
    const highlightRef = useHighlightRef(highlighted);

    return (
      <div className={[styles.directionalAxis, className || "", styles[`axis${capitalize(orientation)}`]].join(" ")}>
        <div className={styles.axisLabel}>
          <span>{label}</span>
          <ResetButton label={`${label} reset`} onClick={onReset} highlighted={highlightedTarget === "reset"} />
        </div>
        <div
          ref={highlightRef}
          className={[styles.axisSliderWrap, sliderHighlighted ? styles.isQaHighlighted : ""].filter(Boolean).join(" ")}
        >
          <RangeSlider
            label={label}
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            tooltip={tooltip}
            tooltipKey={tooltipKey}
            tooltipContextKey={tooltipContextKey}
          />
        </div>
        <StepButtonGroup
          className={styles.axisStepButtons}
          orientation={stepOrientation}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          label={label}
          minusHighlighted={highlightedTarget === "decrement"}
          plusHighlighted={highlightedTarget === "increment"}
        />
      </div>
    );
  },
);

DirectionalAxis.displayName = "DirectionalAxis";

// orientation名からCSS Modulesのクラス名を組み立てる。
const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);
