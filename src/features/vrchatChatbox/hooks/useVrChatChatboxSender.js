import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { activeCueTextAtom, renderSettingsAtom } from "../../../stores/subtitleStore.js";
import { sendVrChatChatboxText } from "../services/vrchatChatboxApi.js";
import { formatVrChatChatboxText } from "../utils/chatboxText.js";

export const useVrChatChatboxSender = () => {
  const activeText = useAtomValue(activeCueTextAtom);
  const settings = useAtomValue(renderSettingsAtom);
  const lastSentTextRef = useRef("");

  useEffect(() => {
    if (!settings.vrchatChatboxEnabled) {
      lastSentTextRef.current = "";
      return;
    }

    const text = formatVrChatChatboxText(activeText);
    if (!text) {
      lastSentTextRef.current = "";
      return;
    }

    if (text === lastSentTextRef.current) return;
    lastSentTextRef.current = text;

    sendVrChatChatboxText({
      text,
      host: settings.vrchatChatboxHost,
      port: settings.vrchatChatboxPort,
    }).catch((error) => {
      console.warn("[vrchat-chatbox] send failed:", error);
    });
  }, [activeText, settings.vrchatChatboxEnabled, settings.vrchatChatboxHost, settings.vrchatChatboxPort]);
};