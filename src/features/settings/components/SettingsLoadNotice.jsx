import { useAtom } from "jotai";
import { memo } from "react";
import { settingsLoadNoticeAtom } from "../../../stores/subtitleStore.js";
import { ui } from "../../../shared/uiText.js";
import styles from "./SettingsLoadNotice.module.scss";

export const SettingsLoadNotice = memo(() => {
  const [notice, setNotice] = useAtom(settingsLoadNoticeAtom);
  if (!notice) return null;

  return (
    <div className={styles.notice} role="status" aria-live="polite">
      <p className={styles.noticeText}>{notice}</p>
      <button
        type="button"
        className={styles.dismissButton}
        onClick={() => setNotice(null)}
        aria-label={ui.dismissNotice}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
});

SettingsLoadNotice.displayName = "SettingsLoadNotice";
