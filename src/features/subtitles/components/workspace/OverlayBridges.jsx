import { memo } from "react";
import { useOverlayFrameSender } from "../../hooks/useOverlayFrameSender.js";
import { useVrChatChatboxSender } from "../../../vrchatChatbox/hooks/useVrChatChatboxSender.js";

// SteamVR / VRChat 送信 hook の購読をワークスペース本体から隔離する。
export const OverlayFrameBridge = memo(() => {
  useOverlayFrameSender();
  return null;
});

export const VrChatChatboxBridge = memo(() => {
  useVrChatChatboxSender();
  return null;
});
