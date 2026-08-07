import { memo, useEffect, useState } from "react";
import { ExternalLinkButton } from "./ExternalLinkButton.jsx";
import { getPresetPickerCredits } from "../captionPresetUtils.js";
import { DividerLabelToggle } from "../../../shared/forms/DividerLabelToggle.jsx";
import { PresetPickerCreditSubtitle } from "./PresetPickerCreditSubtitle.jsx";
import { ui } from "../../../shared/uiText.js";
import styles from "../Captions.module.scss";

const PresetDescriptionToggle = memo(({ open, panelId, onToggle, credits }) => (
  <div className={styles.presetComboSideContent}>
    {credits ? (
      <div className={styles.presetComboSideCredits}>
        <PresetPickerCreditSubtitle {...credits} />
      </div>
    ) : null}
    <DividerLabelToggle
      open={open}
      panelId={panelId}
      onToggle={onToggle}
      openLabel={ui.presetOpenDescription}
      closeLabel={ui.presetCloseDescription}
    />
  </div>
));

PresetDescriptionToggle.displayName = "PresetDescriptionToggle";

const PresetInfoBody = memo(({ panelId, meta, hasLinks }) => (
  <div id={panelId} className={`${styles.presetInfoPanel} ${styles.presetInfoPanelMerged}`}>
    {meta.worldName ? (
      <p className={styles.presetInfoRow}>
        <span className={styles.presetInfoLabel}>{ui.worldName}</span>
        <span>{meta.worldName}</span>
      </p>
    ) : null}

    {meta.verifiedAt ? (
      <p className={styles.presetInfoRow}>
        <span className={styles.presetInfoLabel}>{ui.verifiedAt}</span>
        <span>{meta.verifiedAt}</span>
      </p>
    ) : null}

    {meta.usage?.summary ? (
      <p className={styles.presetInfoRow}>
        <span className={styles.presetInfoLabel}>{ui.usageSummary}</span>
        <span>{meta.usage.summary}</span>
      </p>
    ) : null}

    {meta.usage?.startTiming ? (
      <p className={styles.presetInfoRow}>
        <span className={styles.presetInfoLabel}>{ui.usageStartTiming}</span>
        <span>{meta.usage.startTiming}</span>
      </p>
    ) : null}

    {hasLinks ? (
      <div className={styles.presetInfoLinks}>
        <ExternalLinkButton label={ui.worldLink} url={meta.worldUrl} />
        <ExternalLinkButton label={ui.openGuideVideo} url={meta.links?.demoVideo} />
      </div>
    ) : null}
  </div>
));

PresetInfoBody.displayName = "PresetInfoBody";

// プリセットコンボ（merged）専用。右側にクレジット＋説明開閉、下に詳細パネルを出す。
export const CaptionPresetInfo = memo(({ meta, error, loading, presetLabel = "", presetSelect = null }) => {
  const [descriptionOpen, setDescriptionOpen] = useState(true);
  const metaKey = meta?.id ?? meta?.displayName ?? "";

  useEffect(() => {
    setDescriptionOpen(true);
  }, [metaKey]);

  const panelId = "caption-preset-info-panel";
  const toggleDescription = () => setDescriptionOpen((current) => !current);

  if (!presetSelect) return null;

  const sideContent = loading ? (
    <div className={styles.presetInfoStatusMerged} aria-live="polite">
      {ui.presetLoading}
    </div>
  ) : error ? (
    <div className={styles.presetInfoStatusMerged} role="status" aria-live="polite">
      <p className={styles.presetInfoError}>{ui.presetMetaFailed}</p>
      <p className={styles.presetInfoDetail}>{error}</p>
    </div>
  ) : meta ? (
    <PresetDescriptionToggle
      open={descriptionOpen}
      panelId={panelId}
      onToggle={toggleDescription}
      credits={getPresetPickerCredits(meta)}
    />
  ) : null;

  const hasLinks = Boolean(meta?.worldUrl || meta?.links?.demoVideo);

  return (
    <>
      <div className={styles.presetComboLayout}>
        <span className={styles.presetComboLabel}>{presetLabel}</span>
        <div className={styles.presetComboPicker}>{presetSelect}</div>
        <div className={styles.presetComboSide}>{sideContent}</div>
      </div>

      {meta && descriptionOpen ? (
        <PresetInfoBody panelId={panelId} meta={meta} hasLinks={hasLinks} />
      ) : null}
    </>
  );
});

CaptionPresetInfo.displayName = "CaptionPresetInfo";
