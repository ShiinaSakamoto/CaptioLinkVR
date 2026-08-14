# 同梱字幕プリセット

`captions/` 配下のフォルダから、アプリ起動前に `catalog.json` を自動生成します（`npm run dev` / `npm run build`）。

## 構成

```
captions/
  catalog.json              # 自動生成（手編集しない）
  <プリセットID>/           # フォルダ名が id になる
    subtitle.ass            # 字幕本体（ファイル名固定）
    meta.json               # 表示・クレジット・リンク・使い方
    start_trigger_3.png     # 任意：右列の連番（3→2→1→0、1秒切替・3ループ）
    start_trigger_2.png
    start_trigger_1.png
    start_trigger_0.png
    guide.md                # 任意：メンテ用の補足（アプリは読まない）
```

## プリセットを追加するとき

1. `captions/<プリセットID>/` フォルダを作る（フォルダ名 = id）
2. `subtitle.ass` を置く
3. `meta.json` を書く（`displayName` 必須。フォルダ名がidとなる。）
4. 必要なら案内画像を置く
   - `start_trigger_3.png`〜`start_trigger_0.png` … 右列で 3→2→1→0 を1秒ずつ3ループ再生し、0で停止（「もう一度見る」で再開）
5. `npm run dev` または `npm run build` で `catalog.json` が更新される

表示名は `displayName` に書いてください。字幕ファイル名は常に `subtitle.ass` です。
開始操作の案内画像は上記の固定ファイル名です。連番が2枚未満のときは右列の切替再生は出さず、文章のみになります。
