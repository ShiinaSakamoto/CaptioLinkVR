import { useAtomValue } from "jotai";
import { memo } from "react";
import { overlayStatusAtom, renderSettingsAtom } from "../../../../stores/subtitleStore.js";
import { ui } from "../../../../shared/uiText.js";
import styles from "../SubtitleWorkspace.module.scss";
import appLogo from "../../../../assets/CaptioLinkVR_Logo_Text.png";

export const WorkspaceHeader = memo(({ appVersion, updateCheckError }) => {
  const overlayStatus = useAtomValue(overlayStatusAtom);
  const settings = useAtomValue(renderSettingsAtom);

  return (
    <div className={styles.header}>
      <div className={styles.headerMain}>
        <div className={styles.headerBrandRow}>
          <div className={styles.headerBrandBlock}>
            <img className={styles.appLogo} src={appLogo} alt={ui.appName} />
            <div className={styles.headerSubtitleRow}>
              <p className={styles.appSubtitle}>{ui.appSubtitle}</p>
              {appVersion ? <p className={styles.versionLabel}>v{appVersion}</p> : null}
            </div>
          </div>
          {updateCheckError ? (
            <div className={styles.headerMeta}>
              <p className={styles.updateCheckError} role="status" aria-live="polite">
                <span className={styles.updateCheckErrorLabel}>{ui.updateCheckFailed}</span>
                <span className={styles.updateCheckErrorDetail}>{updateCheckError}</span>
              </p>
            </div>
          ) : null}
        </div>
      </div>
      <div className={styles.headerActions}>
        <span
          className={[styles.steamVrStatus, overlayStatus.connected ? styles.steamVrConnected : styles.steamVrOffline].join(" ")}
          title={overlayStatus.lastError || ""}
        >
          {overlayStatus.connected ? ui.connected : ui.desktopMode}
        </span>
        {settings.vrchatChatboxEnabled ? (
          <span className={[styles.steamVrStatus, styles.steamVrConnected].join(" ")}>{ui.vrchatChatbox}</span>
        ) : null}
      </div>
    </div>
  );
});

WorkspaceHeader.displayName = "WorkspaceHeader";
