import { useAtomValue } from "jotai";
import { visualQaHighlightKeyAtom, visualQaHighlightTargetAtom } from "../../../stores/subtitleStore.js";
import { useHighlightRef } from "./useHighlightRef.js";

// settingKey 一致時だけハイライト。target は部品強調用（slider / reset 等）。
export const useVisualQaHighlight = (settingKey) => {
  const highlightKey = useAtomValue(visualQaHighlightKeyAtom);
  const highlightTarget = useAtomValue(visualQaHighlightTargetAtom);
  const isHighlighted = Boolean(settingKey) && highlightKey === settingKey;
  const ref = useHighlightRef(isHighlighted);
  return { isHighlighted, ref, target: isHighlighted ? highlightTarget : null };
};
