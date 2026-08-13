import { invoke } from "@tauri-apps/api/core";

export const listCaptionPresets = async () => {
  return invoke("list_caption_presets");
};

export const getCaptionPresetMeta = async (presetId) => {
  return invoke("get_caption_preset_meta", { presetId });
};

export const readCaptionPresetSubtitle = async (presetId) => {
  return invoke("read_caption_preset_subtitle", { presetId });
};

export const readCaptionPresetStartTrigger = async (presetId) => {
  return invoke("read_caption_preset_start_trigger", { presetId });
};
