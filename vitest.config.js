import { defineConfig } from "vitest/config";

// フロントエンド（JS/JSX）の自動テスト設定。
// タイマー系ユーティリティが window.* を直接呼ぶため、環境は jsdom で統一する。
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: false,
    include: ["src/**/*.test.js", "src/**/*.test.jsx"],
    css: false,
  },
});
