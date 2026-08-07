import { memo } from "react";
import { openExternalUrl } from "../../../shared/openExternalUrl.js";
import { ExternalLinkIcon } from "../../../shared/icons/index.jsx";
import styles from "../Captions.module.scss";

export const ExternalLinkButton = memo(({ label, url }) => {
  if (!url) return null;

  const handleClick = () => {
    void openExternalUrl(url).catch((error) => {
      console.warn("failed to open external url", error);
    });
  };

  return (
    <button type="button" className={styles.externalLinkButton} onClick={handleClick}>
      <ExternalLinkIcon />
      <span>{label}</span>
    </button>
  );
});

ExternalLinkButton.displayName = "ExternalLinkButton";
