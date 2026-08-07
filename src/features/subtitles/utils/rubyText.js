export const isRubyTokenBody = (body) => {
  const dividerIndex = body.indexOf("|");
  return dividerIndex > 0 && dividerIndex < body.length - 1 && !body.includes("\\");
};

export const parseRubyText = (text, rubyEnabled) => {
  const parts = [];
  let cursor = 0;

  while (cursor < text.length) {
    const openIndex = text.indexOf("{", cursor);
    if (openIndex < 0) {
      parts.push({ type: "text", text: text.slice(cursor) });
      break;
    }

    if (openIndex > cursor) {
      parts.push({ type: "text", text: text.slice(cursor, openIndex) });
    }

    const closeIndex = text.indexOf("}", openIndex + 1);
    if (closeIndex < 0) {
      parts.push({ type: "text", text: text.slice(openIndex) });
      break;
    }

    const body = text.slice(openIndex + 1, closeIndex);
    if (!isRubyTokenBody(body)) {
      parts.push({ type: "text", text: text.slice(openIndex, closeIndex + 1) });
      cursor = closeIndex + 1;
      continue;
    }

    const dividerIndex = body.indexOf("|");
    const base = body.slice(0, dividerIndex);
    const ruby = body.slice(dividerIndex + 1);
    parts.push(rubyEnabled ? { type: "ruby", base, ruby } : { type: "text", text: base });
    cursor = closeIndex + 1;
  }

  return parts;
};