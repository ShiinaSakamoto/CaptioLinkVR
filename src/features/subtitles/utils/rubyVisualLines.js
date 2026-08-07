const DEFAULT_EPS_PX = 3;

const addUniqueTop = (tops, top, eps) => {
  if (!tops.some((existing) => Math.abs(existing - top) <= eps)) {
    tops.push(top);
  }
};

const isInsideRt = (node) => {
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  return Boolean(el?.closest?.("rt"));
};

// 本文（rt 以外）の視覚行 top を上から順に集める。
// ルビ注釈の top を混ぜると最終行判定が狂うので除外する。
export const collectBaseLineTops = (root, eps = DEFAULT_EPS_PX) => {
  if (!root) return [];

  const tops = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node?.nodeValue || isInsideRt(node)) continue;
    if (node.nodeValue.trim() === "") continue;

    const range = document.createRange();
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) {
      if (rect.height <= 0 || rect.width <= 0) continue;
      addUniqueTop(tops, rect.top, eps);
    }
  }

  tops.sort((a, b) => a - b);
  return tops;
};

// 視覚行が2行以上のとき、最終行上のルビだけ under。
export const resolveRubyLinePositions = (rubyBaseTops, lineTops, eps = DEFAULT_EPS_PX) => {
  if (!Array.isArray(rubyBaseTops) || rubyBaseTops.length === 0) return [];
  if (!Array.isArray(lineTops) || lineTops.length <= 1) {
    return rubyBaseTops.map(() => "over");
  }

  const lastTop = lineTops[lineTops.length - 1];
  return rubyBaseTops.map((top) => (Math.abs(top - lastTop) <= eps ? "under" : "over"));
};

// 各 ruby に data-ruby-line を付与。値が変わったときだけ DOM を更新する。
export const applyVisualRubyLinePositions = (root, eps = DEFAULT_EPS_PX) => {
  if (!root) return false;

  const rubies = root.querySelectorAll("ruby");
  if (rubies.length === 0) return false;

  const lineTops = collectBaseLineTops(root, eps);
  const rubyTops = Array.from(rubies, (el) => {
    const base = el.querySelector("rb") || el;
    return base.getBoundingClientRect().top;
  });
  const positions = resolveRubyLinePositions(rubyTops, lineTops, eps);

  let changed = false;
  rubies.forEach((el, index) => {
    const next = positions[index] ?? "over";
    if (el.getAttribute("data-ruby-line") !== next) {
      el.setAttribute("data-ruby-line", next);
      changed = true;
    }
  });
  return changed;
};
