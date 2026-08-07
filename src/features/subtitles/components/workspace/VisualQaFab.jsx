import { memo, useCallback, useMemo, useState } from "react";
import { PauseIcon, PlayIcon } from "../../../../shared/icons/index.jsx";
import { VISUAL_QA_SPEED_OPTIONS, useVisualQaRunner } from "../../hooks/useVisualQaRunner.js";
import {
  DEFAULT_VISUAL_QA_SCENARIO,
  filterVisualQaScenarioByBlock,
  VISUAL_QA_BLOCK_IDS,
} from "../../visualQa/visualQaScenario.js";
import { ui } from "../../../../shared/uiText.js";
import styles from "../SubtitleWorkspace.module.scss";

const BLOCK_HIERARCHY = [
  { id: "all", label: () => ui.visualQaBlockAll, children: [] },
  {
    id: "settings",
    label: () => ui.vrPage,
    children: [
      { id: "settings.general", label: () => "全般" },
      { id: "settings.position", label: () => ui.position },
      { id: "settings.rotation", label: () => ui.rotation },
    ],
  },
  {
    id: "style",
    label: () => ui.style,
    children: [
      { id: "style.text", label: () => "文字" },
      { id: "style.ruby", label: () => "ルビ" },
      { id: "style.background", label: () => "背景" },
      { id: "style.outline", label: () => "袋文字" },
      { id: "style.shadow", label: () => "影" },
    ],
  },
];

const blockLabel = (blockId) => {
  for (const parent of BLOCK_HIERARCHY) {
    if (parent.id === blockId) return parent.label();
    const child = parent.children.find((c) => c.id === blockId);
    if (child) return child.label();
  }
  return blockId;
};

// フッターロゴ連打で出す検証用FAB。SteamVR未接続時は操作不可。
export const VisualQaFab = memo(() => {
  // 実行中に範囲を変えると矛盾するため、実行中はブロック選択不可。
  const [blockId, setBlockId] = useState("all");
  const [expandedParents, setExpandedParents] = useState(new Set());
  const scenario = useMemo(
    () => filterVisualQaScenarioByBlock(DEFAULT_VISUAL_QA_SCENARIO, blockId),
    [blockId],
  );

  const toggleParent = useCallback((parentId) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  }, []);

  const {
    isRunning,
    isLocked,
    isPlaybackLocked,
    isSteamVrWaiting,
    start,
    stop,
    progressInfo,
    speed,
    setSpeed,
    loop,
    toggleLoop,
  } = useVisualQaRunner(scenario);

  const handleToggle = useCallback(() => {
    if (isRunning) stop();
    else start();
  }, [isRunning, start, stop]);

  const handleSpeedChange = useCallback((newSpeed) => {
    setSpeed(newSpeed);
  }, [setSpeed]);

  const label = isRunning && progressInfo
    ? ui.visualQaStepLabel(progressInfo.index + 1, progressInfo.stepCount, progressInfo.label)
    : ui.visualQaStart;

  const lockHint = isPlaybackLocked ? ui.visualQaLocked : isSteamVrWaiting ? ui.steamVrLaunchWaiting : null;

  return (
    <div className={[styles.visualQaFab, isRunning ? styles.isExpanded : ""].filter(Boolean).join(" ")}>
      {lockHint ? <p className={styles.visualQaHint}>{lockHint}</p> : null}
      <div className={styles.visualQaBlockSelector} role="radiogroup" aria-label={ui.visualQaBlockLabel}>
        {BLOCK_HIERARCHY.map((parent) => (
          <div key={parent.id} className={styles.visualQaBlockGroup}>
            <button
              type="button"
              role="radio"
              aria-checked={blockId === parent.id}
              className={[styles.visualQaBlockButton, blockId === parent.id ? styles.isSelected : ""]
                .filter(Boolean)
                .join(" ")}
              disabled={isRunning}
              onClick={() => {
                setBlockId(parent.id);
                if (parent.children.length > 0) toggleParent(parent.id);
              }}
            >
              {parent.label()}
              {parent.children.length > 0 ? (expandedParents.has(parent.id) ? " ▲" : " ▼") : ""}
            </button>
            {parent.children.length > 0 && expandedParents.has(parent.id) ? (
              <div className={styles.visualQaBlockChildren}>
                {parent.children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    role="radio"
                    aria-checked={blockId === child.id}
                    className={[styles.visualQaBlockButton, styles.visualQaBlockChild, blockId === child.id ? styles.isSelected : ""]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={isRunning}
                    onClick={() => setBlockId(child.id)}
                  >
                    {child.label()}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <button
        type="button"
        className={styles.visualQaButton}
        onClick={handleToggle}
        disabled={isLocked}
        aria-pressed={isRunning}
        aria-label={isRunning ? ui.visualQaStop : ui.visualQaStart}
        title={isRunning ? ui.visualQaStop : ui.visualQaStart}
      >
        <span className={styles.visualQaIcon} aria-hidden="true">
          {isRunning ? <PauseIcon /> : <PlayIcon />}
        </span>
        <span className={styles.visualQaLabel}>{label}</span>
      </button>

      {isRunning && progressInfo ? (
        <div className={styles.visualQaBody}>
          <div className={styles.visualQaProgressTrack} aria-hidden="true">
            <div
              className={styles.visualQaProgressFill}
              style={{ width: `${Math.round(progressInfo.totalProgress * 100)}%` }}
            />
          </div>
          <div className={styles.visualQaOptions}>
            <div className={styles.visualQaSpeedSelector} role="radiogroup" aria-label={ui.visualQaSpeedLabel}>
              {VISUAL_QA_SPEED_OPTIONS.map((optionSpeed) => (
                <button
                  key={optionSpeed}
                  type="button"
                  role="radio"
                  aria-checked={speed === optionSpeed}
                  className={[styles.visualQaSpeedButton, speed === optionSpeed ? styles.isSelected : ""]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleSpeedChange(optionSpeed)}
                >
                  {ui.visualQaSpeed(optionSpeed)}
                </button>
              ))}
            </div>
            <label className={styles.visualQaLoopToggle}>
              <input type="checkbox" checked={loop} onChange={toggleLoop} />
              {ui.visualQaLoop}
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
});

VisualQaFab.displayName = "VisualQaFab";
