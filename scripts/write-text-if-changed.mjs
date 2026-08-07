import fs from "node:fs";

// テキストを LF 正規化して比較し、内容が変わるときだけ書く。
// 既存ファイルの改行（LF / CRLF）は維持する。
export function writeTextIfChanged(filePath, nextContent) {
  const previousRaw = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
  const eol = previousRaw?.includes("\r\n") ? "\r\n" : "\n";
  const previousLf = previousRaw == null ? null : normalizeLf(previousRaw);
  const nextLf = normalizeLf(nextContent);

  if (previousLf === nextLf) {
    return false;
  }

  fs.writeFileSync(filePath, nextLf.replace(/\n/g, eol), "utf8");
  return true;
}

function normalizeLf(text) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
