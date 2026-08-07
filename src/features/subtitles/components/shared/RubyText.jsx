import { useLayoutEffect, useMemo, useRef } from "react";
import { parseRubyText } from "../../utils/rubyText.js";
import { applyVisualRubyLinePositions } from "../../utils/rubyVisualLines.js";

const RubyLineParts = ({ text, rubyEnabled }) => {
  const parts = useMemo(() => parseRubyText(text, rubyEnabled), [rubyEnabled, text]);

  return parts.map((part, index) => {
    if (part.type !== "ruby") return part.text;
    return (
      <ruby key={`${part.base}-${index}`}>
        <rb>{part.base}</rb>
        <rt>{part.ruby}</rt>
      </ruby>
    );
  });
};

// 明示改行: 最終行のみ下ルビ。
// alignVisualLines: CSS 折り返し後の視覚最終行のみ下ルビ（本文行で判定）。
export const RubyText = ({ text, rubyEnabled = true, alignVisualLines = false }) => {
  const rootRef = useRef(null);
  const lines = useMemo(() => String(text ?? "").split(/\r?\n/), [text]);
  const lastIndex = Math.max(0, lines.length - 1);

  useLayoutEffect(() => {
    if (!alignVisualLines) return undefined;

    const root = rootRef.current;
    if (!root) return undefined;

    const sync = () => {
      applyVisualRubyLinePositions(root);
    };

    sync();
    // over/under 切替で行箱がわずかに変わることがあるので、描画後にもう一度合わせる。
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      sync();
      raf2 = requestAnimationFrame(sync);
    });

    const observer = new ResizeObserver(sync);
    observer.observe(root);
    if (root.parentElement) observer.observe(root.parentElement);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      observer.disconnect();
    };
  }, [alignVisualLines, lines, rubyEnabled, text]);

  return (
    <span ref={rootRef}>
      {lines.map((line, lineIndex) => {
        // 視覚行揃え時は祖先に under を付けない（継承で非最終行まで下ルビになるのを防ぐ）。
        const useUnder = !alignVisualLines && lines.length > 1 && lineIndex === lastIndex;
        return (
          <span
            key={`ruby-line-${lineIndex}`}
            {...(alignVisualLines
              ? {}
              : { "data-ruby-line": useUnder ? "under" : "over" })}
          >
            {lineIndex > 0 ? <br /> : null}
            <RubyLineParts text={line} rubyEnabled={rubyEnabled} />
          </span>
        );
      })}
    </span>
  );
};
