import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { NoticeIcon } from "../../../../shared/icons/index.jsx";
import { RubyText } from "../shared/RubyText.jsx";
import { DEFAULT_RENDER_SETTINGS } from "../../constants/defaultRenderSettings.js";
import { hexToRgba } from "../../utils/color.js";
import {
  calcEffectiveBackgroundOpacity,
  calcTextOpacityFactor,
} from "../../utils/subtitleOpacity.js";
import { createCanvasTextMeasurer, wrapPreviewText } from "../../utils/previewTextWrap.js";
import { ui } from "../../../../shared/uiText.js";
import styles from "../SubtitleWorkspace.module.scss";

const VR_FONT_SIZE_BASE = 96;
// _status-preview.scss の .captionText font-size（1.6rem）と揃える。
const LIVE_PREVIEW_FONT_PX = 1.6 * 16;
const LIVE_PREVIEW_PLACEHOLDER_FONT_PX = 1.2 * 16;
// CSS ruby は距離0でもブラウザ側で密着気味に見える。同じ換算で padding を足すと
// VRより広く感じるので、デスクトップの距離だけ減衰する（0のときは0のまま）。
const DESKTOP_RUBY_DISTANCE_DAMPEN = 0.25;

// VR の ruby_distance は font_size_percent とは独立（描画スケールのみ）。
// プレビューは同じ比率をベースにしつつ、上記 dampen で見栄えを揃える。
const calcPreviewRubyDistancePx = (rubyDistance) =>
  rubyDistance * (LIVE_PREVIEW_FONT_PX / VR_FONT_SIZE_BASE) * DESKTOP_RUBY_DISTANCE_DAMPEN;

const resolveWrapPercent = (settings) =>
  Math.min(
    100,
    Math.max(30, Number(settings.wrapWidthPercent ?? DEFAULT_RENDER_SETTINGS.wrapWidthPercent) || 80),
  );

// 字幕スタイルを反映して、実表示またはスタイル確認用の表示を行う。
export const SubtitlePreview = ({ activeText, settings, placeholder = ui.preview }) => {
  const stageRef = useRef(null);
  const [wrapWidthPx, setWrapWidthPx] = useState(0);
  const trimmedActive = activeText?.trim() ?? "";
  const trimmedPlaceholder = placeholder?.trim() ?? "";
  const showingActive = Boolean(trimmedActive);
  const hasCaption = showingActive || Boolean(trimmedPlaceholder);
  const visibleText = showingActive ? trimmedActive : trimmedPlaceholder;
  const wrapPercent = resolveWrapPercent(settings);
  const rubyDistancePx = useMemo(
    () => calcPreviewRubyDistancePx(settings.rubyDistance ?? DEFAULT_RENDER_SETTINGS.rubyDistance),
    [settings.rubyDistance],
  );

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const updateWrapWidth = () => {
      const horizontalPadding = settings.backgroundEnabled
        ? (Number(settings.backgroundPadding) || 0) / 2 * 2
        : 0;
      const budget = (stage.clientWidth * wrapPercent) / 100 - horizontalPadding;
      setWrapWidthPx(Math.max(1, budget));
    };

    updateWrapWidth();
    const observer = new ResizeObserver(updateWrapWidth);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [settings.backgroundEnabled, settings.backgroundPadding, wrapPercent, hasCaption]);

  const wrappedText = useMemo(() => {
    const fontPx = showingActive ? LIVE_PREVIEW_FONT_PX : LIVE_PREVIEW_PLACEHOLDER_FONT_PX;
    const { measureString } = createCanvasTextMeasurer(
      `${fontPx}px "Noto Sans JP", "Hiragino Sans", "Yu Gothic UI", sans-serif`,
    );
    return wrapPreviewText(visibleText, {
      rubyEnabled: settings.rubyEnabled,
      wrapWidthPx,
      measureString,
    });
  }, [settings.rubyEnabled, showingActive, visibleText, wrapWidthPx]);

  const previewStyle = useMemo(() => {
    const textOpacityFactor = calcTextOpacityFactor(settings.textOpacityPercent);
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
      padding: settings.backgroundEnabled
        ? `${settings.backgroundPadding / 4}px ${settings.backgroundPadding / 2}px`
        : 0,
      transform: `translate(${settings.textOffsetX / 4}px, ${settings.textOffsetY / 4}px)`,
      "--ruby-distance": `${rubyDistancePx}px`,
      // 幅は wrapWidthPercent。実際の折返し位置は JS（VRと同じ禁則）で入れる。
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
    wrapPercent,
  ]);

  return (
    <div className={styles.previewSection}>
      <div className={styles.subtitleStage} ref={stageRef}>
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
              text={wrappedText}
              rubyEnabled={settings.rubyEnabled}
              alignVisualLines={false}
            />
          </p>
        ) : null}
      </div>
    </div>
  );
};
