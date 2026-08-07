import { memo, useRef, useState } from "react";
import {
  findMatchingColorPreset,
  isLightHexColor,
  normalizeHexColor,
} from "../../../constants/styleColorPresets.js";
import { useVisualQaHighlight } from "../../../hooks/useVisualQaHighlight.js";
import { ui } from "../../../../../shared/uiText.js";
import styles from "../../SubtitleWorkspace.module.scss";

// ラベルに現在の色を含め、プリセット＋カスタム選択を置く設定行。
// settingKey: renderSettingsAtom のキー名。Visual QA がこの値を操作中のとき自動でハイライトする。
export const ColorSetting = memo(({
  label,
  value,
  onChange,
  presets = [],
  presetKindLabel = ui.colorPresets,
  disabled = false,
  settingKey,
}) => {
  const current = normalizeHexColor(value);
  const matchedPreset = findMatchingColorPreset(presets, current);
  const [customSelected, setCustomSelected] = useState(() => !matchedPreset);
  const colorInputRef = useRef(null);
  const isCustom = customSelected || !matchedPreset;
  const showColorPicker = isCustom || presets.length === 0;
  const { isHighlighted, ref } = useVisualQaHighlight(settingKey);

  const selectCustom = () => {
    setCustomSelected(true);
    // ネイティブピッカーを開く（対応ブラウザ）
    requestAnimationFrame(() => {
      colorInputRef.current?.click();
    });
  };

  return (
    <div
      ref={ref}
      className={[
        styles.colorSetting,
        disabled ? styles.settingControlDisabled : "",
        isHighlighted ? styles.isQaHighlighted : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.valueSteppedHeader}>
        <span className={styles.valueSteppedLabel}>{label}</span>
      </div>

      {presets.length > 0 ? (
        <div className={styles.colorPresetBlock}>
          <span className={styles.colorPresetCaption}>{ui.colorPresets}</span>

          <div className={styles.colorPresetRow} role="list" aria-label={ui.colorPresets}>
            {presets.map((preset) => {
              const selected = !isCustom && current === normalizeHexColor(preset.value);
              const light = isLightHexColor(preset.value);
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="listitem"
                  className={styles.colorPresetSwatch}
                  style={{ backgroundColor: preset.value }}
                  data-selected={selected ? "true" : "false"}
                  data-light={light ? "true" : "false"}
                  title={preset.label}
                  aria-label={ui.colorPresetOption(presetKindLabel, preset.label)}
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => {
                    setCustomSelected(false);
                    onChange(normalizeHexColor(preset.value));
                  }}
                />
              );
            })}

            <button
              type="button"
              role="listitem"
              className={styles.colorCustomButton}
              data-selected={isCustom ? "true" : "false"}
              aria-label={ui.colorPresetOption(presetKindLabel, ui.colorCustom)}
              aria-pressed={isCustom}
              disabled={disabled}
              onClick={selectCustom}
            >
              <span
                className={styles.colorCustomMarker}
                style={{ backgroundColor: current || value }}
                data-light={isLightHexColor(current || value) ? "true" : "false"}
                aria-hidden="true"
              />
              <span className={styles.colorCustomLabel}>{ui.colorCustom}</span>
            </button>
          </div>
        </div>
      ) : null}

      <input
        ref={colorInputRef}
        type="color"
        className={showColorPicker ? styles.colorSettingInput : styles.colorSettingInputHidden}
        value={current || value}
        disabled={disabled}
        tabIndex={showColorPicker ? 0 : -1}
        aria-hidden={showColorPicker ? undefined : "true"}
        aria-label={label}
        onChange={(event) => {
          setCustomSelected(true);
          onChange(event.target.value);
        }}
      />
    </div>
  );
});

ColorSetting.displayName = "ColorSetting";
