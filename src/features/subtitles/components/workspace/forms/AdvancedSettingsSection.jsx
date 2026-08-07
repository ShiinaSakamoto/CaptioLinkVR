import { memo, useId } from "react";
import { DividerLabelToggle } from "../../../../../shared/forms/DividerLabelToggle.jsx";
import { ui } from "../../../../../shared/uiText.js";
import styles from "../../SubtitleWorkspace.module.scss";

// VR設定の画質・FPSなど、常用しない項目をまとめて折りたたむ。
// open/onToggle: Visual QAが自動で開閉できるよう、開閉状態は呼び出し側（atom）が持つ。
export const AdvancedSettingsSection = memo(({ open, onToggle, children }) => {
  const panelId = useId();

  return (
    <div className={styles.advancedSettings}>
      <DividerLabelToggle
        open={open}
        panelId={panelId}
        onToggle={onToggle}
        openLabel={ui.advancedOpen}
        closeLabel={ui.advancedClose}
      />
      {open ? (
        <div id={panelId} className={styles.advancedSettingsBody}>
          {children}
        </div>
      ) : null}
    </div>
  );
});

AdvancedSettingsSection.displayName = "AdvancedSettingsSection";
