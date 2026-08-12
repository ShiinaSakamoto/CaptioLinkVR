import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useMemo, useRef } from "react";
import {
  activeCueIdAtom,
  activeCueTextAtom,
  overlayStatusAtom,
  playbackAtom,
  playbackModes,
  playbackTimingAtom,
  renderSettingsAtom,
  selectedCueIdAtom,
  subtitleCuesAtom,
  timersAtom,
} from "../../../stores/subtitleStore.js";
import { checkSteamVrRunning, initializeSteamVrOverlay, setSteamVrOverlayVisible } from "../../steamvrOverlay/steamVrOverlayApi.js";
import { prewarmOverlayFrame, sendOverlayTextFrame } from "../services/overlayFrameService.js";
import {
  isCriticalOverlayRestartWindow,
  LONG_GAP_RESTART_SECONDS,
  requestOverlayRestart,
  setOverlayFullRestartAllowed,
} from "../services/overlayRestartService.js";
import { buildCueText } from "../utils/cueText.js";
import { findActiveCueAt, getSecondsUntilNextCue, scheduleFutureCueTimelineEvents, toTimelineMs } from "../utils/cueScheduler.js";
import { buildCountdownText, calculateDelaySeconds, getCountdownDisplaySeconds } from "../utils/playbackTimeline.js";
import { disarmSampleTimer } from "../utils/sampleOverlayTimer.js";
import { clearTimerId, clearTimerIds } from "../utils/timerUtils.js";

const ZERO_COUNTDOWN_HOLD_MS = 1000;
/** これより長いカウントダウン開始時だけ force 予防再起動する。 */
const COUNTDOWN_FORCE_RESTART_MIN_SECONDS = 5;
/** 残りがこの秒になったら force 予防再起動する（開始ちょうどこの秒の二重実行は抑止）。 */
const COUNTDOWN_FORCE_RESTART_AT_SECONDS = 10;

