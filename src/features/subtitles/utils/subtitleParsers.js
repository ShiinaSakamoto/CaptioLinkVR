import { isRubyTokenBody } from "./rubyText.js";

// ASS/ASSAの装飾タグを落とし、表示用の素のテキストにする。
const stripAssTags = (text) => {
  return text
    .replace(/\{([^}]*)\}/g, (match, body) => (isRubyTokenBody(body) ? match : ""))
    .replace(/\\N/g, "\n")
    .replace(/\\n/g, "\n")
    .trim();
};

// SRT形式の時刻（00:00:00,000）を秒へ変換する。
export const parseSrtTime = (timeString) => {
  const [hms, ms = "0"] = timeString.trim().split(",");
  const [hours = 0, minutes = 0, seconds = 0] = hms.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds + Number(ms.padEnd(3, "0")) / 1000;
};

// ASS形式の時刻（H:MM:SS.cc）を秒へ変換する。
// 浮動小数の丸め誤差で境界判定がずれないよう、センチ秒整数経由で求める。
export const parseAssTime = (timeString) => {
  const match = /^(\d+):(\d+):(\d+)(?:\.(\d{1,2}))?$/.exec(timeString.trim());
  if (!match) {
    const [hours = 0, minutes = 0, seconds = 0] = timeString.trim().split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const centiseconds = Number((match[4] ?? "0").padEnd(2, "0").slice(0, 2));
  const totalCentiseconds = ((hours * 60 + minutes) * 60 + seconds) * 100 + centiseconds;
  return totalCentiseconds / 100;
};

// SRTファイルをキュー配列へ変換する。壊れたブロックは読み飛ばす。
export const parseSrt = (data) => {
  const blocks = data.replace(/\r\n/g, "\n").trim().split(/\n\s*\n/);

  return blocks
    .map((block, fallbackIndex) => {
      const lines = block.split("\n").filter((line) => line.trim() !== "");
      const timeLineIndex = lines.findIndex((line) => line.includes("-->"));
      if (timeLineIndex === -1) return null;

      const match = lines[timeLineIndex].match(/([\d:,]+)\s+-->\s+([\d:,]+)/);
      if (!match) return null;

      const index = Number(lines[0]) || fallbackIndex + 1;
      const text = lines.slice(timeLineIndex + 1).join("\n").trim();

      return {
        id: `srt-${index}`,
        index,
        startTime: parseSrtTime(match[1]),
        endTime: parseSrtTime(match[2]),
        actor: "",
        text,
      };
    })
    .filter(Boolean);
};

// ASS/ASSAファイルをキュー配列へ変換する。Format行を見てDialogue列を解釈する。
export const parseAss = (data) => {
  const lines = data.split(/\r?\n/);
  let format = [];
  let index = 1;

  return lines
    .map((line) => {
      if (line.startsWith("Format:")) {
        format = line
          .slice("Format:".length)
          .split(",")
          .map((item) => item.trim().toLowerCase());
        return null;
      }

      if (!line.startsWith("Dialogue:")) return null;

      const payload = line.slice("Dialogue:".length).trim();
      const textIndex = format.indexOf("text");
      const fieldCount = textIndex >= 0 ? textIndex : 9;
      const parts = payload.split(",");
      if (parts.length <= fieldCount) return null;

      const fields = parts.slice(0, fieldCount);
      const text = parts.slice(fieldCount).join(",");
      const startIndex = format.indexOf("start") >= 0 ? format.indexOf("start") : 1;
      const endIndex = format.indexOf("end") >= 0 ? format.indexOf("end") : 2;
      const actorIndex = format.indexOf("name") >= 0 ? format.indexOf("name") : 4;

      return {
        id: `ass-${index}`,
        index: index++,
        startTime: parseAssTime(fields[startIndex] || "0:00:00.00"),
        endTime: parseAssTime(fields[endIndex] || "0:00:00.00"),
        actor: fields[actorIndex]?.trim() || "",
        text: stripAssTags(text),
      };
    })
    .filter(Boolean);
};

// 拡張子に応じて適切なパーサーへ振り分ける。
export const parseSubtitleFile = (fileName, data) => {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".ass") || lowerName.endsWith(".assa")) {
    return parseAss(data);
  }
  return parseSrt(data);
};

// 秒数を画面表示用のMM:SSまたはHH:MM:SSに整形する。
export const formatClock = (seconds) => {
  if (seconds == null) return "--:--";

  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};
