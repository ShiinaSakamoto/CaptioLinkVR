import { createElement, Fragment } from "react";
import { openExternalUrl } from "../../../shared/openExternalUrl.js";

// THIRD_PARTY_NOTICES.md 向けの軽量 Markdown → React 変換。
// 対応: 見出し / 表 / リスト / 引用 / HR / 段落 / 太字・インラインコード・リンク

const INLINE_RE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

const isBlank = (line) => !line.trim();
const isHr = (line) => /^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim());
const isHeading = (line) => /^(#{1,4})\s+(.+)$/.exec(line);
const isQuote = (line) => /^>\s?/.test(line);
const isUl = (line) => /^[-*]\s+/.test(line);
const isOl = (line) => /^\d+\.\s+/.test(line);
const isTableSep = (line) => /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line.trim());
const isTableRow = (line) => {
  const trimmed = line.trim();
  return trimmed.includes("|") && !isTableSep(trimmed);
};

const splitTableCells = (line) => {
  let text = line.trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|")) text = text.slice(0, -1);
  return text.split("|").map((cell) => cell.trim());
};

const handleLinkClick = (event, href) => {
  event.preventDefault();
  void openExternalUrl(href);
};

export const renderInlineMarkdown = (text, keyPrefix = "i") => {
  const source = String(text ?? "");
  if (!source) return null;

  const nodes = [];
  let lastIndex = 0;
  let match;
  INLINE_RE.lastIndex = 0;

  while ((match = INLINE_RE.exec(source)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(source.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-${nodes.length}`;

    if (token.startsWith("**")) {
      nodes.push(createElement("strong", { key }, token.slice(2, -2)));
    } else if (token.startsWith("`")) {
      nodes.push(createElement("code", { key }, token.slice(1, -1)));
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        nodes.push(
          createElement(
            "a",
            {
              key,
              href,
              onClick: (event) => handleLinkClick(event, href),
            },
            label,
          ),
        );
      } else {
        nodes.push(token);
      }
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < source.length) {
    nodes.push(source.slice(lastIndex));
  }

  return nodes.length === 1 ? nodes[0] : createElement(Fragment, null, ...nodes);
};

const parseBlocks = (markdown) => {
  const lines = String(markdown ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (isBlank(line)) {
      index += 1;
      continue;
    }

    if (isHr(line)) {
      blocks.push({ type: "hr" });
      index += 1;
      continue;
    }

    const heading = isHeading(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2].trim(),
      });
      index += 1;
      continue;
    }

    if (isQuote(line)) {
      const quotes = [];
      while (index < lines.length && isQuote(lines[index])) {
        quotes.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "blockquote", text: quotes.join("\n") });
      continue;
    }

    if (
      index + 1 < lines.length &&
      isTableRow(line) &&
      isTableSep(lines[index + 1])
    ) {
      const header = splitTableCells(line);
      index += 2;
      const rows = [];
      while (index < lines.length && isTableRow(lines[index])) {
        rows.push(splitTableCells(lines[index]));
        index += 1;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }

    if (isUl(line) || isOl(line)) {
      const ordered = isOl(line);
      const items = [];
      while (index < lines.length && (ordered ? isOl(lines[index]) : isUl(lines[index]))) {
        items.push(lines[index].replace(ordered ? /^\d+\.\s+/ : /^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: ordered ? "ol" : "ul", items });
      continue;
    }

    const paragraph = [];
    while (
      index < lines.length &&
      !isBlank(lines[index]) &&
      !isHr(lines[index]) &&
      !isHeading(lines[index]) &&
      !isQuote(lines[index]) &&
      !isUl(lines[index]) &&
      !isOl(lines[index]) &&
      !(
        index + 1 < lines.length &&
        isTableRow(lines[index]) &&
        isTableSep(lines[index + 1])
      )
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join("\n") });
  }

  return blocks;
};

export const renderSimpleMarkdown = (markdown) => {
  const blocks = parseBlocks(markdown);

  return blocks.map((block, blockIndex) => {
    const key = `b-${blockIndex}`;

    switch (block.type) {
      case "hr":
        return createElement("hr", { key });
      case "heading": {
        const tag = `h${Math.min(block.level, 4)}`;
        return createElement(tag, { key }, renderInlineMarkdown(block.text, key));
      }
      case "blockquote":
        return createElement(
          "blockquote",
          { key },
          createElement("p", null, renderInlineMarkdown(block.text, key)),
        );
      case "ul":
      case "ol":
        return createElement(
          block.type,
          { key },
          block.items.map((item, itemIndex) =>
            createElement(
              "li",
              { key: `${key}-li-${itemIndex}` },
              renderInlineMarkdown(item, `${key}-${itemIndex}`),
            ),
          ),
        );
      case "table":
        return createElement(
          "table",
          { key },
          createElement(
            "thead",
            null,
            createElement(
              "tr",
              null,
              block.header.map((cell, cellIndex) =>
                createElement(
                  "th",
                  { key: `${key}-th-${cellIndex}` },
                  renderInlineMarkdown(cell, `${key}-th-${cellIndex}`),
                ),
              ),
            ),
          ),
          createElement(
            "tbody",
            null,
            block.rows.map((row, rowIndex) =>
              createElement(
                "tr",
                { key: `${key}-tr-${rowIndex}` },
                row.map((cell, cellIndex) =>
                  createElement(
                    "td",
                    { key: `${key}-td-${rowIndex}-${cellIndex}` },
                    renderInlineMarkdown(cell, `${key}-td-${rowIndex}-${cellIndex}`),
                  ),
                ),
              ),
            ),
          ),
        );
      case "paragraph":
      default:
        return createElement("p", { key }, renderInlineMarkdown(block.text, key));
    }
  });
};
