import { invoke } from "@tauri-apps/api/core";

const DEFAULT_CHATBOX_HOST = "127.0.0.1";
const DEFAULT_CHATBOX_PORT = 9000;

export const sendVrChatChatboxText = async ({ text, host = DEFAULT_CHATBOX_HOST, port = DEFAULT_CHATBOX_PORT }) => {
  return invoke("send_vrchat_chatbox_message", {
    text,
    host,
    port,
  });
};