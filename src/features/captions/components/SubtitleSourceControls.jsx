import { memo, useRef } from "react";
import { useCaptionPresets } from "../hooks/useCaptionPresets.js";
import { usePlaybackSourceLock } from "../hooks/usePlaybackSourceLock.js";
import { useSubtitleSource } from "../hooks/useSubtitleSource.js";
import { useWorkspaceActions } from "../../subtitles/context/WorkspaceActionsContext.jsx";
import { FieldRow } from "../../../shared/forms/FieldRow.jsx";
import { CaptionPresetPicker } from "./CaptionPresetPicker.jsx";
import { CaptionPresetInfo } from "./CaptionPresetInfo.jsx";
import { LockedSourceControl } from "./LockedSourceControl.jsx";
import { isCustomPresetId, subtitleSources } from "../captionPresetUtils.js";
import { ui } from "../../../shared/uiText.js";
import styles from "../Captions.module.scss";

// プリセット選択・カスタムファイル読み込み・クリア操作。atoms と hook から直接状態を読む。
export const SubtitleSourceControls = memo(() => {
  const { presets, loadError: presetsError } = useCaptionPresets();
  const { stop, showOverlayMessage } = useWorkspaceActions();
  const { isLocked, notifyLockedAttempt } = usePlaybackSourceLock();
  const {
    file,
    selectedPresetId,
    presetMeta,
    presetMetaError,
    loadingPresetId,
    loadCustomFile,
    selectPreset,
    clearCustomFile,
  } = useSubtitleSource({ stopPlayback: stop, showOverlayMessage });

  const inputRef = useRef(null);
  const isLoadingPreset = Boolean(loadingPresetId);

  const handlePresetChange = (value) => {
    if (inputRef.current) inputRef.current.value = "";
    selectPreset(value);
  };

  const handleCustomFileChange = (event) => {
    if (isLocked) return;
    loadCustomFile(event);
    event.target.value = "";
  };

  const handleClear = () => {
    if (isLocked) return;
    if (inputRef.current) inputRef.current.value = "";
    clearCustomFile();
  };

  const isCustomMode = isCustomPresetId(selectedPresetId);
  const customOptionLabel =
    isCustomMode && file.source === subtitleSources.custom && file.name ? file.name : ui.customPreset;

  const hasPresetInfoSide = isLoadingPreset || Boolean(presetMetaError) || Boolean(presetMeta);
  const useMergedSelect = !isCustomMode && hasPresetInfoSide;

  const presetSelect = (
    <CaptionPresetPicker
      id="caption-preset-select"
      value={selectedPresetId}
      onChange={handlePresetChange}
      presets={presets}
      disabled={isLoadingPreset}
      locked={isLocked}
      lockedTitle={ui.presetLockedWhilePlaying}
      onLockedAttempt={notifyLockedAttempt}
      placeholder={ui.presetPlaceholder}
      customLabel={customOptionLabel}
    />
  );

  const presetField = (
    <FieldRow
      label={ui.presetSelect}
      compact
      className={useMergedSelect ? styles.presetComboField : ""}
    >
      {presetSelect}
    </FieldRow>
  );

  return (
    <div className={styles.subtitleSourceSection}>
      {isCustomMode ? (
        <div className={styles.workspaceControlSplit}>
          {presetField}
          <div className={styles.presetCustomPanel}>
            <LockedSourceControl
              as="label"
              className={styles.fileLabel}
              locked={isLocked}
              onLockedAttempt={notifyLockedAttempt}
            >
              {ui.fileSelect}
              <input
                ref={inputRef}
                type="file"
                accept=".srt,.ass,.assa"
                disabled={isLocked}
                onChange={handleCustomFileChange}
              />
            </LockedSourceControl>
            <LockedSourceControl
              as="button"
              type="button"
              className={styles.clearButton}
              locked={isLocked}
              onLockedAttempt={notifyLockedAttempt}
              onClick={handleClear}
            >
              {ui.clear}
            </LockedSourceControl>
          </div>
        </div>
      ) : hasPresetInfoSide ? (
        <div className={styles.presetSourceCombo}>
          <CaptionPresetInfo
            presetLabel={ui.presetSelect}
            presetSelect={presetSelect}
            meta={presetMeta}
            error={presetMetaError}
            loading={isLoadingPreset}
          />
        </div>
      ) : (
        <div className={styles.workspaceControlSplit}>{presetField}</div>
      )}

      {presetsError ? (
        <p className={styles.presetListError} role="status">
          {ui.presetListFailed}: {presetsError}
        </p>
      ) : null}
    </div>
  );
});

SubtitleSourceControls.displayName = "SubtitleSourceControls";
