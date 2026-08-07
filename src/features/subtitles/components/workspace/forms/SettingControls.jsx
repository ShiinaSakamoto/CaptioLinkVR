import { memo } from "react";
import { useVisualQaHighlight } from "../../../hooks/useVisualQaHighlight.js";
import { ui } from "../../../../../shared/uiText.js";
import styles from "../../SubtitleWorkspace.module.scss";

// テーマに溶け込むカスタムチェックボックス。見た目は span、操作は透明な input。
export const CheckboxControl = memo(({ checked, onChange, disabled = false, "aria-label": ariaLabel }) => (
  <span className={styles.checkboxControl}>
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.checked)}
    />
  </span>
));

CheckboxControl.displayName = "CheckboxControl";

// 機能のオンオフが詳細設定への入り口になる、スタイル一覧の1行。
// settingKey: enabledKey（例: backgroundEnabled）。Visual QAがこのON/OFFを操作中のときハイライトする。
export const SettingSection = memo(({ title, enabled, onEnabledChange, settingKey, children }) => {
  const isOn = Boolean(enabled);
  const { isHighlighted, ref } = useVisualQaHighlight(settingKey);

  return (
    <section
      className={[
        styles.styleFeatureRow,
        isOn ? styles.styleFeatureRowOn : styles.styleFeatureRowOff,
      ].join(" ")}
      data-enabled={String(isOn)}
    >
      <button
        ref={ref}
        type="button"
        className={[styles.featureEnableHeader, isHighlighted ? styles.isQaHighlighted : ""]
          .filter(Boolean)
          .join(" ")}
        aria-pressed={isOn}
        onClick={() => onEnabledChange(!enabled)}
      >
        <span className={styles.featureEnableLabel}>{title}</span>
        <span className={styles.featureSwitch} data-on={isOn ? "true" : "false"} aria-hidden="true">
          <span className={styles.featureSwitchTrack}>
            <span className={styles.featureSwitchThumb} />
          </span>
          <span className={styles.featureSwitchCaption}>
            {isOn ? ui.featureOn : ui.featureOff}
          </span>
        </span>
      </button>

      {isOn ? <div className={styles.featureEnableBody}>{children}</div> : null}
    </section>
  );
});

SettingSection.displayName = "SettingSection";

// VR設定の単独オプションなど、チェックボックス＋ラベルの並び。
export const ToggleSetting = memo(({ label, checked, onChange, disabled = false, settingKey }) => {
  const { isHighlighted, ref } = useVisualQaHighlight(settingKey);

  return (
    <label
      ref={ref}
      className={[
        styles.toggleSetting,
        disabled ? styles.settingControlDisabled : "",
        isHighlighted ? styles.isQaHighlighted : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <CheckboxControl checked={checked} disabled={disabled} aria-label={label} onChange={onChange} />
      <span className={styles.valueSteppedLabel}>{label}</span>
    </label>
  );
});

ToggleSetting.displayName = "ToggleSetting";
