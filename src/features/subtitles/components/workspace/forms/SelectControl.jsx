import { memo, useCallback, useId, useMemo, useRef, useState } from "react";
import { useDismissiblePopover } from "../../../../../shared/hooks/useDismissiblePopover.js";
import { ChevronDownIcon } from "../../../../../shared/icons/index.jsx";
import styles from "../../SubtitleWorkspace.module.scss";

// ネイティブ select の代わり。ドロップダウンリストに共通スクロールバーを適用できる。
export const SelectControl = memo(({
  id: idProp,
  value,
  onChange,
  options,
  disabled = false,
  className = "",
  placeholder = "",
  "aria-label": ariaLabel,
}) => {
  const autoId = useId();
  const id = idProp ?? autoId;
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);

  const visibleOptions = useMemo(
    () => options.filter((option) => !option.hidden),
    [options],
  );

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const triggerLabel = selectedOption?.label ?? placeholder;

  const close = useCallback(() => setOpen(false), []);

  const handleSelect = useCallback(
    (nextValue) => {
      if (disabled) return;
      onChange(nextValue);
      close();
    },
    [close, disabled, onChange],
  );

  useDismissiblePopover({ open, onClose: close, rootRef });

  return (
    <div ref={rootRef} className={[styles.selectControl, className].filter(Boolean).join(" ")}>
      <button
        type="button"
        id={id}
        className={[
          styles.selectTrigger,
          !selectedOption && placeholder ? styles.selectTriggerPlaceholder : "",
        ].filter(Boolean).join(" ")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          if (disabled) return;
          setOpen((current) => !current);
        }}
      >
        <span className={styles.selectTriggerLabel}>{triggerLabel}</span>
        <span
          className={[
            styles.selectTriggerChevron,
            open ? styles.selectTriggerChevronOpen : "",
          ].filter(Boolean).join(" ")}
          aria-hidden="true"
        >
          <ChevronDownIcon />
        </span>
      </button>

      {open ? (
        <ul className={styles.selectList} role="listbox" aria-labelledby={id}>
          {visibleOptions.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={value === option.value}
              className={[
                styles.selectOption,
                value === option.value ? styles.selectOptionSelected : "",
              ].filter(Boolean).join(" ")}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleSelect(option.value);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
});

SelectControl.displayName = "SelectControl";
