import { useSetAtom } from "jotai";
import { memo, useCallback } from "react";
import { renderSettingsAtom } from "../../../../../stores/subtitleStore.js";
import { DEFAULT_RENDER_SETTINGS } from "../../../constants/defaultRenderSettings.js";
import { ui } from "../../../../../shared/uiText.js";
import styles from "../../SubtitleWorkspace.module.scss";

/**
 * VR設定パネル下部の「設定をすべて初期化」。
 * 高度な設定とは別セクションとして常に表示する。
 * 対象は描画設定（VR設定＋字幕スタイル）のみ。
 */
export const SettingsResetSection = memo(() => {
  const setRenderSettings = useSetAtom(renderSettingsAtom);

  const handleResetAll = useCallback(() => {
    setRenderSettings({ ...DEFAULT_RENDER_SETTINGS });
  }, [setRenderSettings]);

  return (
    <section className={styles.settingsResetSection} aria-label={ui.resetAllSettings}>
      <button
        type="button"
        className={styles.settingsResetButton}
        onClick={handleResetAll}
      >
        {ui.resetAllSettings}
      </button>
    </section>
  );
});

SettingsResetSection.displayName = "SettingsResetSection";
