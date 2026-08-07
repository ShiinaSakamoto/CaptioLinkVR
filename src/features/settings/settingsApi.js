import { invoke } from "@tauri-apps/api/core";

// ポータブル版 root の settings.json を Rust 経由で読み込む。
export const loadAppSettings = async () => {
  return invoke("load_app_settings");
};

// 保存先は Rust 側でポータブル root に固定する。呼び出し頻度の制御は UI 側で行う。
export const saveAppSettings = async (settings) => {
  return invoke("save_app_settings", { settings });
};
