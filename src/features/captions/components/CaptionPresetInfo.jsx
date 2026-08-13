import { memo, useEffect, useState } from "react";
import { ExternalLinkButton } from "./ExternalLinkButton.jsx";
import { readCaptionPresetStartTrigger } from "../captionPresetApi.js";
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

const PresetInfoText = memo(({ meta, hasLinks, showStartTiming }) => (
  <div className={styles.presetInfoText}>
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

    {showStartTiming && meta.usage?.startTiming ? (
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

PresetInfoText.displayName = "PresetInfoText";

const PresetStartTriggerFigure = memo(({ src, alt, startTiming }) => (
  <figure className={styles.presetStartTrigger}>
    <img className={styles.presetStartTriggerImage} src={src} alt={alt} />
    {startTiming ? (
      <figcaption className={styles.presetStartTriggerCaption}>
        <span className={styles.presetInfoLabel}>{ui.usageStartTiming}</span>
        <span className={styles.presetStartTriggerCaptionText}>{startTiming}</span>
      </figcaption>
    ) : null}
  </figure>
));

PresetStartTriggerFigure.displayName = "PresetStartTriggerFigure";

const PresetInfoBody = memo(({ panelId, meta, hasLinks, startTriggerSrc }) => {
  const startTiming = meta.usage?.startTiming?.trim() || "";
  const hasImage = Boolean(startTriggerSrc);

  return (
    <div
      id={panelId}
      className={[
        styles.presetInfoPanel,
        styles.presetInfoPanelMerged,
        hasImage ? styles.presetInfoPanelSplit : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <PresetInfoText meta={meta} hasLinks={hasLinks} showStartTiming={!hasImage} />
      {hasImage ? (
        <PresetStartTriggerFigure
          src={startTriggerSrc}
          alt={`${meta.displayName ?? meta.id} ${ui.usageStartTiming}`}
          startTiming={startTiming}
        />
      ) : null}
    </div>
  );
});

PresetInfoBody.displayName = "PresetInfoBody";

// プリセットコンボ（merged）専用。右側にクレジット＋説明開閉、下に詳細パネルを出す。
export const CaptionPresetInfo = memo(({ meta, error, loading, presetLabel = "", presetSelect = null }) => {
  const [descriptionOpen, setDescriptionOpen] = useState(true);
  // presetId と対で保持し、切替直後に別プリセットの画像が残らないようにする
  const [startTrigger, setStartTrigger] = useState({ presetId: "", dataUrl: null });
  const metaKey = meta?.id ?? meta?.displayName ?? "";
  const startTriggerSrc =
    meta?.id && startTrigger.presetId === meta.id ? startTrigger.dataUrl : null;

  useEffect(() => {
    setDescriptionOpen(true);
  }, [metaKey]);

  useEffect(() => {
    let cancelled = false;
    const presetId = meta?.id;
    if (!presetId) {
      setStartTrigger({ presetId: "", dataUrl: null });
      return undefined;
    }

    setStartTrigger({ presetId, dataUrl: null });

    readCaptionPresetStartTrigger(presetId)
      .then((image) => {
        if (cancelled) return;
        const dataUrl = image?.id === presetId ? image.dataUrl ?? null : null;
        setStartTrigger({ presetId, dataUrl });
      })
      .catch((loadError) => {
        console.warn("[captions] failed to load start_trigger.png:", loadError);
        if (!cancelled) setStartTrigger({ presetId, dataUrl: null });
      });

    return () => {
      cancelled = true;
    };
  }, [meta?.id]);

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
        <PresetInfoBody
          panelId={panelId}
          meta={meta}
          hasLinks={hasLinks}
          startTriggerSrc={startTriggerSrc}
        />
      ) : null}
    </>
  );
});

CaptionPresetInfo.displayName = "CaptionPresetInfo";
