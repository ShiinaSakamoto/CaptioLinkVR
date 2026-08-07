import { invoke, isTauri } from "@tauri-apps/api/core";

// WebView では target=_blank が効かないため、OS の既定ブラウザで開く。
export const openExternalUrl = async (url) => {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) return;

  if (isTauri()) {
    await invoke("open_external_url", { url: trimmed });
    return;
  }

  window.open(trimmed, "_blank", "noopener,noreferrer");
};
