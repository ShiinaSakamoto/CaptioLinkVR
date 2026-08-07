import thirdPartyNotices from "../../../../THIRD_PARTY_NOTICES.md?raw";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { visualQaUnlockedAtom } from "../../../stores/subtitleStore.js";
import { getAppVersion } from "../../updates/updateApi.js";
import { useUpdateCheck } from "../../updates/hooks/useUpdateCheck.js";
import { useAppSettingsPersistence } from "../hooks/useAppSettingsPersistence.js";
import { useSampleOverlayPreview } from "../hooks/useSampleOverlayPreview.js";
import { useRequestStopAttention } from "../hooks/useRequestStopAttention.js";
import { useSubtitlePlayback } from "../hooks/useSubtitlePlayback.js";
import { WorkspaceActionsProvider } from "../context/WorkspaceActionsContext.jsx";
import { LicenseDialog } from "./workspace/LicenseDialog.jsx";
import { OverlayFrameBridge, VrChatChatboxBridge } from "./workspace/OverlayBridges.jsx";
import { SampleOverlayFab } from "./workspace/SampleOverlayFab.jsx";
import { VisualQaFab } from "./workspace/VisualQaFab.jsx";
import { WorkspaceFooter } from "./workspace/WorkspaceFooter.jsx";
import { WorkspaceMainSection } from "./workspace/WorkspaceMainSection.jsx";
import { WorkspaceTopSection } from "./workspace/WorkspaceTopSection.jsx";
import styles from "./SubtitleWorkspace.module.scss";

// 字幕ワークスペース全体の状態を束ね、各パネルへ必要な操作だけ渡す。
export const SubtitleWorkspace = () => {
  useAppSettingsPersistence();
  const visualQaUnlocked = useAtomValue(visualQaUnlockedAtom);
  const { start, stop, jumpToCue, adjustCountdown } = useSubtitlePlayback();
  const { toggleSampleText, showOverlayMessage } = useSampleOverlayPreview();
  const requestStopAttention = useRequestStopAttention();
  const { updateInfo, updateCheckError } = useUpdateCheck();
  const [showLicenses, setShowLicenses] = useState(false);
  const [appVersion, setAppVersion] = useState("");

  const workspaceActions = useMemo(
    () => ({ stop, showOverlayMessage, requestStopAttention }),
    [requestStopAttention, showOverlayMessage, stop],
  );

  const openLicenseDialog = useCallback(() => {
    setShowLicenses(true);
  }, []);

  const closeLicenseDialog = useCallback(() => {
    setShowLicenses(false);
  }, []);

  useEffect(() => {
    getAppVersion()
      .then((version) => setAppVersion(version))
      .catch(() => {});
  }, []);

  return (
    <WorkspaceActionsProvider value={workspaceActions}>
      <main className={styles.workspace}>
        <OverlayFrameBridge />
        <VrChatChatboxBridge />
        <section className={styles.container}>
          <SampleOverlayFab onToggle={toggleSampleText} />

          <WorkspaceTopSection
            updateInfo={updateInfo}
            updateCheckError={updateCheckError}
            appVersion={appVersion}
            start={start}
            stop={stop}
            adjustCountdown={adjustCountdown}
          />

          <WorkspaceMainSection jumpToCue={jumpToCue} />
        </section>

        <section className={styles.workspaceFooter} aria-label="フッター">
          <WorkspaceFooter onLicenseClick={openLicenseDialog} />
        </section>

        {showLicenses ? <LicenseDialog notices={thirdPartyNotices} onClose={closeLicenseDialog} /> : null}

        {/* フッターロゴを10回連続クリックすると解禁される、開発/検証用の隠しQAボタン */}
        {visualQaUnlocked ? <VisualQaFab /> : null}
      </main>
    </WorkspaceActionsProvider>
  );
};
