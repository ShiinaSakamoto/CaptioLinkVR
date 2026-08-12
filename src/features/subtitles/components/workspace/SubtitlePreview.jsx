import { useMemo } from "react";
import { NoticeIcon } from "../../../../shared/icons/index.jsx";
import { RubyText } from "../shared/RubyText.jsx";
import { DEFAULT_RENDER_SETTINGS } from "../../constants/defaultRenderSettings.js";
import { hexToRgba } from "../../utils/color.js";
import {
  calcEffectiveBackgroundOpacity,
  calcTextOpacityFactor,
} from "../../utils/subtitleOpacity.js";
import { ui } from "../../../../shared/uiText.js";
import styles from "../SubtitleWorkspace.module.scss";

const VR_FONT_SIZE_BASE = 96;
const LIVE_PREVIEW_FONT_PX = 2.4 * 16;
// CSS ruby は距離0でもブラウザ側で密着気味に見える。同じ換算で padding を足すと
// VRより広く感じるので、デスクトップの距離だけ減衰する（0のときは0のまま）。
const DESKTOP_RUBY_DISTANCE_DAMPEN = 0.25;

// VR の ruby_distance は font_size_percent とは独立（描画スケールのみ）。
// プレビューは同じ比率をベースにしつつ、上記 dampen で見栄えを揃える。
const calcPreviewRubyDistancePx = (rubyDistance) =>
  rubyDistance * (LIVE_PREVIEW_FONT_PX / VR_FONT_SIZE_BASE) * DESKTOP_RUBY_DISTANCE_DAMPEN;

// 字幕スタイルを反映して、実表示またはスタイル確認用の表示を行う。
export const SubtitlePreview = ({ activeText, settings, placeholder = ui.preview }) => {
  const trimmedActive = activeText?.trim() ?? "";
  const trimmedPlaceholder = placeholder?.trim() ?? "";
  const showingActive = Boolean(trimmedActive);
  const hasCaption = showingActive || Boolean(trimmedPlaceholder);
  const visibleText = showingActive ? trimmedActive : trimmedPlaceholder;
  const rubyDistancePx = useMemo(
    () => calcPreviewRubyDistancePx(settings.rubyDistance ?? DEFAULT_RENDER_SETTINGS.rubyDistance),
    [settings.rubyDistance],
  );
  const previewStyle = useMemo(() => {
    const textOpacityFactor = calcTextOpacityFactor(settings.textOpacityPercent);
    const wrapPercent = Math.min(
      100,
      Math.max(30, Number(settings.wrapWidthPercent ?? DEFAULT_RENDER_SETTINGS.wrapWidthPercent) || 55),
    );
    return {
    color: hexToRgba(settings.textColor, textOpacityFactor),
    WebkitTextStroke: settings.outlineEnabled
      ? `${Math.max(1, settings.outlineWidth / 4)}px ${hexToRgba(settings.outlineColor, textOpacityFactor)}`
      : "0",
    // stroke → fill の順で描き、縁が文字の外側に残るようにする（VRの袋文字に合わせる）
    paintOrder: settings.outlineEnabled ? "stroke fill" : "normal",
    textShadow: settings.shadowEnabled
      ? `0 0 ${settings.shadowBlur / 2}px ${hexToRgba(settings.shadowColor, textOpacityFactor * 0.65)}`
      : "none",
    background: settings.backgroundEnabled
      ? hexToRgba(
          settings.backgroundColor,
          calcEffectiveBackgroundOpacity(settings.textOpacityPercent, settings.backgroundOpacityPercent),
        )
      : "transparent",
    padding: settings.backgroundEnabled ? `${settings.backgroundPadding / 4}px ${settings.backgroundPadding / 2}px` : 0,
    transform: `translate(${settings.textOffsetX / 4}px, ${settings.textOffsetY / 4}px)`,
    "--ruby-distance": `${rubyDistancePx}px`,
    // VRの wrapWidthPercent に近づけたプレビュー幅（禁則位置までは一致しない）。
    width: `min(max-content, ${wrapPercent}%)`,
    maxWidth: `${wrapPercent}%`,
    };
  }, [
    rubyDistancePx,
    settings.backgroundColor,
    settings.backgroundEnabled,
    settings.backgroundOpacityPercent,
    settings.textOpacityPercent,
    settings.backgroundPadding,
    settings.outlineColor,
    settings.outlineEnabled,
    settings.outlineWidth,
    settings.shadowBlur,
    settings.shadowColor,
    settings.shadowEnabled,
    settings.textColor,
    settings.textOffsetX,
    settings.textOffsetY,
    settings.wrapWidthPercent,
  ]);

  return (
    <div className={styles.previewSection}>
      <div className={styles.subtitleStage}>
        <p className={styles.previewDisclaimer} role="note">
          <span className={styles.previewDisclaimerIcon} aria-hidden="true">
            <NoticeIcon />
          </span>
          <span className={styles.previewDisclaimerText}>{ui.previewDisclaimer}</span>
        </p>
        {hasCaption ? (
          <p
            className={showingActive ? styles.captionText : styles.captionPlaceholder}
            style={showingActive ? previewStyle : undefined}
          >
            <RubyText
              text={visibleText}
              rubyEnabled={settings.rubyEnabled}
              alignVisualLines
            />
          </p>
        ) : null}
      </div>
    </div>
  );
};
