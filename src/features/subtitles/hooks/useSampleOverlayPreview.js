import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import {
  activeCueTextAtom,
  overlayStatusAtom,
  playbackAtom,
  renderSettingsAtom,
  selectedCueIdAtom,
  timersAtom,
} from "../../../stores/subtitleStore.js";
import { ui } from "../../../shared/uiText.js";
import { requestOverlayRestart } from "../services/overlayRestartService.js";

/** 1文あたりの表示時間（ms） */
const SAMPLE_TEXT_INTERVAL_MS = 3000;

// 調整用サンプル字幕の表示とタイマー管理。
export const useSampleOverlayPreview = () => {
  const [playback] = useAtom(playbackAtom);
  const [timers, setTimers] = useAtom(timersAtom);
  const settings = useAtomValue(renderSettingsAtom);
  const overlayStatus = useAtomValue(overlayStatusAtom);
  const setSelectedCueId = useSetAtom(selectedCueIdAtom);
  const setActiveCueText = useSetAtom(activeCueTextAtom);
  const sampleIndexRef = useRef(0);
  const settingsRef = useRef(settings);
  const overlayConnectedRef = useRef(overlayStatus.connected);
  const messageDismissTimerRef = useRef(null);

  settingsRef.current = settings;
  overlayConnectedRef.current = overlayStatus.connected;

  const clearMessageDismissTimer = useCallback(() => {
    if (messageDismissTimerRef.current != null) {
      window.clearTimeout(messageDismissTimerRef.current);
      messageDismissTimerRef.current = null;
    }
  }, []);

  // options.maxMs: 指定時のみ自動消去（読み込み通知用）。字幕テストの巡回表示では使わない。
  const showOverlayMessage = useCallback((text, options = {}) => {
    clearMessageDismissTimer();
    setSelectedCueId(null);
    setActiveCueText(text);

    const maxMs = Number(options.maxMs);
    if (!Number.isFinite(maxMs) || maxMs <= 0) return;

    messageDismissTimerRef.current = window.setTimeout(() => {
      messageDismissTimerRef.current = null;
      // 再生や別メッセージで上書き済みなら消さない。
      setActiveCueText((current) => (current === text ? "" : current));
    }, maxMs);
  }, [clearMessageDismissTimer, setActiveCueText, setSelectedCueId]);

  const nextSampleText = useCallback(() => {
    const texts = ui.sampleTexts;
    if (!texts.length) return "";
    const text = texts[sampleIndexRef.current % texts.length];
    sampleIndexRef.current += 1;
    return text;
  }, []);

  const stopSampleText = useCallback(() => {
    clearMessageDismissTimer();
    sampleIndexRef.current = 0;
    setTimers((current) => {
      if (current.sampleTimerId) window.clearInterval(current.sampleTimerId);
      return { ...current, sampleTimerId: null };
    });
    setActiveCueText("");
    if (overlayConnectedRef.current) {
      requestOverlayRestart({
        force: true,
        text: "",
        settings: settingsRef.current,
        reason: "字幕テスト終了",
      }).catch((error) => {
        console.warn("[overlay] proactive restart after sample failed:", error);
      });
    }
  }, [clearMessageDismissTimer, setActiveCueText, setTimers]);

  const toggleSampleText = useCallback(() => {
    if (playback.isPlaying) return;
    if (timers.sampleTimerId) {
      stopSampleText();
      return;
    }

    sampleIndexRef.current = 0;
    showOverlayMessage(nextSampleText());
    const sampleTimerId = window.setInterval(() => {
      showOverlayMessage(nextSampleText());
    }, SAMPLE_TEXT_INTERVAL_MS);
    setTimers((current) => ({ ...current, sampleTimerId }));
  }, [nextSampleText, playback.isPlaying, setTimers, showOverlayMessage, stopSampleText, timers.sampleTimerId]);

  useEffect(() => {
    if (playback.isPlaying && timers.sampleTimerId) {
      stopSampleText();
    }
  }, [playback.isPlaying, stopSampleText, timers.sampleTimerId]);

  useEffect(() => () => clearMessageDismissTimer(), [clearMessageDismissTimer]);

  return { toggleSampleText, showOverlayMessage, stopSampleText };
};
