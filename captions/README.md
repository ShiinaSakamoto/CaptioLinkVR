# 同梱字幕プリセット

`captions/` 配下のフォルダから、アプリ起動前に `catalog.json` を自動生成します（`npm run dev` / `npm run build`）。

## 構成

```
captions/
  catalog.json              # 自動生成（手編集しない）
  <プリセットID>/           # フォルダ名が id になる
    subtitle.ass            # 字幕本体（ファイル名固定）
    meta.json               # 表示・クレジット・リンク・使い方
    guide.md                # 任意：メンテ用の補足（アプリは読まない）
```

## プリセットを追加するとき

1. `captions/<プリセットID>/` フォルダを作る（フォルダ名 = id）
2. `subtitle.ass` を置く
3. `meta.json` を書く（`displayName` 必須。フォルダ名がidとなる。）
4. `npm run dev` または `npm run build` で `catalog.json` が更新される

表示名は `displayName` に書いてください。字幕ファイル名は常に `subtitle.ass` です。
