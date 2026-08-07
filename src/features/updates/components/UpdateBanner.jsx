import { useState } from "react";
import { formatInvokeError } from "../formatInvokeError.js";
import { startUpdate } from "../updateApi.js";
import { ui } from "../../../shared/uiText.js";
import styles from "./UpdateBanner.module.scss";

export const UpdateBanner = ({ updateInfo }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");

  if (!updateInfo) {
    return null;
  }

  const handleConfirm = async () => {
    setLaunching(true);
    setError("");
    try {
      await startUpdate({
        version: updateInfo.version,
        url: updateInfo.url,
        sha256: updateInfo.sha256,
        size: updateInfo.size ?? null,
      });
    } catch (launchError) {
      setLaunching(false);
      setError(formatInvokeError(launchError, ui.updateFailedUnknown));
    }
  };

  return (
    <>
      <div className={styles.banner} role="status" aria-live="polite">
        <span>{ui.updateAvailable(updateInfo.version)}</span>
        <button type="button" onClick={() => setShowConfirm(true)} disabled={launching}>
          {ui.updateAction}
        </button>
      </div>

      {showConfirm && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="update-confirm-title">
          <div className={styles.dialog}>
            <h2 id="update-confirm-title">{ui.updateConfirmTitle}</h2>
            <p>{ui.updateConfirmBody(updateInfo.currentVersion, updateInfo.version)}</p>
            {error && (
              <div className={styles.errorBox} role="alert">
                <p className={styles.errorTitle}>{ui.updateFailed}</p>
                <p className={styles.errorDetail}>{error}</p>
              </div>
            )}
            <div className={styles.actions}>
              <button type="button" onClick={() => setShowConfirm(false)} disabled={launching}>
                {ui.cancel}
              </button>
              <button type="button" onClick={handleConfirm} disabled={launching}>
                {launching ? ui.updateLaunching : ui.updateAction}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
