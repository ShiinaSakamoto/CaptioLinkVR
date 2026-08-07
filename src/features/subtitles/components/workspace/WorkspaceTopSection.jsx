import { useAtomValue } from "jotai";
import { memo } from "react";
import { isSubtitlePreviewVisibleAtom } from "../../../../stores/subtitleStore.js";
import { UpdateBanner } from "../../../updates/components/UpdateBanner.jsx";
import { SubtitleSourceControls } from "../../../captions/components/SubtitleSourceControls.jsx";
import { LiveSubtitlePreview } from "./LiveSubtitlePreview.jsx";
import { CountdownModeControls, PlaybackControls, PlaybackRuntimeControls } from "./WorkspaceControls.jsx";
import { WorkspaceHeader } from "./WorkspaceHeader.jsx";
import styles from "../SubtitleWorkspace.module.scss";

export const WorkspaceTopSection = memo(({
  updateInfo,
  updateCheckError,
  appVersion,
  start,
  stop,
  adjustCountdown,
}) => {
  const hasSubtitlePreview = useAtomValue(isSubtitlePreviewVisibleAtom);

  return (
    <section
      className={[styles.workspaceTop, hasSubtitlePreview ? styles.hasSubtitlePreview : ""]
        .filter(Boolean)
        .join(" ")}
      aria-label="操作パネル"
    >
      <UpdateBanner updateInfo={updateInfo} />
      <WorkspaceHeader appVersion={appVersion} updateCheckError={updateCheckError} />
      <SubtitleSourceControls />
      <CountdownModeControls />
      <PlaybackControls start={start} stop={stop} />
      <PlaybackRuntimeControls onAdjust={adjustCountdown} />
      <LiveSubtitlePreview placeholder="" />
    </section>
  );
});

WorkspaceTopSection.displayName = "WorkspaceTopSection";
