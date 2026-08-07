export const subtitleSources = {
  none: "none",
  preset: "preset",
  custom: "custom",
};

export const CUSTOM_PRESET_ID = "__custom__";

export const isCustomPresetId = (presetId) => presetId === CUSTOM_PRESET_ID;

export const createEmptySubtitleFile = () => ({
  name: "",
  type: "",
  source: subtitleSources.none,
  presetId: "",
  displayName: "",
});

export const buildSubtitleFileFromCustom = (fileName) => ({
  name: fileName,
  type: fileName.split(".").pop()?.toUpperCase() || "",
  source: subtitleSources.custom,
  presetId: "",
  displayName: "",
});

export const buildSubtitleFileFromPreset = ({ presetId, displayName, fileName }) => ({
  name: fileName,
  type: fileName.split(".").pop()?.toUpperCase() || "",
  source: subtitleSources.preset,
  presetId,
  displayName,
});

export const formatCreditList = (names) => {
  if (!Array.isArray(names) || names.length === 0) return "";
  return names.join(" / ");
};

// ピッカー一覧用のクレジット情報。
export const getPresetPickerCredits = (meta) => {
  const supervisor = formatCreditList(meta?.credits?.supervisor);
  const editor = formatCreditList(meta?.credits?.editor);

  if (!supervisor && !editor) return null;
  return { supervisor, editor };
};