// 字幕の再生開始、停止、途中ジャンプをまとめて扱うhook。
export const useSubtitlePlayback = () => {
  const cues = useAtomValue(subtitleCuesAtom);
  const settings = useAtomValue(renderSettingsAtom);
  const overlayStatus = useAtomValue(overlayStatusAtom);
  const [playback, setPlayback] = useAtom(playbackAtom);
  const setPlaybackTiming = useSetAtom(playbackTimingAtom);
  const setActiveCueId = useSetAtom(activeCueIdAtom);
  const setActiveCueText = useSetAtom(activeCueTextAtom);
  const setSelectedCueId = useSetAtom(selectedCueIdAtom);
  const [timers, setTimers] = useAtom(timersAtom);
  const setOverlayStatus = useSetAtom(overlayStatusAtom);
  const cueTimersRef = useRef([]);
  const activeCueIdRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const countdownStartTimerRef = useRef(null);
  const zeroCountdownTimerRef = useRef(null);
  const scheduledStartAtMsRef = useRef(null);
  const cuesScheduledRef = useRef(false);
  const zeroCountdownTokenRef = useRef(null);
  const overlayReadyRef = useRef(false);
  const settingsRef = useRef(settings);
  const countdownAt10RestartDoneRef = useRef(false);
  const longGapRestartKeyRef = useRef(null);
  const cuesRef = useRef(cues);

  settingsRef.current = settings;
  cuesRef.current = cues;

  const markOverlayError = (error) => {
    setOverlayStatus({ connected: false, visible: false, lastError: String(error) });
  };

  const syncFullRestartPolicy = () => {
    let remainingSeconds = null;
    let mainElapsedMs = null;
    const startAt = scheduledStartAtMsRef.current;
    if (startAt != null && !cuesScheduledRef.current) {
      remainingSeconds = Math.max(0, Math.ceil((startAt - Date.now()) / 1000));
    }
    if (startAt != null && cuesScheduledRef.current) {
      mainElapsedMs = Date.now() - startAt;
    }
    setOverlayFullRestartAllowed(
      !isCriticalOverlayRestartWindow({ remainingSeconds, mainElapsedMs }),
    );
  };

  const tryProactiveRestart = ({ force = false, text = "", reason } = {}) => {
    if (!overlayReadyRef.current) return;
    requestOverlayRestart({
      force,
      playing: true,
      text,
      settings: settingsRef.current,
      reason,
    }).catch((error) => {
      console.warn("[overlay] proactive restart failed:", error);
    });
  };

  const maybeRestartOnLongGap = (subtitleSeconds) => {
    const currentCues = cuesRef.current;
    if (findActiveCueAt(currentCues, subtitleSeconds)) {
      longGapRestartKeyRef.current = null;
      return;
    }
    const gapSeconds = getSecondsUntilNextCue(currentCues, subtitleSeconds);
    if (gapSeconds == null || gapSeconds < LONG_GAP_RESTART_SECONDS) return;

    const nextStart = subtitleSeconds + gapSeconds;
    const key = String(nextStart);
    if (longGapRestartKeyRef.current === key) return;
    longGapRestartKeyRef.current = key;
    tryProactiveRestart({
      force: false,
      text: "",
      reason: `キュー間ギャップ ${gapSeconds.toFixed(1)}秒（次開始 ${nextStart.toFixed(1)}s）`,
    });
  };

  const ensureOverlayReady = async () => {
    if (overlayStatus.connected) {
      try {
        await setSteamVrOverlayVisible(true);
        return true;
      } catch {
        // 接続状態が古い場合だけ、通常初期化へフォールバックする。
      }
    }

    try {
      const running = await checkSteamVrRunning();
      if (!running) {
        setOverlayStatus({ connected: false, visible: false, lastError: "" });
        return false;
      }

      await initializeSteamVrOverlay(settingsRef.current);
      await setSteamVrOverlayVisible(true);
      await prewarmOverlayFrame(settingsRef.current);
      setOverlayStatus({ connected: true, visible: true, lastError: "" });
      return true;
    } catch (error) {
      markOverlayError(error);
      return false;
    }
  };

  const clearCueTimers = ({ syncState = true } = {}) => {
    clearTimerIds(cueTimersRef.current);
    cueTimersRef.current = [];
    timers.cueTimerIds.forEach(clearTimerId);
    if (syncState) {
      setTimers((current) => ({ ...current, cueTimerIds: [] }));
    }
  };

  const clearCountdownTimers = () => {
    clearTimerIds([countdownTimerRef.current, countdownStartTimerRef.current, zeroCountdownTimerRef.current]);

    countdownTimerRef.current = null;
    countdownStartTimerRef.current = null;
    zeroCountdownTimerRef.current = null;
    zeroCountdownTokenRef.current = null;
  };

  const clearTimers = () => {
    clearCueTimers({ syncState: false });
    clearCountdownTimers();
    // sample の interval 実体は atom より module ref を正とする（stale closure で zombie 化しない）。
    disarmSampleTimer();

    // countdown / frame は最新 atom を読んで消す（メモ化で古い timers を掴んだままでも安全）。
    setTimers((current) => {
      if (current.countdownTimerId) clearTimerId(current.countdownTimerId);
      return {
        cueTimerIds: [],
        countdownTimerId: null,
        frameTimerId: current.frameTimerId,
        sampleTimerId: null,
      };
    });
  };

  const sendTextToOverlay = (text, { force = false } = {}) => {
    if (!overlayReadyRef.current) return;
    syncFullRestartPolicy();
    // OpenVR再起動中の一時失敗で切断扱いにしない。Rust側が最新フレームを保持する。
    sendOverlayTextFrame({ text, settings: settingsRef.current, force }).catch((error) => {
      console.warn("[overlay] frame send failed:", error);
    });
  };

  const activateCue = (cue, { force = false } = {}) => {
    if (!force && activeCueIdRef.current === cue.id) return;
    zeroCountdownTokenRef.current = null;
    longGapRestartKeyRef.current = null;
    activeCueIdRef.current = cue.id;
    setActiveCueId(cue.id);
    setSelectedCueId(cue.id);
    const text = buildCueText(cue);
    setActiveCueText(text);
    sendTextToOverlay(text, { force });
  };

  const clearActiveCue = () => {
    if (activeCueIdRef.current === null) return;
    activeCueIdRef.current = null;
    setActiveCueId(null);
    setActiveCueText("");
    sendTextToOverlay("");
  };

  const showCountdown = (remainingSeconds) => {
    activeCueIdRef.current = null;
    setActiveCueId(null);
    const text = buildCountdownText(remainingSeconds);
    setActiveCueText(text);
    sendTextToOverlay(text);
    setPlaybackTiming({
      scheduledStartAtMs: scheduledStartAtMsRef.current,
      remainingSeconds,
    });
  };

  const scheduleCueStarts = () => {
    clearCueTimers({ syncState: false });

    const baseStartAtMs = scheduledStartAtMsRef.current;
    const subtitleSeconds = (Date.now() - baseStartAtMs) / 1000;

    const syncCueToNow = () => {
      // Date.now 差分のミリ秒整数を秒へ戻して判定し、境界の float ずれを避ける。
      const currentSubtitleSeconds = (Date.now() - baseStartAtMs) / 1000;
      const activeNow = findActiveCueAt(cuesRef.current, currentSubtitleSeconds);
      if (activeNow) {
        activateCue(activeNow);
      } else {
        clearActiveCue();
        maybeRestartOnLongGap(currentSubtitleSeconds);
      }
      syncFullRestartPolicy();
    };

    const activeNow = findActiveCueAt(cuesRef.current, subtitleSeconds);
    if (activeNow) {
      activateCue(activeNow);
    } else {
      maybeRestartOnLongGap(subtitleSeconds);
    }

    const timerIds = scheduleFutureCueTimelineEvents({
      cues: cuesRef.current,
      baseStartAtMs,
      subtitleSeconds,
      syncCueToNow,
    });

    cueTimersRef.current = timerIds;
    disarmSampleTimer();
    setTimers((current) => ({
      ...current,
      cueTimerIds: timerIds,
      sampleTimerId: null,
    }));
  };

  const showZeroCountdownIfNeeded = () => {
    const firstCue = findActiveCueAt(cuesRef.current, 0);
    if (firstCue) {
      activateCue(firstCue);
      return;
    }

    const token = Symbol("zero-countdown");
    zeroCountdownTokenRef.current = token;
    showCountdown(0);
    zeroCountdownTimerRef.current = window.setTimeout(() => {
      if (zeroCountdownTokenRef.current === token) {
        setActiveCueText("");
        sendTextToOverlay("");
      }
    }, ZERO_COUNTDOWN_HOLD_MS);
  };

  // 0秒に到達した時点を字幕本編の開始時刻として扱う。
  const startCueSchedule = () => {
    if (cuesScheduledRef.current) return;

    cuesScheduledRef.current = true;
    clearCountdownTimers();
    setPlaybackTiming({
      scheduledStartAtMs: scheduledStartAtMsRef.current,
      remainingSeconds: 0,
    });
    syncFullRestartPolicy();
    showZeroCountdownIfNeeded();
    scheduleCueStarts();
  };

  const tickCountdown = () => {
    const remainingSeconds = Math.max(0, Math.ceil((scheduledStartAtMsRef.current - Date.now()) / 1000));
    if (remainingSeconds <= 0) {
      startCueSchedule();
      return;
    }

    showCountdown(remainingSeconds);
    syncFullRestartPolicy();

    if (
      remainingSeconds === COUNTDOWN_FORCE_RESTART_AT_SECONDS
      && !countdownAt10RestartDoneRef.current
    ) {
      countdownAt10RestartDoneRef.current = true;
      tryProactiveRestart({
        force: true,
        text: buildCountdownText(remainingSeconds),
        reason: `カウントダウン残り ${remainingSeconds} 秒`,
      });
    }

    const nextTickAtMs = scheduledStartAtMsRef.current - (remainingSeconds - 1) * 1000;
    const delayMs = Math.max(20, nextTickAtMs - Date.now());
    countdownTimerRef.current = window.setTimeout(tickCountdown, delayMs);
    setTimers((current) => ({ ...current, countdownTimerId: countdownTimerRef.current }));
  };

  const startCountdownSchedule = (countdownSeconds, { restartOnStart = false } = {}) => {
    clearCountdownTimers();
    clearCueTimers({ syncState: false });
    cuesScheduledRef.current = false;
    longGapRestartKeyRef.current = null;
    if (restartOnStart) {
      countdownAt10RestartDoneRef.current = false;
    }

    const safeCountdownSeconds = getCountdownDisplaySeconds(countdownSeconds);
    scheduledStartAtMsRef.current = Date.now() + safeCountdownSeconds * 1000;
    setPlaybackTiming({
      scheduledStartAtMs: scheduledStartAtMsRef.current,
      remainingSeconds: safeCountdownSeconds,
    });
    syncFullRestartPolicy();

    if (safeCountdownSeconds <= 0) {
      startCueSchedule();
      return scheduledStartAtMsRef.current;
    }

    if (restartOnStart) {
      // 再生開始時のみ。分・秒の微調整では走らせない。
      if (safeCountdownSeconds > COUNTDOWN_FORCE_RESTART_MIN_SECONDS) {
        tryProactiveRestart({
          force: true,
          text: buildCountdownText(safeCountdownSeconds),
          reason: `カウントダウン開始（${safeCountdownSeconds}秒）`,
        });
        // 開始ちょうど10秒のとき、直後の tick で残り10秒 force が二重に走らないようにする。
        if (safeCountdownSeconds === COUNTDOWN_FORCE_RESTART_AT_SECONDS) {
          countdownAt10RestartDoneRef.current = true;
        }
      }
    } else if (safeCountdownSeconds > COUNTDOWN_FORCE_RESTART_AT_SECONDS) {
      // 調整で10秒より長くなったら、あとで残り10秒 force を再度許可する。
      countdownAt10RestartDoneRef.current = false;
    } else if (safeCountdownSeconds === COUNTDOWN_FORCE_RESTART_AT_SECONDS) {
      // 調整の結果ちょうど10秒になった場合は、残り10秒 force を1回だけ行う。
      if (!countdownAt10RestartDoneRef.current) {
        countdownAt10RestartDoneRef.current = true;
        tryProactiveRestart({
          force: true,
          text: buildCountdownText(safeCountdownSeconds),
          reason: `カウントダウン残り ${safeCountdownSeconds} 秒`,
        });
      }
    } else {
      // すでに10秒未満なら残り10秒トリガーは不要。
      countdownAt10RestartDoneRef.current = true;
    }

    tickCountdown();
    countdownStartTimerRef.current = window.setTimeout(startCueSchedule, safeCountdownSeconds * 1000);
    disarmSampleTimer();
    setTimers((current) => ({
      ...current,
      countdownTimerId: countdownTimerRef.current,
      cueTimerIds: [],
      sampleTimerId: null,
    }));

    return scheduledStartAtMsRef.current;
  };

  const adjustCountdown = (deltaSeconds) => {
    if (playback.mode !== playbackModes.absolute || !playback.isPlaying || !scheduledStartAtMsRef.current || cuesScheduledRef.current) return;

    const currentRemainingSeconds = Math.max(0, Math.ceil((scheduledStartAtMsRef.current - Date.now()) / 1000));
    if (currentRemainingSeconds <= 0) return;

    const nextCountdownSeconds = Math.max(0, currentRemainingSeconds + deltaSeconds);
    startCountdownSchedule(nextCountdownSeconds, { restartOnStart: false });
  };

  const start = async () => {
    // 再生開始前の掃除では再起動しない（停止ボタン時のみ）。
    stop({ restartOverlay: false });

    const overlayReady = await ensureOverlayReady();
    overlayReadyRef.current = overlayReady;

    const countdownSeconds = getCountdownDisplaySeconds(calculateDelaySeconds(playback));
    startCountdownSchedule(countdownSeconds, { restartOnStart: true });

    setPlayback((current) => ({
      ...current,
      isPlaying: true,
    }));
  };

  const stop = ({ clearOverlay = true, restartOverlay = clearOverlay } = {}) => {
    const wasOverlayReady = overlayReadyRef.current;
    const settingsSnapshot = settingsRef.current;
    clearTimers();
    scheduledStartAtMsRef.current = null;
    overlayReadyRef.current = false;
    cuesScheduledRef.current = false;
    countdownAt10RestartDoneRef.current = false;
    longGapRestartKeyRef.current = null;
    activeCueIdRef.current = null;
    setOverlayFullRestartAllowed(true);
    setPlaybackTiming({ scheduledStartAtMs: null, remainingSeconds: null });
    setPlayback((current) => ({
      ...current,
      isPlaying: false,
    }));
    setActiveCueId(null);
    setActiveCueText("");
    if (wasOverlayReady && clearOverlay) {
      sendOverlayTextFrame({ text: "", settings: settingsSnapshot }).catch(() => {});
    }
    if (wasOverlayReady && restartOverlay) {
      requestOverlayRestart({
        force: true,
        text: "",
        settings: settingsSnapshot,
        reason: "字幕再生停止",
      }).catch((error) => {
        console.warn("[overlay] proactive restart after stop failed:", error);
      });
    }
  };

  const jumpToCue = (cue) => {
    // 直後に同じ行を再表示するので、空フレームを挟まない（消えて見えるのを防ぐ）。
    stop({ clearOverlay: false });
    const now = Date.now();
    const scheduledStartAtMs = now - toTimelineMs(cue.startTime);
    const overlayReady = overlayStatus.connected;
    scheduledStartAtMsRef.current = scheduledStartAtMs;
    overlayReadyRef.current = overlayReady;
    cuesScheduledRef.current = true;
    longGapRestartKeyRef.current = null;
    setPlaybackTiming({ scheduledStartAtMs, remainingSeconds: 0 });
    setPlayback((current) => ({
      ...current,
      isPlaying: true,
    }));
    syncFullRestartPolicy();
    activateCue(cue, { force: true });
    scheduleCueStarts();
  };

  return useMemo(
    () => ({
      start,
      stop,
      jumpToCue,
      adjustCountdown,
    }),
    [playback, cues, settings, overlayStatus.connected],
  );
};
