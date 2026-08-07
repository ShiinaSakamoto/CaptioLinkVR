import { memo } from "react";
import { ui } from "../../../../shared/uiText.js";
import styles from "../SubtitleWorkspace.module.scss";

export const LicenseDialog = memo(({ notices, onClose }) => {
  const handleOverlayMouseDown = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={styles.noticeOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="third-party-notices-title"
      onMouseDown={handleOverlayMouseDown}
    >
      <div className={styles.noticeDialog}>
        <div className={styles.noticeHeader}>
          <h2 id="third-party-notices-title">{ui.license}</h2>
          <button type="button" onClick={onClose}>
            {ui.close}
          </button>
        </div>
        <pre>{notices}</pre>
      </div>
    </div>
  );
});

LicenseDialog.displayName = "LicenseDialog";
