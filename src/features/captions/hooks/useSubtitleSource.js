import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import {
  activeCueTextAtom,
  cueListScrollTopAtom,
  isPlaybackSourceLockedAtom,
  loadingPresetIdAtom,
  playbackAtom,
  playbackModes,
  presetMetaAtom,
  presetMetaErrorAtom,
  selectedCueIdAtom,
  selectedPresetIdAtom,
  subtitleCuesAtom,
  subtitleFileAtom,
} from "../../../stores/subtitleStore.js";
import { ui } from "../../../shared/uiText.js";
import { parseSubtitleFile } from "../../subtitles/utils/subtitleParsers.js";
import { getCaptionPresetMeta, readCaptionPresetSubtitle } from "../captionPresetApi.js";
import {
  buildSubtitleFileFromCustom,
  buildSubtitleFileFromPreset,
  createEmptySubtitleFile,
  CUSTOM_PRESET_ID,
} from "../captionPresetUtils.js";
import { resetSubtitleContent } from "../utils/resetSubtitleContent.js";
import { normalizeCountdownSeconds } from "../../subtitles/utils/playbackFormUtils.js";

const resetPresetUi = (setSelectedPresetId, setPresetMeta, setPresetMetaError, selectedPresetId = "") => {
  setSelectedPresetId(selectedPresetId);
  setPresetMeta(null);
  setPresetMetaError("");
};

export const useSubtitleSource = ({ stopPlayback, showOverlayMessage }) => {
  const [file, setFile] = useAtom(subtitleFileAtom);
  const setCues = useSetAtom(subtitleCuesAtom);
  const setSelectedCueId = useSetAtom(selectedCueIdAtom);
  const setCueListScrollTop = useSetAtom(cueListScrollTopAtom);
  const setActiveCueText = useSetAtom(activeCueTextAtom);
  const setPlayback = useSetAtom(playbackAtom);

  const [selectedPresetId, setSelectedPresetId] = useAtom(selectedPresetIdAtom);
  const [presetMeta, setPresetMeta] = useAtom(presetMetaAtom);
  const [presetMetaError, setPresetMetaError] = useAtom(presetMetaErrorAtom);
  const [loadingPresetId, setLoadingPresetId] = useAtom(loadingPresetIdAtom);
  const isPlaybackLocked = useAtomValue(isPlaybackSourceLockedAtom);

  const clearContent = useCallback(
    (emptyFile) => {
      resetSubtitleContent({
        setFile,
        setCues,
        setSelectedCueId,
        setCueListScrollTop,
        setActiveCueText,
        emptyFile,
      });
    },
    [setActiveCueText, setCueListScrollTop, setCues, setFile, setSelectedCueId],
  );

  const applyParsedSubtitle = useCallback(
    (nextFile, parsedCues, loadedMessage) => {
      const firstCue = parsedCues[0] || null;
      setFile(nextFile);
      setCues(parsedCues);
      setSelectedCueId(firstCue?.id || null);
      setCueListScrollTop(0);
      showOverlayMessage(loadedMessage);
    },
    [setCueListScrollTop, setCues, setFile, setSelectedCueId, showOverlayMessage],
  );

  const applyRecommendedPlayback = useCallback(
    (recommendedPlayback) => {
      if (!recommendedPlayback?.mode) return;
      setPlayback((current) => {
        if (current.isPlaying) return current;
        const next = { ...current };
        if (recommendedPlayback.mode === playbackModes.countdown) {
          next.mode = playbackModes.countdown;
          if (Number.isFinite(recommendedPlayback.countdownSeconds)) {
            next.countdownSeconds = normalizeCountdownSeconds(recommendedPlayback.countdownSeconds);
          }
        } else if (recommendedPlayback.mode === playbackModes.absolute) {
          next.mode = playbackModes.absolute;
        }
        return next;
      });
    },
    [setPlayback],
  );

  const loadCustomFile = useCallback(
    async (event) => {
      if (isPlaybackLocked) return;

      const selectedFile = event.target.files?.[0];
      if (!selectedFile) return;

      stopPlayback();
      resetPresetUi(setSelectedPresetId, setPresetMeta, setPresetMetaError, CUSTOM_PRESET_ID);

      const data = await selectedFile.text();
      const parsedCues = parseSubtitleFile(selectedFile.name, data);
      applyParsedSubtitle(
        buildSubtitleFileFromCustom(selectedFile.name),
        parsedCues,
        `${ui.fileLoaded}: ${selectedFile.name}`,
      );
    },
    [applyParsedSubtitle, isPlaybackLocked, setPresetMeta, setPresetMetaError, setSelectedPresetId, stopPlayback],
  );

  const loadPreset = useCallback(
    async (presetId) => {
      if (!presetId || isPlaybackLocked) return;

      stopPlayback();
      setSelectedPresetId(presetId);
      setLoadingPresetId(presetId);
      setPresetMetaError("");

      try {
        const [meta, subtitle] = await Promise.all([
          getCaptionPresetMeta(presetId),
          readCaptionPresetSubtitle(presetId),
        ]);
        setPresetMeta(meta);
        applyRecommendedPlayback(meta.recommendedPlayback);

        const parsedCues = parseSubtitleFile(subtitle.fileName, subtitle.content);
        applyParsedSubtitle(
          buildSubtitleFileFromPreset({
            presetId: subtitle.id,
            displayName: subtitle.displayName,
            fileName: subtitle.fileName,
          }),
          parsedCues,
          `${ui.presetLoaded}: ${subtitle.displayName}`,
        );
      } catch (error) {
        setPresetMeta(null);
        setPresetMetaError(String(error));
        showOverlayMessage(ui.presetLoadFailed);
      } finally {
        setLoadingPresetId("");
      }
    },
    [
      applyParsedSubtitle,
      applyRecommendedPlayback,
      setLoadingPresetId,
      setPresetMeta,
      setPresetMetaError,
      setSelectedPresetId,
      showOverlayMessage,
      stopPlayback,
      isPlaybackLocked,
    ],
  );

  const clearSubtitle = useCallback(() => {
    if (isPlaybackLocked) return;
    stopPlayback();
    resetPresetUi(setSelectedPresetId, setPresetMeta, setPresetMetaError);
    clearContent(createEmptySubtitleFile());
  }, [clearContent, isPlaybackLocked, setPresetMeta, setPresetMetaError, setSelectedPresetId, stopPlayback]);

  const clearCustomFile = useCallback(() => {
    if (isPlaybackLocked) return;
    stopPlayback();
    clearContent(createEmptySubtitleFile());
  }, [clearContent, isPlaybackLocked, stopPlayback]);

  const selectPreset = useCallback(
    (presetId) => {
      if (isPlaybackLocked) return;

      if (presetId === CUSTOM_PRESET_ID) {
        stopPlayback();
        resetPresetUi(setSelectedPresetId, setPresetMeta, setPresetMetaError, CUSTOM_PRESET_ID);
        clearContent(createEmptySubtitleFile());
        return;
      }

      if (!presetId) {
        clearSubtitle();
        return;
      }

      void loadPreset(presetId);
    },
    [clearContent, clearSubtitle, isPlaybackLocked, loadPreset, setPresetMeta, setPresetMetaError, setSelectedPresetId, stopPlayback],
  );

  return {
    file,
    selectedPresetId,
    presetMeta,
    presetMetaError,
    loadingPresetId,
    loadCustomFile,
    selectPreset,
    clearCustomFile,
  };
};
