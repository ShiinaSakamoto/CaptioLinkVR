import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo, useRef } from "react";
import {
  activeCueTextAtom,
  overlayStatusAtom,
  playbackAtom,
  renderSettingsAtom,
  timersAtom,
} from "../../../stores/subtitleStore.js";
import {
  checkSteamVrRunning,
  initializeSteamVrOverlay,
  setSteamVrOverlayVisible,
  updateSteamVrOverlayLayout,
} from "../../steamvrOverlay/steamVrOverlayApi.js";
import { getFrameSettings, prewarmOverlayFrame, sendOverlayTextFrame } from "../services/overlayFrameService.js";
import { requestOverlayRestart } from "../services/overlayRestartService.js";

const STEAMVR_CHECK_INTERVAL_MS = 10000;
const INITIAL_STEAMVR_CHECK_INTERVAL_MS = 1000;
const INITIAL_STEAMVR_CHECK_MAX_COUNT = 10;
/** スライダー連打時に描画要求をまとめる（見た目更新はフレーム送信が正）。 */
const VISUAL_REFRESH_COALESCE_MS = 32;
/** 設定変更後、無操作になってから予防再起動を試すまでの待ち。 */
const SETTINGS_IDLE_RESTART_MS = 1000;

export const useOverlayFrameSender = () => {
  const activeText = useAtomValue(activeCueTextAtom);
  const playback = useAtomValue(playbackAtom);
  const settings = useAtomValue(renderSettingsAtom);
  const overlayStatus = useAtomValue(overlayStatusAtom);
  const setOverlayStatus = useSetAtom(overlayStatusAtom);
  const [timers, setTimers] = useAtom(timersAtom);
  const checkingSteamVrRef = useRef(false);
  const overlayStatusRef = useRef(overlayStatus);
  const playbackRef = useRef(playback);
  const hasPrewarmedOverlayRef = useRef(false);
  const latestTextRef = useRef(activeText);
  const latestFrameSettingsRef = useRef(null);
  const latestPoseSettingsRef = useRef(null);
  const latestInitOverlaySettingsRef = useRef(null);

  // 同じ内容なら atom を触らず、購読側の不要な再描画を避ける。
  const writeOverlayStatus = (next) => {
    setOverlayStatus((current) => {
      if (
        current.connected === next.connected &&
        current.visible === next.visible &&
        current.lastError === next.lastError
      ) {
        return current;
      }
      return next;
    });
  };

  const frameSettings = useMemo(
    () => getFrameSettings(settings),
    [
      settings.width,
      settings.height,
      settings.overlayWidthMeters,
      settings.fontSize,
      settings.fontSizePercent,
      settings.wrapWidthPercent,
      settings.rubyEnabled,
      settings.rubyDistance,
      settings.textOffsetX,
      settings.textOffsetY,
      settings.autoTextureSize,
      settings.maxTextureWidth,
      settings.maxTextureHeight,
      settings.renderScale,
      settings.positionX,
      settings.positionY,
      settings.positionZ,
      settings.textColor,
      settings.textOpacityPercent,
      settings.backgroundEnabled,
      settings.backgroundColor,
      settings.backgroundOpacityPercent,
      settings.backgroundPadding,
      settings.outlineEnabled,
      settings.outlineColor,
      settings.outlineWidth,
      settings.shadowEnabled,
      settings.shadowColor,
      settings.shadowBlur,
    ],
  );

  // 姿勢だけ。物理幅はフレーム送信側がテクスチャ実寸に合わせて決める。
  const poseSettings = useMemo(
    () => ({
      positionX: settings.positionX,
      positionY: settings.positionY,
      positionZ: settings.positionZ,
      rotationX: settings.rotationX,
      rotationY: settings.rotationY,
      rotationZ: settings.rotationZ,
    }),
    [
      settings.positionX,
      settings.positionY,
      settings.positionZ,
      settings.rotationX,
      settings.rotationY,
      settings.rotationZ,
    ],
  );

  // 初期化API用（widthMeters は初回のみ。以降の layout 更新では Rust がサイズを保持する）。
  const initOverlaySettings = useMemo(
    () => ({
      width: settings.width,
      height: settings.height,
      overlayWidthMeters: settings.overlayWidthMeters,
      fontSize: settings.fontSize,
      fontSizePercent: settings.fontSizePercent,
      ...poseSettings,
    }),
    [
      settings.width,
      settings.height,
      settings.overlayWidthMeters,
      settings.fontSize,
      settings.fontSizePercent,
      poseSettings,
    ],
  );

  latestTextRef.current = activeText;
  latestFrameSettingsRef.current = frameSettings;
  latestPoseSettingsRef.current = poseSettings;
  latestInitOverlaySettingsRef.current = initOverlaySettings;
  playbackRef.current = playback;

  useEffect(() => {
    overlayStatusRef.current = overlayStatus;
  }, [overlayStatus]);

  const sendLatestFrame = () =>
    sendOverlayTextFrame({
      text: latestTextRef.current,
      settings: latestFrameSettingsRef.current,
    });

  useEffect(() => {
    let cancelled = false;

    const checkAndConnect = async () => {
      if (checkingSteamVrRef.current) return;
      checkingSteamVrRef.current = true;
      try {
        const running = await checkSteamVrRunning();
        if (!running) {
          hasPrewarmedOverlayRef.current = false;
          if (!cancelled) writeOverlayStatus({ connected: false, visible: false, lastError: "" });
          return;
        }

        if (overlayStatusRef.current.connected) return;

        await initializeSteamVrOverlay(latestInitOverlaySettingsRef.current);
        await setSteamVrOverlayVisible(true);
        if (!hasPrewarmedOverlayRef.current) {
          await prewarmOverlayFrame(latestFrameSettingsRef.current);
          hasPrewarmedOverlayRef.current = true;
        }
        if (!cancelled) writeOverlayStatus({ connected: true, visible: true, lastError: "" });
        await sendLatestFrame();
      } catch (error) {
        hasPrewarmedOverlayRef.current = false;
        if (!cancelled) writeOverlayStatus({ connected: false, visible: false, lastError: String(error) });
      } finally {
        checkingSteamVrRef.current = false;
      }
    };

    let initialCheckCount = 1;
    const initialIntervalId = window.setInterval(() => {
      if (overlayStatusRef.current.connected || initialCheckCount >= INITIAL_STEAMVR_CHECK_MAX_COUNT) {
        window.clearInterval(initialIntervalId);
        return;
      }
      initialCheckCount += 1;
      checkAndConnect();
    }, INITIAL_STEAMVR_CHECK_INTERVAL_MS);
    checkAndConnect();
    const intervalId = window.setInterval(checkAndConnect, STEAMVR_CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(initialIntervalId);
      window.clearInterval(intervalId);
    };
  }, [setOverlayStatus]);

  // 姿勢変更だけを layout へ。物理幅は触らない（一瞬小さく見えるのを防ぐ）。
  useEffect(() => {
    if (!overlayStatus.connected) return;

    let cancelled = false;
    const init = latestInitOverlaySettingsRef.current;

    const refreshPose = async () => {
      try {
        await updateSteamVrOverlayLayout({
          width: init.width,
          height: init.height,
          overlayWidthMeters: init.overlayWidthMeters,
          fontSize: init.fontSize,
          fontSizePercent: init.fontSizePercent,
          ...latestPoseSettingsRef.current,
        });
      } catch (error) {
        if (!cancelled) writeOverlayStatus({ connected: false, visible: false, lastError: String(error) });
      }
    };

    refreshPose();

    return () => {
      cancelled = true;
    };
  }, [poseSettings, overlayStatus.connected, setOverlayStatus]);

  // 見た目・サイズ変更はフレーム再送のみ。先に layout で base 幅を当てない。
  useEffect(() => {
    if (!overlayStatus.connected) return;

    let cancelled = false;
    const timerId = window.setTimeout(() => {
      const refreshVisual = async () => {
        try {
          await setSteamVrOverlayVisible(true);
          if (cancelled) return;
          await sendLatestFrame();
        } catch (error) {
          if (!cancelled) writeOverlayStatus({ connected: false, visible: false, lastError: String(error) });
        }
      };
      refreshVisual();
    }, VISUAL_REFRESH_COALESCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [frameSettings, overlayStatus.connected, setOverlayStatus]);

  // 設定変更後1秒無操作なら予防再起動（再生中50／停止中150）。
  useEffect(() => {
    if (!overlayStatus.connected) return;

    const timerId = window.setTimeout(() => {
      requestOverlayRestart({
        force: false,
        playing: playbackRef.current.isPlaying,
        text: latestTextRef.current,
        settings: latestFrameSettingsRef.current,
        reason: playbackRef.current.isPlaying
          ? "設定変更後1秒無操作（再生中）"
          : "設定変更後1秒無操作（停止中）",
      }).catch((error) => {
        console.warn("[overlay] proactive restart after settings idle failed:", error);
      });
    }, SETTINGS_IDLE_RESTART_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [frameSettings, overlayStatus.connected]);

  useEffect(() => {
    if (!overlayStatus.connected || playback.isPlaying) return;

    sendLatestFrame().catch((error) => {
      writeOverlayStatus({ connected: false, visible: false, lastError: String(error) });
    });
  }, [activeText, overlayStatus.connected, playback.isPlaying, setOverlayStatus]);

  useEffect(() => {
    return () => {
      if (timers.frameTimerId) window.clearInterval(timers.frameTimerId);
      setTimers((current) => ({ ...current, frameTimerId: null }));
    };
  }, []);
};
