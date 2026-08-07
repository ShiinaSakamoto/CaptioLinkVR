import { invoke } from "@tauri-apps/api/core";

export const getAppVersion = async () => {
  return invoke("get_app_version");
};

export const checkForUpdates = async () => {
  return invoke("check_for_updates");
};

export const startUpdate = async (manifest) => {
  return invoke("start_update", { manifest });
};
