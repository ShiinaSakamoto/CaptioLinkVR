// 字幕の文字色・背景色・袋文字色プリセット。
// 根拠:
// - BBC Subtitle Guidelines: 白／黄／シアン／ライムを黒背景上で使用（可読性優先）
// - 47 CFR §79.103 / CEA-708: 前景・背景は最低 white/black/red/green/blue/yellow/magenta/cyan
// - WCAG 1.4.3: テキストと背景はおおよそ 4.5:1 以上（大きい字幕でも 3:1）
// - W3C MAUR CC-10/CC-12: 背景色の選択とアウトラインによるコントラスト確保
// - BBC 編集方針: 前景は緑・黄・白が望ましく、純色の青・赤・紫は避ける傾向
//
// VR 映像上では背景が常に変わるため、「暗い背景＋明るい文字」か
// 「袋文字で縁取る」組み合わせを選びやすい色を中心にしている。

const text = (id, label, value) => ({ id, label, value });

// 文字色: 暗い背景／袋文字前提でコントラストが取りやすい色
export const TEXT_COLOR_PRESETS = [
  text("white", "白（標準）", "#ffffff"),
  text("soft-white", "オフホワイト", "#f2f2f2"),
  text("yellow", "黄（BBC）", "#ffff00"),
  text("soft-yellow", "軟黄", "#ffe566"),
  text("cyan", "シアン（BBC）", "#00ffff"),
  text("lime", "ライム（BBC）", "#00ff00"),
  text("mint", "ミント", "#b8f5c8"),
  text("black", "黒（反転用）", "#000000"),
];

// 背景色: 半透明でも文字を守れる暗色を主に、反転用の明色も用意
export const BACKGROUND_COLOR_PRESETS = [
  text("black", "黒（標準）", "#000000"),
  text("near-black", "ほぼ黒", "#121212"),
  text("charcoal", "チャコール", "#2a2a2a"),
  text("navy", "濃紺", "#0b1a2e"),
  text("forest", "濃緑", "#0f2418"),
  text("umber", "濃茶", "#1c140e"),
  text("white", "白（反転用）", "#ffffff"),
  text("light-gray", "ライトグレー", "#d9d9d9"),
];

// 袋文字色: 明るい文字には暗い縁、暗い文字には明るい縁が定石
export const OUTLINE_COLOR_PRESETS = [
  text("black", "黒（標準）", "#000000"),
  text("near-black", "ほぼ黒", "#1a1a1a"),
  text("navy", "濃紺", "#001a33"),
  text("white", "白", "#ffffff"),
  text("soft-white", "オフホワイト", "#e8e8e8"),
  text("yellow", "黄", "#ffff00"),
  text("cyan", "シアン", "#00ffff"),
];

export const normalizeHexColor = (value) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(trimmed)) return trimmed;
  if (/^[0-9a-f]{6}$/.test(trimmed)) return `#${trimmed}`;
  return trimmed;
};

export const findMatchingColorPreset = (presets, value) => {
  const current = normalizeHexColor(value);
  return presets.find((preset) => normalizeHexColor(preset.value) === current) ?? null;
};

// 明るいスウォッチは枠線を濃くして視認性を確保する
export const isLightHexColor = (value) => {
  const hex = normalizeHexColor(value).replace("#", "");
  if (!/^[0-9a-f]{6}$/.test(hex)) return false;
  const r = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const g = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const b = Number.parseInt(hex.slice(4, 6), 16) / 255;
  // 相対輝度の簡易版（WCAG の線形化前の近似）
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.72;
};
