import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  activeCueTextAtom,
  advancedSettingsOpenAtom,
  overlayStatusAtom,
  playbackAtom,
  renderSettingsAtom,
  selectedCueIdAtom,
  timersAtom,
  visualQaHighlightKeyAtom,
  visualQaHighlightTargetAtom,
  vrAdjustPageAtom,
  workspaceMainPageAtom,
} from "../../../stores/subtitleStore.js";
import { ui } from "../../../shared/uiText.js";
import {
  beginDependsOnKey,
  finishDependsOnKey,
  getStepDurationMs,
  STEP_INTRO_MS,
  STEP_SETTLE_MS,
} from "../visualQa/visualQaEngine.js";
import { DEFAULT_VISUAL_QA_SCENARIO } from "../visualQa/visualQaScenario.js";
import { useSampleOverlayPreview } from "./useSampleOverlayPreview.js";

/** QA専用サンプル字幕間隔（字幕テストボタンとは独立。停止時の巻き戻り漏れ防止） */
const SAMPLE_TEXT_INTERVAL_MS = 3600;
export const VISUAL_QA_SPEED_OPTIONS = [1, 2, 4];

// 進捗補間ではなく離散アクション列を setTimeout チェーンで再生する。
// 開始前状態は snapshot し、停止時に必ず復元する。
export const useVisualQaRunner = (scenario = DEFAULT_VISUAL_QA_SCENARIO) => {
  const playback = useAtomValue(playbackAtom);
  const timers = useAtomValue(timersAtom);
  const overlayStatus = useAtomValue(overlayStatusAtom);
  const renderSettings = useAtomValue(renderSettingsAtom);
  const workspaceMainPage = useAtomValue(workspaceMainPageAtom);
  const vrAdjustPage = useAtomValue(vrAdjustPageAtom);
  const advancedOpen = useAtomValue(advancedSettingsOpenAtom);

  const setRenderSettings = useSetAtom(renderSettingsAtom);
  const setActiveCueText = useSetAtom(activeCueTextAtom);
  const setSelectedCueId = useSetAtom(selectedCueIdAtom);
  const setWorkspaceMainPage = useSetAtom(workspaceMainPageAtom);
  const setVrAdjustPage = useSetAtom(vrAdjustPageAtom);
  const setAdvancedOpen = useSetAtom(advancedSettingsOpenAtom);
  const setHighlightKey = useSetAtom(visualQaHighlightKeyAtom);
  const setHighlightTarget = useSetAtom(visualQaHighlightTargetAtom);
  const { stopSampleText } = useSampleOverlayPreview();

  const [isRunning, setIsRunning] = useState(false);
  const [progressInfo, setProgressInfo] = useState(null);
  const [speed, setSpeedState] = useState(1);
  const [loop, setLoopState] = useState(false);

  const timeoutRef = useRef(null);
  const sampleIntervalRef = useRef(null);
  const sampleIndexRef = useRef(0);
  const elapsedMsRef = useRef(0);
  const speedRef = useRef(1);
  const loopRef = useRef(false);
  const snapshotRef = useRef(null);
  const dependsSnapshotRef = useRef(null);

  const renderSettingsRef = useRef(renderSettings);
  renderSettingsRef.current = renderSettings;
  const workspaceMainPageRef = useRef(workspaceMainPage);
  workspaceMainPageRef.current = workspaceMainPage;
  const vrAdjustPageRef = useRef(vrAdjustPage);
  vrAdjustPageRef.current = vrAdjustPage;
  const advancedOpenRef = useRef(advancedOpen);
  advancedOpenRef.current = advancedOpen;

  const stepDurations = useMemo(() => scenario.map((step) => getStepDurationMs(step)), [scenario]);
  const stepStartOffsets = useMemo(() => {
    let acc = 0;
    return stepDurations.map((duration) => {
      const start = acc;
      acc += duration;
      return start;
    });
  }, [stepDurations]);
  const totalDurationMs = useMemo(() => stepDurations.reduce((sum, d) => sum + d, 0), [stepDurations]);

  const isPlaybackLocked = playback.isPlaying;
  const isSteamVrWaiting = !overlayStatus.connected;
  const isLocked = isPlaybackLocked || isSteamVrWaiting;

  const clearScheduled = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const clearSampleInterval = useCallback(() => {
    if (sampleIntervalRef.current) {
      window.clearInterval(sampleIntervalRef.current);
      sampleIntervalRef.current = null;
    }
  }, []);

  const showNextSampleText = useCallback(() => {
    const texts = ui.sampleTexts;
    if (!texts.length) return;
    setSelectedCueId(null);
    setActiveCueText(texts[sampleIndexRef.current % texts.length]);
    sampleIndexRef.current += 1;
  }, [setActiveCueText, setSelectedCueId]);

  const stop = useCallback(() => {
    clearScheduled();
    clearSampleInterval();
    setIsRunning(false);
    setProgressInfo(null);
    setHighlightKey(null);
    setHighlightTarget(null);
    dependsSnapshotRef.current = null;

    if (snapshotRef.current) {
      const snapshot = snapshotRef.current;
      snapshotRef.current = null;
      setRenderSettings(snapshot.renderSettings);
      setWorkspaceMainPage(snapshot.workspaceMainPage);
      setVrAdjustPage(snapshot.vrAdjustPage);
      setAdvancedOpen(snapshot.advancedOpen);
    }

    // QA専用のサンプル字幕ループを必ず自分で後始末する（既存の字幕テスト機能とは独立）。
    setActiveCueText("");
    setSelectedCueId(null);
  }, [
    clearSampleInterval,
    clearScheduled,
    setActiveCueText,
    setAdvancedOpen,
    setHighlightKey,
    setHighlightTarget,
    setRenderSettings,
    setSelectedCueId,
    setVrAdjustPage,
    setWorkspaceMainPage,
  ]);

  // ステップ切替時だけタブ/ハイライトを更新（毎アクションだと再レンダーがうるさい）。
  // target は最初のアクションまでクリアし、前ステップの部品強調が残らないようにする。
  const applyStepUiContext = useCallback(
    (step) => {
      setWorkspaceMainPage(step.tab);
      if (step.adjustPage) setVrAdjustPage(step.adjustPage);
      setAdvancedOpen(Boolean(step.openAdvanced));
      setHighlightKey(step.settingKeys[0] ?? null);
      setHighlightTarget(null);
    },
    [setAdvancedOpen, setHighlightKey, setHighlightTarget, setVrAdjustPage, setWorkspaceMainPage],
  );

  const updateProgress = useCallback(
    (stepIndex) => {
      const step = scenario[stepIndex];
      if (!step) return;
      const stepStart = stepStartOffsets[stepIndex];
      const stepDuration = stepDurations[stepIndex];
      const stepElapsed = elapsedMsRef.current - stepStart;
      setProgressInfo({
        index: stepIndex,
        label: step.label,
        stepCount: scenario.length,
        progress: stepDuration > 0 ? Math.min(1, Math.max(0, stepElapsed / stepDuration)) : 1,
        totalProgress: totalDurationMs > 0 ? Math.min(1, elapsedMsRef.current / totalDurationMs) : 1,
      });
    },
    [scenario, stepDurations, stepStartOffsets, totalDurationMs],
  );

  // 経過時間の加算・進捗更新・次のタイマー予約を1箇所に集約する。
  // elapsedMsRef はスピードに依存しない「名目上の」経過時間（進捗バー用）で、
  // 実際のタイマー発火だけをspeedで割って速くする。
  const scheduleAfter = useCallback(
    (ms, stepIndex, fn) => {
      elapsedMsRef.current += ms;
      updateProgress(stepIndex);
      timeoutRef.current = window.setTimeout(fn, ms / speedRef.current);
    },
    [updateProgress],
  );

  const runStepRef = useRef(null);
  const runActionRef = useRef(null);
  const finishStepRef = useRef(null);

  runStepRef.current = (stepIndex) => {
    if (stepIndex >= scenario.length) {
      if (loopRef.current) {
        elapsedMsRef.current = 0;
        runStepRef.current(0);
        return;
      }
      stop();
      return;
    }

    const step = scenario[stepIndex];
    applyStepUiContext(step);

    // dependsOnKey: 子設定（袋文字の太さ等）をテストする間だけ親機能を強制ONする。
    // 「今ONなら何もしない」は禁止。直前ステップの復元 setState と競合して
    // OFFのまま進むレースになるため、常に true を書き込む（beginDependsOnKey参照）。
    const dependStart = beginDependsOnKey({
      dependsOnKey: step.dependsOnKey,
      currentValue: renderSettingsRef.current[step.dependsOnKey],
      existingSnapshot: dependsSnapshotRef.current,
    });
    dependsSnapshotRef.current = dependStart.snapshot;
    if (dependStart.forceOn) {
      setRenderSettings((current) => ({ ...current, [step.dependsOnKey]: true }));
    }

    updateProgress(stepIndex);
    scheduleAfter(STEP_INTRO_MS + dependStart.introExtraMs, stepIndex, () => runActionRef.current(stepIndex, 0));
  };

  runActionRef.current = (stepIndex, actionIndex) => {
    const step = scenario[stepIndex];
    if (actionIndex >= step.actions.length) {
      scheduleAfter(STEP_SETTLE_MS, stepIndex, () => finishStepRef.current(stepIndex));
      return;
    }

    const action = step.actions[actionIndex];
    setRenderSettings((current) => ({ ...current, [action.key]: action.value }));
    // 増減/リセットボタン自体が「今押されている」ように見せるため、アクション種別ごとに対象を切り替える。
    // invertedIncrement フラグがtrueの場合、UI表示上の+/-ボタンが実データと逆符号なので、
    // increment⇔decrementを入れ替えてからハイライト対象を設定する。
    let targetKind = action.kind ?? null;
    if (step.invertedIncrement && targetKind === "increment") {
      targetKind = "decrement";
    } else if (step.invertedIncrement && targetKind === "decrement") {
      targetKind = "increment";
    }
    setHighlightTarget(targetKind);
    scheduleAfter(action.holdMs, stepIndex, () => runActionRef.current(stepIndex, actionIndex + 1));
  };

  finishStepRef.current = (stepIndex) => {
    const depends = dependsSnapshotRef.current;
    const nextStep = scenario[stepIndex + 1];
    const dependFinish = finishDependsOnKey({
      snapshot: depends,
      nextDependsOnKey: nextStep?.dependsOnKey,
    });
    if (dependFinish.shouldRestore && depends) {
      setRenderSettings((current) => ({ ...current, [depends.key]: depends.priorValue }));
    }
    if (dependFinish.clearSnapshot) {
      dependsSnapshotRef.current = null;
    }
    runStepRef.current(stepIndex + 1);
  };

  const start = useCallback(() => {
    if (isLocked || isRunning || scenario.length === 0) return;

    snapshotRef.current = {
      renderSettings: renderSettingsRef.current,
      workspaceMainPage: workspaceMainPageRef.current,
      vrAdjustPage: vrAdjustPageRef.current,
      advancedOpen: advancedOpenRef.current,
    };
    elapsedMsRef.current = 0;
    dependsSnapshotRef.current = null;

    // 既存の「字幕テスト送信」ループが動いていたら一旦止め、QA専用ループへ切り替える。
    // 2つのループが同時に activeCueTextAtom を書き換えると、停止時にどちらの後始末か曖昧になるため。
    if (timers.sampleTimerId) stopSampleText();
    sampleIndexRef.current = 0;
    showNextSampleText();
    sampleIntervalRef.current = window.setInterval(showNextSampleText, SAMPLE_TEXT_INTERVAL_MS);

    setIsRunning(true);
    runStepRef.current(0);
  }, [isLocked, isRunning, scenario.length, showNextSampleText, stopSampleText, timers.sampleTimerId]);

  const setSpeed = useCallback((value) => {
    speedRef.current = value;
    setSpeedState(value);
  }, []);

  const toggleLoop = useCallback(() => {
    loopRef.current = !loopRef.current;
    setLoopState(loopRef.current);
  }, []);

  // 実際の字幕再生が始まった、またはSteamVRが切断されたら、QAを自動で止める。
  useEffect(() => {
    if ((playback.isPlaying || !overlayStatus.connected) && isRunning) {
      stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playback.isPlaying, overlayStatus.connected]);

  useEffect(
    () => () => {
      clearScheduled();
      clearSampleInterval();
    },
    [clearScheduled, clearSampleInterval],
  );

  return {
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
    stepCount: scenario.length,
    totalDurationMs,
  };
};
