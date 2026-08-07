import { useAtom, useAtomValue } from "jotai";
import { memo } from "react";
import { subtitleCuesAtom, workspaceMainPageAtom } from "../../../../stores/subtitleStore.js";
import { BasicSettingsPanel } from "./BasicSettingsPanel.jsx";
import { CueListPanel } from "./CueListPanel.jsx";
import { StyleSettingsPanel } from "./StyleSettingsPanel.jsx";
import { ui } from "../../../../shared/uiText.js";
import styles from "../SubtitleWorkspace.module.scss";

export const WorkspaceMainSection = memo(({ jumpToCue }) => {
  const cues = useAtomValue(subtitleCuesAtom);
  const [mainPage, setMainPage] = useAtom(workspaceMainPageAtom);

  return (
    <section className={styles.workspaceMain} aria-label="設定">
      <div className={styles.settingsShell}>
        <div className={styles.pageTabs} role="tablist" aria-label="設定カテゴリ">
          <button
            type="button"
            role="tab"
            aria-selected={mainPage === "settings"}
            className={mainPage === "settings" ? styles.isSelected : ""}
            onClick={() => setMainPage("settings")}
          >
            {ui.vrPage}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mainPage === "style"}
            className={mainPage === "style" ? styles.isSelected : ""}
            onClick={() => setMainPage("style")}
          >
            {ui.style}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mainPage === "cues"}
            className={mainPage === "cues" ? styles.isSelected : ""}
            onClick={() => setMainPage("cues")}
          >
            {ui.cuePage}
            <span>{cues.length}</span>
          </button>
        </div>

        <div className={styles.settingsShellBody}>
          {mainPage === "settings" && <BasicSettingsPanel />}

          {mainPage === "style" && <StyleSettingsPanel />}

          {mainPage === "cues" && <CueListPanel jumpToCue={jumpToCue} />}
        </div>
      </div>
    </section>
  );
});

WorkspaceMainSection.displayName = "WorkspaceMainSection";
