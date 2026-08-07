import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { isPlaybackSourceLockedAtom } from "../../../stores/subtitleStore.js";
import { useWorkspaceActions } from "../../subtitles/context/WorkspaceActionsContext.jsx";

// 再生中の字幕ソース変更ロックと、停止ボタンへの注意誘導。
export const usePlaybackSourceLock = () => {
  const isLocked = useAtomValue(isPlaybackSourceLockedAtom);
  const { requestStopAttention } = useWorkspaceActions();

  const notifyLockedAttempt = useCallback(() => {
    if (!isLocked) return;
    requestStopAttention();
  }, [isLocked, requestStopAttention]);

  return { isLocked, notifyLockedAttempt };
};
