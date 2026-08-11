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
      aria-labelledby="license-dialog-title"
      onMouseDown={handleOverlayMouseDown}
    >
      <div className={styles.noticeDialog}>
        <div className={styles.noticeHeader}>
          <h2 id="license-dialog-title">{ui.license}</h2>
          <button type="button" onClick={onClose}>
            {ui.close}
          </button>
        </div>
        <div className={styles.noticeBody}>
          <section className={styles.licenseIntro} aria-label={ui.licenseSummaryTitle}>
            <p className={styles.licenseDisclaimer}>{ui.licenseDisclaimer}</p>
            <h3 className={styles.licenseSectionTitle}>{ui.licenseSummaryTitle}</h3>
            <p className={styles.licenseSummary}>{ui.licenseSummaryBody}</p>
            <h3 className={styles.licenseSectionTitle}>{ui.licenseThirdPartyTitle}</h3>
          </section>
          <pre className={styles.noticePre}>{notices}</pre>
        </div>
      </div>
    </div>
  );
});

LicenseDialog.displayName = "LicenseDialog";
