const findRubyDivider = (body) => {
  const dividerIndex = body.indexOf("|");
  if (dividerIndex <= 0 || dividerIndex >= body.length - 1) return -1;
  if (body.includes("\\")) return -1;
  return dividerIndex;
};

export const stripRubyMarkupForChatbox = (text) => {
  let output = "";
  let cursor = 0;

  while (cursor < text.length) {
    const openIndex = text.indexOf("{", cursor);
    if (openIndex < 0) {
      output += text.slice(cursor);
      break;
    }

    output += text.slice(cursor, openIndex);
    const closeIndex = text.indexOf("}", openIndex + 1);
    if (closeIndex < 0) {
      output += text.slice(openIndex);
      break;
    }

    const body = text.slice(openIndex + 1, closeIndex);
    const dividerIndex = findRubyDivider(body);
    if (dividerIndex < 0) {
      output += text.slice(openIndex, closeIndex + 1);
    } else {
      output += body.slice(0, dividerIndex);
    }
    cursor = closeIndex + 1;
  }

  return output;
};

export const formatVrChatChatboxText = (text) => stripRubyMarkupForChatbox(text).trim();