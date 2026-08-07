import { useAtomValue } from "jotai";
import { memo } from "react";
import {
  activeCueTextAtom,
  isSubtitlePreviewVisibleAtom,
  renderSettingsAtom,
} from "../../../../stores/subtitleStore.js";
import { SubtitlePreview } from "./SubtitlePreview.jsx";

// 再生中・字幕テスト中はプレビュー箱を維持（キュー間で activeText が空でも消さない）。
export const LiveSubtitlePreview = memo(({ placeholder = "" }) => {
  const visible = useAtomValue(isSubtitlePreviewVisibleAtom);
  const activeText = useAtomValue(activeCueTextAtom);
  const settings = useAtomValue(renderSettingsAtom);

  if (!visible) return null;

  return <SubtitlePreview activeText={activeText} settings={settings} placeholder={placeholder} />;
});

LiveSubtitlePreview.displayName = "LiveSubtitlePreview";
