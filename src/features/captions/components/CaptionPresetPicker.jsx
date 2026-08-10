import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { CUSTOM_PRESET_ID, isCustomPresetId } from "../captionPresetUtils.js";
import { usePresetPickerMeta } from "../hooks/usePresetPickerMeta.js";
import { useDismissiblePopover } from "../../../shared/hooks/useDismissiblePopover.js";
import { ChevronDownIcon } from "../../../shared/icons/index.jsx";
import { ui } from "../../../shared/uiText.js";
import { buildPresetPickerSubtitle } from "./PresetPickerCreditSubtitle.jsx";
import { PresetPickerCard } from "./PresetPickerCard.jsx";
import styles from "../Captions.module.scss";

const PresetPickerSkeleton = memo(() => (
  <div className={styles.presetPickerSkeleton} aria-hidden="true">
    <span className={styles.presetPickerSkeletonTitle} />
    <span className={styles.presetPickerSkeletonSubtitle} />
  </div>
));

PresetPickerSkeleton.displayName = "PresetPickerSkeleton";

// プリセット専用のリッチピッカー。SelectControl とは別 UI。
export const CaptionPresetPicker = memo(
  ({
    id: idProp,
    value,
    onChange,
    presets,
    disabled = false,
    locked = false,
    lockedTitle = "",
    onLockedAttempt,
    placeholder = "",
    customLabel = ui.customPreset,
    triggerLabel: triggerLabelProp,
  }) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    const listboxId = `${id}-listbox`;
    const rootRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [focusIndex, setFocusIndex] = useState(-1);
    const { metaById, loading, loadError, ensureLoaded } = usePresetPickerMeta(presets);

    const items = useMemo(
      () => [{ id: CUSTOM_PRESET_ID, type: "custom" }, ...presets.map((preset) => ({ id: preset.id, type: "preset" }))],
      [presets],
    );

    const selectedPreset = useMemo(
      () => presets.find((preset) => preset.id === value),
      [presets, value],
    );

    const triggerLabel = useMemo(() => {
      if (triggerLabelProp) return triggerLabelProp;
      if (isCustomPresetId(value)) return customLabel;
      if (selectedPreset) return selectedPreset.displayName;
      return placeholder;
    }, [customLabel, placeholder, selectedPreset, triggerLabelProp, value]);

    const hasSelection = Boolean(value);
    const close = useCallback(() => {
      setOpen(false);
      setFocusIndex(-1);
    }, []);

    const handleSelect = useCallback(
      (nextValue) => {
        if (disabled || locked) return;
        onChange(nextValue);
        close();
      },
      [close, disabled, locked, onChange],
    );

    const openPicker = useCallback(() => {
      if (disabled || locked) return;
      setOpen(true);
      const selectedIndex = items.findIndex((item) => item.id === value);
      setFocusIndex(selectedIndex >= 0 ? selectedIndex : -1);
      void ensureLoaded();
    }, [disabled, ensureLoaded, items, locked, value]);

    const handleLockedAttempt = useCallback(() => {
      if (!locked || disabled) return;
      onLockedAttempt?.();
    }, [disabled, locked, onLockedAttempt]);

    const handleTriggerClick = useCallback(
      (event) => {
        event.stopPropagation();
        if (disabled) return;
        if (locked) {
          handleLockedAttempt();
          return;
        }
        if (open) {
          close();
          return;
        }
        openPicker();
      },
      [close, disabled, handleLockedAttempt, locked, open, openPicker],
    );

    const handleTriggerKeyDown = useCallback(
      (event) => {
        if (!locked || disabled) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        handleLockedAttempt();
      },
      [disabled, handleLockedAttempt, locked],
    );

    const handlePopoverKeyDown = useCallback(
      (event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setFocusIndex((current) => {
            const next = current < 0 ? 0 : current + 1;
            return next >= items.length ? 0 : next;
          });
          return;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          setFocusIndex((current) => {
            const next = current < 0 ? items.length - 1 : current - 1;
            return next < 0 ? items.length - 1 : next;
          });
          return;
        }

        if (event.key === "Enter" && focusIndex >= 0 && focusIndex < items.length) {
          event.preventDefault();
          handleSelect(items[focusIndex].id);
        }
      },
      [focusIndex, handleSelect, items],
    );

    useDismissiblePopover({
      open,
      onClose: close,
      rootRef,
      onKeyDown: handlePopoverKeyDown,
      preventEscapeDefault: true,
    });

    useEffect(() => {
      if (locked && open) close();
    }, [close, locked, open]);

    return (
      <div
        ref={rootRef}
        className={styles.presetPicker}
      >
        <button
          type="button"
          id={id}
          className={[
            styles.presetPickerTrigger,
            !hasSelection && placeholder ? styles.presetPickerTriggerPlaceholder : "",
            locked && !disabled ? styles.presetPickerTriggerLocked : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-disabled={disabled || locked ? true : undefined}
          disabled={disabled}
          title={locked && !disabled ? lockedTitle || ui.presetLockedWhilePlaying : undefined}
          onClick={handleTriggerClick}
          onKeyDown={handleTriggerKeyDown}
        >
          <span className={styles.presetPickerTriggerLabel}>{triggerLabel}</span>
          <span
            className={[styles.presetPickerTriggerChevron, open ? styles.presetPickerTriggerChevronOpen : ""]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          >
            <ChevronDownIcon />
          </span>
        </button>

        {open ? (
          <div id={listboxId} className={styles.presetPickerPopover} role="listbox" aria-labelledby={id}>
            <PresetPickerCard
              title={ui.customPreset}
              subtitle={ui.presetPickerCustomHint}
              selected={isCustomPresetId(value)}
              focused={focusIndex === 0}
              variant="custom"
              onSelect={() => handleSelect(CUSTOM_PRESET_ID)}
            />

            {loading ? (
              <div className={styles.presetPickerLoadingBlock} role="status" aria-live="polite">
                <span className={styles.presetPickerLoadingText}>{ui.presetPickerMetaLoading}</span>
                {presets.map((preset) => (
                  <PresetPickerSkeleton key={preset.id} />
                ))}
              </div>
            ) : (
              presets.map((preset, index) => {
                const itemIndex = index + 1;
                const meta = metaById[preset.id];
                return (
                  <PresetPickerCard
                    key={preset.id}
                    title={meta?.displayName ?? preset.displayName}
                    subtitle={buildPresetPickerSubtitle(meta, preset.displayName)}
                    selected={value === preset.id}
                    focused={focusIndex === itemIndex}
                    onSelect={() => handleSelect(preset.id)}
                  />
                );
              })
            )}

            {loadError ? (
              <p className={styles.presetPickerLoadError} role="status">
                {loadError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  },
);

CaptionPresetPicker.displayName = "CaptionPresetPicker";
