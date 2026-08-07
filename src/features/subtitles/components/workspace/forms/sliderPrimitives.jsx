import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ResetIcon, TriangleIcon } from "../../../../../shared/icons/index.jsx";
import { clampStep, formatSliderValue, getSliderThumbRatio, toNumericRange } from "./sliderUtils.js";
import styles from "../../SubtitleWorkspace.module.scss";

const TOOLTIP_FLASH_MS = 900;

// highlighted: Visual QAが「今リセットボタンを押している」ことを示すとき、押されている風の強調を付ける。
export const ResetButton = memo(({ label, onClick, className, disabled = false, highlighted = false }) => (
  <button
    type="button"
    className={[styles.resetIconButton, className, highlighted ? styles.isQaHighlighted : ""]
      .filter(Boolean)
      .join(" ")}
    onClick={onClick}
    aria-label={label}
    disabled={disabled}
  >
    <ResetIcon />
  </button>
));

// tooltip: { placement?, upright?, formatValue? }
// tooltipKey: _slider-tooltips.scss で個別に位置微調整する識別子
// 位置微調整は --slider-tooltip-offset-x / --slider-tooltip-offset-y（gap に加算）
export const RangeSlider = memo(({
  label,
  min,
  max,
  step,
  value,
  onChange,
  className,
  disabled = false,
  tooltip,
  tooltipKey,
  tooltipContextKey,
}) => {
  const draggingRef = useRef(false);
  const hoveringRef = useRef(false);
  const hideTimerRef = useRef(null);
  const prevValueRef = useRef(value);
  const tooltipContextRef = useRef(tooltipContextKey);
  const [visible, setVisible] = useState(false);

  const placement = tooltip?.placement ?? "top";
  const upright = tooltip?.upright ?? false;
  const formatValue = tooltip?.formatValue ?? ((nextValue) => formatSliderValue(nextValue, step));
  const thumbRatio = getSliderThumbRatio(value, min, max);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const syncVisibility = useCallback(() => {
    setVisible(hoveringRef.current || draggingRef.current);
  }, []);

  const flashTooltip = useCallback(() => {
    clearHideTimer();
    setVisible(true);
    hideTimerRef.current = window.setTimeout(() => {
      if (!hoveringRef.current && !draggingRef.current) {
        setVisible(false);
      }
      hideTimerRef.current = null;
    }, TOOLTIP_FLASH_MS);
  }, [clearHideTimer]);

  useEffect(() => {
    if (tooltipContextKey !== undefined && tooltipContextRef.current !== tooltipContextKey) {
      tooltipContextRef.current = tooltipContextKey;
      prevValueRef.current = value;
      hoveringRef.current = false;
      draggingRef.current = false;
      clearHideTimer();
      setVisible(false);
      return;
    }

    if (prevValueRef.current === value) return;
    prevValueRef.current = value;
    if (!hoveringRef.current && !draggingRef.current) {
      flashTooltip();
    }
  }, [clearHideTimer, flashTooltip, tooltipContextKey, value]);

  useEffect(() => {
    const handlePointerUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      syncVisibility();
    };

    document.addEventListener("pointerup", handlePointerUp);
    return () => document.removeEventListener("pointerup", handlePointerUp);
  }, [syncVisibility]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  return (
    <div
      className={[styles.rangeSliderWrap, className].filter(Boolean).join(" ")}
      data-tooltip-key={tooltipKey}
      onPointerEnter={() => {
        hoveringRef.current = true;
        clearHideTimer();
        syncVisibility();
      }}
      onPointerLeave={() => {
        hoveringRef.current = false;
        if (!draggingRef.current) {
          syncVisibility();
        }
      }}
    >
      <input
        type="range"
        className={styles.rangeSlider}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerDown={() => {
          draggingRef.current = true;
          clearHideTimer();
          syncVisibility();
        }}
        aria-label={label}
      />
      {visible ? (
        <div
          className={styles.sliderValueTooltip}
          role="tooltip"
          data-placement={placement}
          data-upright={upright ? "true" : undefined}
          style={{ left: `${thumbRatio * 100}%` }}
        >
          {formatValue(value)}
        </div>
      ) : null}
    </div>
  );
});

RangeSlider.displayName = "RangeSlider";

const StepButton = memo(({ variant, onClick, disabled, "aria-label": ariaLabel, highlighted = false }) => (
  <button
    type="button"
    className={[
      variant === "minus" ? styles.stepButtonMinus : styles.stepButtonPlus,
      highlighted ? styles.isQaHighlighted : "",
    ]
      .filter(Boolean)
      .join(" ")}
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
  >
    <TriangleIcon />
  </button>
));

// 増減ボタンの並び。horizontal は左右、vertical は上下（軸操作向け）。
// minusHighlighted/plusHighlighted: Visual QAが「今この増減ボタンを押している」ことを示す強調。
export const StepButtonGroup = memo(
  ({
    className,
    orientation = "horizontal",
    min,
    max,
    step,
    value,
    onChange,
    label,
    disabled = false,
    minusHighlighted = false,
    plusHighlighted = false,
  }) => {
    const [numericMin, numericMax, numericStep] = toNumericRange(min, max, step);
    const decrement = () => onChange(clampStep(value - numericStep, numericMin, numericMax, numericStep));
    const increment = () => onChange(clampStep(value + numericStep, numericMin, numericMax, numericStep));

    const minusButton = (
      <StepButton
        variant="minus"
        onClick={decrement}
        disabled={disabled || value <= numericMin}
        aria-label={`${label} decrease`}
        highlighted={minusHighlighted}
      />
    );
    const plusButton = (
      <StepButton
        variant="plus"
        onClick={increment}
        disabled={disabled || value >= numericMax}
        aria-label={`${label} increase`}
        highlighted={plusHighlighted}
      />
    );

    const orientationClass =
      orientation === "vertical" ? styles.stepButtonGroupVertical : styles.stepButtonGroupHorizontal;

    return (
      <div className={[styles.stepButtonGroup, orientationClass, className].filter(Boolean).join(" ")}>
        {orientation === "vertical" ? (
          <>
            {plusButton}
            {minusButton}
          </>
        ) : (
          <>
            {minusButton}
            {plusButton}
          </>
        )}
      </div>
    );
  },
);

StepButtonGroup.displayName = "StepButtonGroup";
