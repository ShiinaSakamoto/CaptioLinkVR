import { useSetAtom } from "jotai";
import { memo, useCallback } from "react";
import { renderSettingsAtom } from "../../../../../stores/subtitleStore.js";
import { DEFAULT_RENDER_SETTINGS } from "../../../constants/defaultRenderSettings.js";
import styles from "../../SubtitleWorkspace.module.scss";

/**
 * 設定パネル下部の初期化ボタン。
 * 渡された keys だけを DEFAULT_RENDER_SETTINGS に戻す。
 */
export const SettingsResetSection = memo(({ label, keys }) => {
  const setRenderSettings = useSetAtom(renderSettingsAtom);

  const handleReset = useCallback(() => {
    setRenderSettings((current) => {
      const next = { ...current };
      for (const key of keys) {
        if (Object.hasOwn(DEFAULT_RENDER_SETTINGS, key)) {
          next[key] = DEFAULT_RENDER_SETTINGS[key];
        }
      }
      return next;
    });
  }, [keys, setRenderSettings]);

  return (
    <section className={styles.settingsResetSection} aria-label={label}>
      <button
        type="button"
        className={styles.settingsResetButton}
        onClick={handleReset}
      >
        {label}
      </button>
    </section>
  );
});

SettingsResetSection.displayName = "SettingsResetSection";
