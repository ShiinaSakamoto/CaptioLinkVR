import { proactiveRestartOverlay } from "../../steamvrOverlay/steamVrOverlayApi.js";
import { sendOverlayTextFrame } from "./overlayFrameService.js";

/** 再生中の予防再起動に必要な送信成功回数 */
export const MIN_FRAMES_PLAYING = 50;
/** 停止中の予防再起動に必要な送信成功回数 */
export const MIN_FRAMES_IDLE = 150;

/** キュー間ギャップで予防再起動を試す最小秒数 */
export const LONG_GAP_RESTART_SECONDS = 6;

/** 失敗時フル再起動を抑止するカウントダウン残り秒 */
export const CRITICAL_COUNTDOWN_SECONDS = 3;

/** 本編開始直後にフル再起動を抑止するミリ秒 */
export const CRITICAL_MAIN_START_MS = 2000;

export {
  isOverlayFullRestartAllowed,
  setOverlayFullRestartAllowed,
} from "./overlayRestartPolicy.js";

export const resolveMinFrames = ({ force = false, playing = false } = {}) => {
  if (force) return 0;
  return playing ? MIN_FRAMES_PLAYING : MIN_FRAMES_IDLE;
};

/**
 * 安全なタイミングで予防再起動する。
 * 再起動した場合は直近テキストを force 再送する。
 * @param {string} [reason] ログ用の再起動理由
 */
export const requestOverlayRestart = async ({
  force = false,
  playing = false,
  text = "",
  settings,
  reason = "unspecified",
} = {}) => {
  const minFrames = resolveMinFrames({ force, playing });
  const restarted = await proactiveRestartOverlay({ force, minFrames });
  if (restarted) {
    console.log(`[overlay] proactive restart: ${reason}`, { force, minFrames, playing });
    if (settings) {
      await sendOverlayTextFrame({
        text,
        settings,
        force: true,
        allowFullRestart: true,
      });
    }
  }
  return Boolean(restarted);
};

/** カウントダウン残り・本編開始直後ならフル再起動を避ける。 */
export const isCriticalOverlayRestartWindow = ({
  remainingSeconds = null,
  mainElapsedMs = null,
} = {}) => {
  if (remainingSeconds != null && remainingSeconds > 0 && remainingSeconds < CRITICAL_COUNTDOWN_SECONDS) {
    return true;
  }
  if (mainElapsedMs != null && mainElapsedMs >= 0 && mainElapsedMs < CRITICAL_MAIN_START_MS) {
    return true;
  }
  return false;
};
