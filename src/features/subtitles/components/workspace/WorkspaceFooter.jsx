import { useSetAtom } from "jotai";
import { memo, useCallback, useRef } from "react";
import { visualQaUnlockedAtom } from "../../../../stores/subtitleStore.js";
import { openExternalUrl } from "../../../../shared/openExternalUrl.js";
import { GitHubIcon, XIcon } from "../../../../shared/icons/index.jsx";
import appMark from "../../../../assets/CaptioLinkVR_Logo.png";
import affiliationMark from "../../../../assets/Shiinarium.svg";
import { ui } from "../../../../shared/uiText.js";
import styles from "./WorkspaceFooter.module.scss";

// アプリロゴを一定時間内に連続クリックすると、開発/検証用の目視チェックボタンを解禁する隠し操作。
const VISUAL_QA_UNLOCK_CLICK_COUNT = 10;
const VISUAL_QA_UNLOCK_CLICK_WINDOW_MS = 2500;

const FOOTER_LINKS = {
  x: "https://x.com/Shiina_12siy",
  github: "https://github.com/ShiinaSakamoto/CaptioLinkVR",
  // Booth ショップURLが確定したら差し替え
  booth: "https://booth.pm/",
  // 募集用の専用フォームができたら差し替え
  worlds: "https://x.com/Shiina_12siy",
};

const openLink = (url) => {
  void openExternalUrl(url).catch((error) => {
    console.warn("failed to open external url", error);
  });
};

const FooterRuleSvg = memo(() => (
  <svg viewBox="812 0 317 359" fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <path
      d="M812.5 40.5V320.5H960.5C976.5 320.5 988.5 307.5 988.5 292.5V68.5C988.5 52.5 1001.5 40.5 1016.5 40.5H1128.5V320.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
));

FooterRuleSvg.displayName = "FooterRuleSvg";

const FooterFillSvg = memo(() => (
  <svg viewBox="0 0 317 359" fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <path
      d="M0.5 40.5V320.5H148.5C164.5 320.5 176.5 307.5 176.5 292.5V68.5C176.5 52.5 189.5 40.5 204.5 40.5H316.5V320.5L317 359L0 359Z"
      fill="currentColor"
    />
  </svg>
));

FooterFillSvg.displayName = "FooterFillSvg";

export const WorkspaceFooter = memo(({ onLicenseClick }) => {
  const setVisualQaUnlocked = useSetAtom(visualQaUnlockedAtom);
  const clickCountRef = useRef(0);
  const lastClickAtRef = useRef(0);

  const handleLogoClick = useCallback(() => {
    const now = Date.now();
    if (now - lastClickAtRef.current > VISUAL_QA_UNLOCK_CLICK_WINDOW_MS) {
      clickCountRef.current = 0;
    }
    lastClickAtRef.current = now;
    clickCountRef.current += 1;
    if (clickCountRef.current >= VISUAL_QA_UNLOCK_CLICK_COUNT) {
      clickCountRef.current = 0;
      setVisualQaUnlocked(true);
    }
  }, [setVisualQaUnlocked]);

  return (
  <footer className={styles.footer} aria-label={ui.footerLabel}>
    <div className={styles.footerStage}>
      <div className={styles.footerFill} aria-hidden="true">
        <div className={`${styles.footerFillWing} ${styles.footerFillWingLeft}`} />
        <div className={styles.footerFillCenter}>
          <FooterFillSvg />
        </div>
        <div className={`${styles.footerFillWing} ${styles.footerFillWingRight}`} />
      </div>
      <div className={styles.footerFillTail} aria-hidden="true" />

      <div className={styles.footerRule} aria-hidden="true">
        <div className={`${styles.footerRuleWing} ${styles.footerRuleWingLeft}`} />
        <div className={styles.footerRuleCenter}>
          <FooterRuleSvg />
        </div>
        <div className={`${styles.footerRuleWing} ${styles.footerRuleWingRight}`} />
      </div>

      <div className={styles.footerContent}>
        {/* [ ロゴ+制作者 / SNS ] 狭いときロゴと制作者だけ縦積み */}
        <div className={styles.footerPrimary}>
          <div className={styles.footerBrand}>
            <button type="button" className={styles.footerLogoButton} onClick={handleLogoClick} aria-label={ui.appName}>
              <img className={styles.footerLogo} src={appMark} alt={ui.appName} />
            </button>
            <div className={styles.footerCredit}>
              <div className={styles.footerCreator}>
                <span className={styles.footerCreditLabel}>{ui.createdBy}</span>
                <strong className={styles.footerCreditName}>{ui.creatorName}</strong>
              </div>
              <div className={styles.footerAffiliation}>
                <span className={styles.footerCreditLabel}>{ui.affiliationOf}</span>
                <img
                  className={styles.footerAffiliationMark}
                  src={affiliationMark}
                  alt={ui.affiliationName}
                />
              </div>
            </div>
          </div>

          <div className={`${styles.footerSocial} ${styles.footerSocialLeft}`}>
            <button
              type="button"
              className={styles.footerSocialTextLink}
              onClick={() => openLink(FOOTER_LINKS.booth)}
              aria-label={ui.openBooth}
              title={ui.openBooth}
            >
              {ui.booth}
            </button>
          </div>

          <div className={`${styles.footerSocial} ${styles.footerSocialRight}`}>
            <button
              type="button"
              className={styles.footerSocialButton}
              onClick={() => openLink(FOOTER_LINKS.x)}
              aria-label={ui.openX}
              title={ui.openX}
            >
              <XIcon />
            </button>
            <button
              type="button"
              className={styles.footerSocialButton}
              onClick={() => openLink(FOOTER_LINKS.github)}
              aria-label={ui.openGitHub}
              title={ui.openGitHub}
            >
              <GitHubIcon />
            </button>
          </div>
        </div>

        {/* [ 文章 | 対応ワールド募集リンク ] */}
        <div className={styles.footerMessage}>
          <p className={styles.footerNoteBody}>{ui.footerNoteBody}</p>
          <button
            type="button"
            className={styles.footerNoteCta}
            onClick={() => openLink(FOOTER_LINKS.worlds)}
            aria-label={ui.openWorldsForm}
            title={ui.openWorldsForm}
          >
            <span>{ui.footerWorldsCta}</span>
            <span className={styles.footerNoteCtaArrow} aria-hidden="true">
              →
            </span>
          </button>
        </div>

        {/* ライセンス */}
        <div className={styles.footerLicense}>
          <button type="button" className={styles.licenseButton} onClick={onLicenseClick}>
            {ui.license}
          </button>
        </div>
      </div>
    </div>
  </footer>
  );
});

WorkspaceFooter.displayName = "WorkspaceFooter";
