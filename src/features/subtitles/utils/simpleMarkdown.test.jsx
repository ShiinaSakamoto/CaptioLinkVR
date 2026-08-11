import { createElement, Fragment } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderSimpleMarkdown } from "./simpleMarkdown.jsx";

const toHtml = (markdown) =>
  renderToStaticMarkup(createElement(Fragment, null, ...renderSimpleMarkdown(markdown)));

describe("renderSimpleMarkdown", () => {
  it("見出し・太字・リンク・表を変換する", () => {
    const html = toHtml(`# Title

| A | B |
| --- | --- |
| **x** | [y](https://example.com) |
`);

    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>x</strong>");
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain("<th>");
    expect(html).toContain("<td>");
  });

  it("リストと引用と区切り線を変換する", () => {
    const html = toHtml(`> note

- item \`code\`

1. one

---
`);

    expect(html).toContain("<blockquote>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain("<ol>");
    expect(html).toContain("<hr");
  });
});
