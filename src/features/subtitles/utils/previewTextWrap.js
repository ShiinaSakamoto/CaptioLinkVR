import { parseRubyText } from "./rubyText.js";

// VR 側 windows_gdi/wrap.rs の禁則・優先折り返しと揃える（プレビュー用）。

export const isBreakAfterChar = (ch) =>
  /[ \t　、。，．，.！？!?・…‥：:;；」』）)】］\]〉》”'’ー～〜]/.test(ch);

export const isBreakBeforeChar = (ch) => /[「『（(【［\[〈《“"]/.test(ch);

export const isLineStartForbidden = (ch) =>
  /[、。，．，.！？!?」』）)】］\]〉》”'’ーぁぃぅぇぉっゃゅょァィゥェォッャュョ]/.test(ch);

export const isLineEndForbidden = (ch) => isBreakBeforeChar(ch);

/**
 * 1ハード行を測定済み units で折り返す。
 * @param {{ type: "char" | "ruby", ch?: string, width: number, source: string }[]} units
 * @param {number} wrapWidthPx
 */
export const wrapMeasuredUnits = (units, wrapWidthPx) => {
  if (!units.length) return [];

  const limit = Math.max(1, wrapWidthPx);
  const lines = [];
  let index = 0;

  while (index < units.length) {
    let width = 0;
    let end = index;

    while (end < units.length) {
      const nextWidth = units[end].width;
      if (width > 0 && width + nextWidth > limit) break;
      width += nextWidth;
      end += 1;
    }

    if (end === units.length) {
      lines.push(units.slice(index));
      break;
    }

    const breakAt = findBreakIndex(units, index, end);
    if (breakAt <= index) {
      const forceEnd = Math.max(index + 1, Math.min(end, units.length));
      lines.push(units.slice(index, forceEnd));
      index = forceEnd;
      continue;
    }

    lines.push(units.slice(index, breakAt));
    index = breakAt;
  }

  return lines;
};

export const findBreakIndex = (units, lineStart, overflowAt) => {
  if (overflowAt <= lineStart || overflowAt > units.length) {
    return Math.max(lineStart, overflowAt);
  }

  for (let split = overflowAt; split >= lineStart + 1; split -= 1) {
    if (!isValidSplit(units, split)) continue;
    const preferred =
      canBreakAfter(units[split - 1]) || prefersBreakBefore(units[split] ?? null);
    if (preferred) return split;
  }

  let split = overflowAt;
  while (split < units.length && split > lineStart && forbidsLineStart(units[split])) {
    split += 1;
  }
  if (split > lineStart && split <= units.length && isValidSplit(units, split)) {
    return split;
  }

  return overflowAt;
};

const isValidSplit = (units, split) => {
  if (split <= 0 || split > units.length) return false;
  if (split < units.length && forbidsLineStart(units[split])) return false;
  if (split > 0 && forbidsLineEnd(units[split - 1])) return false;
  return true;
};

const canBreakAfter = (unit) => {
  if (!unit) return false;
  // ルビ境界は優先改行にしない（VR wrap.rs と同じ）。
  if (unit.type === "ruby") return false;
  return isBreakAfterChar(unit.ch);
};

const prefersBreakBefore = (unit) => {
  if (!unit || unit.type !== "char") return false;
  return isBreakBeforeChar(unit.ch);
};

const forbidsLineStart = (unit) => {
  if (!unit || unit.type !== "char") return false;
  return isLineStartForbidden(unit.ch);
};

const forbidsLineEnd = (unit) => {
  if (!unit || unit.type !== "char") return false;
  return isLineEndForbidden(unit.ch);
};

const RUBY_FONT_RATIO = 0.42;

/** parseRubyText の parts を折返し単位へ展開する。 */
export const buildWrapUnits = (text, rubyEnabled, measureString) => {
  const parts = parseRubyText(String(text ?? ""), rubyEnabled);
  const units = [];

  for (const part of parts) {
    if (part.type === "ruby") {
      const baseWidth = measureString(part.base);
      const rubyWidth = measureString(part.ruby) * RUBY_FONT_RATIO;
      units.push({
        type: "ruby",
        width: Math.max(baseWidth, rubyWidth),
        source: `{${part.base}|${part.ruby}}`,
      });
      continue;
    }

    for (const ch of part.text) {
      units.push({
        type: "char",
        ch,
        width: measureString(ch),
        source: ch,
      });
    }
  }

  return units;
};

const serializeUnits = (units) => units.map((unit) => unit.source).join("");

/**
 * 明示改行は維持し、各行を wrapWidthPx で禁則付き折り返しする。
 * @returns {string} 改行込みテキスト（ルビトークンは維持）
 */
export const wrapPreviewText = (text, { rubyEnabled = true, wrapWidthPx, measureString } = {}) => {
  const source = String(text ?? "");
  if (!source || !Number.isFinite(wrapWidthPx) || wrapWidthPx <= 0 || typeof measureString !== "function") {
    return source;
  }

  return source
    .split(/\r?\n/)
    .map((hardLine) => {
      const units = buildWrapUnits(hardLine, rubyEnabled, measureString);
      if (!units.length) return "";
      return wrapMeasuredUnits(units, wrapWidthPx)
        .map(serializeUnits)
        .join("\n");
    })
    .join("\n");
};

/** Canvas でプレビュー同系フォントの文字幅を測る。 */
export const createCanvasTextMeasurer = (fontCss) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    return { measureString: (value) => String(value ?? "").length };
  }
  context.font = fontCss;
  return {
    measureString: (value) => context.measureText(String(value ?? "")).width,
  };
};
