import { memo, useEffect, useState } from "react";
import { ExternalLinkButton } from "./ExternalLinkButton.jsx";
import { PresetStartTriggerSequence } from "./PresetStartTriggerSequence.jsx";
import { readCaptionPresetStartTrigger } from "../captionPresetApi.js";
import { getPresetPickerCredits } from "../captionPresetUtils.js";
import { DividerLabelToggle } from "../../../shared/forms/DividerLabelToggle.jsx";
import { PresetPickerCreditSubtitle } from "./PresetPickerCreditSubtitle.jsx";
import { ui } from "../../../shared/uiText.js";
import styles from "../Captions.module.scss";

const emptyAssets = { presetId: "", frameUrls: [] };

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
      </div>
    ) : null}
  </div>
));

PresetInfoText.displayName = "PresetInfoText";

const PresetInfoBody = memo(({ panelId, meta, hasLinks, frameUrls }) => {
  const startTiming = meta.usage?.startTiming?.trim() || "";
  const hasFrames = frameUrls.length >= 2;

  return (
    <div
      id={panelId}
      className={[
        styles.presetInfoPanel,
        styles.presetInfoPanelMerged,
        hasFrames ? styles.presetInfoPanelSplit : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <PresetInfoText meta={meta} hasLinks={hasLinks} showStartTiming={!hasFrames} />
      {hasFrames ? (
        <PresetStartTriggerSequence
          key={meta.id}
          frames={frameUrls}
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
  const [assets, setAssets] = useState(emptyAssets);
  const metaKey = meta?.id ?? meta?.displayName ?? "";
  const matched = meta?.id && assets.presetId === meta.id;
  const frameUrls = matched ? assets.frameUrls : [];

  useEffect(() => {
    setDescriptionOpen(true);
  }, [metaKey]);

  useEffect(() => {
    let cancelled = false;
    const presetId = meta?.id;
    if (!presetId) {
      setAssets(emptyAssets);
      return undefined;
    }

    setAssets({ ...emptyAssets, presetId });

    readCaptionPresetStartTrigger(presetId)
      .then((image) => {
        if (cancelled) return;
        if (image?.id !== presetId) {
          setAssets({ ...emptyAssets, presetId });
          return;
        }
        setAssets({
          presetId,
          frameUrls: (image.frames ?? []).map((frame) => frame.dataUrl).filter(Boolean),
        });
      })
      .catch((loadError) => {
        console.warn("[captions] failed to load start_trigger images:", loadError);
        if (!cancelled) setAssets({ ...emptyAssets, presetId });
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

  const hasLinks = Boolean(meta?.worldUrl);

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
          frameUrls={frameUrls}
        />
      ) : null}
    </>
  );
});

CaptionPresetInfo.displayName = "CaptionPresetInfo";
