import { memo } from "react";
import { getPresetPickerCredits } from "../captionPresetUtils.js";
import { ui } from "../../../shared/uiText.js";
import styles from "../Captions.module.scss";

// ピッカー一覧のクレジット行。監修と制作で色・区切りを分ける。
export const PresetPickerCreditSubtitle = memo(({ supervisor, editor }) => (
  <span className={styles.presetPickerCardSubtitle}>
    {supervisor ? (
      <span className={styles.presetPickerCreditSupervisor}>
        {ui.supervisor}: {supervisor}
      </span>
    ) : null}
    {supervisor && editor ? (
      <span className={styles.presetPickerCreditDivider} aria-hidden="true">
        |
      </span>
    ) : null}
    {editor ? (
      <span className={styles.presetPickerCreditEditor}>
        {ui.editor}: {editor}
      </span>
    ) : null}
  </span>
));

PresetPickerCreditSubtitle.displayName = "PresetPickerCreditSubtitle";

export const buildPresetPickerSubtitle = (meta, fallbackName) => {
  const credits = meta ? getPresetPickerCredits(meta) : null;
  if (credits) {
    return <PresetPickerCreditSubtitle {...credits} />;
  }

  const fallback = meta?.worldName ?? fallbackName ?? "";
  if (!fallback) return null;

  return <span className={styles.presetPickerCardSubtitlePlain}>{fallback}</span>;
};
