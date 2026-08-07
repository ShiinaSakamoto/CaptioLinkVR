import { useSetAtom } from "jotai";
import { useCallback } from "react";
import { stopAttentionPulseAtom } from "../../../stores/subtitleStore.js";

// 再生中にロックされた操作へ反応し、停止ボタンへ注意リップルを送る。
export const useRequestStopAttention = () => {
  const setPulse = useSetAtom(stopAttentionPulseAtom);

  return useCallback(() => {
    setPulse((current) => current + 1);
  }, [setPulse]);
};
