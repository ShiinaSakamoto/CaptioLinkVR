import { getDefaultStore } from "jotai";
import { describe, expect, it } from "vitest";
import {
  advancedSettingsOpenAtom,
  isPlayableAtom,
  isPlaybackSourceLockedAtom,
  isSubtitlePreviewVisibleAtom,
  playbackAtom,
  renderSettingsAtom,
  subtitleCuesAtom,
  timersAtom,
  updateRenderSettingAtom,
  visualQaHighlightKeyAtom,
  visualQaUnlockedAtom,
  vrAdjustPageAtom,
  workspaceMainPageAtom,
} from "./subtitleStore.js";

// 初期値は DEFAULT_RENDER_SETTINGS（src/features/subtitles/constants/defaultRenderSettings.js）と
// Rust 側 RenderSettings::default() と対になっている。どちらかを変えたら両方とリセット値も更新すること。
describe("renderSettingsAtom defaults", () => {
  it("透過関連のデフォルトはJS側クランプ範囲内にある", () => {
    const store = getDefaultStore();
    const settings = store.get(renderSettingsAtom);
    expect(settings.textOpacityPercent).toBe(100);
    expect(settings.backgroundOpacityPercent).toBe(90);
  });

  it("VR表示に関わる主要な既定値を持つ", () => {
    const store = getDefaultStore();
    const settings = store.get(renderSettingsAtom);
    expect(settings).toMatchObject({
      fontSize: 53,
      fontSizePercent: 100,
      rubyEnabled: true,
      rubyDistance: 6,
      backgroundEnabled: true,
      outlineEnabled: false,
      shadowEnabled: false,
      shadowBlur: 0,
      positionY: -0.3,
      rotationX: -8,
    });
  });
});

describe("updateRenderSettingAtom", () => {
  it("指定キーだけを更新し、他は保持する", () => {
    const store = getDefaultStore();
    const before = store.get(renderSettingsAtom);
    store.set(updateRenderSettingAtom, { key: "fontSizePercent", value: 150 });
    const after = store.get(renderSettingsAtom);
    expect(after.fontSizePercent).toBe(150);
    expect(after.textColor).toBe(before.textColor);
    // 後続テストに影響しないよう元に戻す
    store.set(updateRenderSettingAtom, { key: "fontSizePercent", value: before.fontSizePercent });
  });
});

describe("導出atom", () => {
  it("isPlayableAtomはキューが1件以上あればtrue", () => {
    const store = getDefaultStore();
    expect(store.get(isPlayableAtom)).toBe(false);
    store.set(subtitleCuesAtom, [{ id: "1" }]);
    expect(store.get(isPlayableAtom)).toBe(true);
    store.set(subtitleCuesAtom, []);
  });

  it("isPlaybackSourceLockedAtomは再生中だけtrue", () => {
    const store = getDefaultStore();
    expect(store.get(isPlaybackSourceLockedAtom)).toBe(false);
    store.set(playbackAtom, (current) => ({ ...current, isPlaying: true }));
    expect(store.get(isPlaybackSourceLockedAtom)).toBe(true);
    store.set(playbackAtom, (current) => ({ ...current, isPlaying: false }));
  });

  it("isSubtitlePreviewVisibleAtomは再生中またはサンプルタイマー中にtrue", () => {
    const store = getDefaultStore();
    expect(store.get(isSubtitlePreviewVisibleAtom)).toBe(false);
    store.set(timersAtom, (current) => ({ ...current, sampleTimerId: 1 }));
    expect(store.get(isSubtitlePreviewVisibleAtom)).toBe(true);
    store.set(timersAtom, (current) => ({ ...current, sampleTimerId: null }));
  });
});

describe("ワークスペース/Visual QA関連atomの既定値", () => {
  it("タブ・サブページ・詳細設定の開閉は想定どおりの初期値を持つ", () => {
    const store = getDefaultStore();
    expect(store.get(workspaceMainPageAtom)).toBe("settings");
    expect(store.get(vrAdjustPageAtom)).toBe("position");
    expect(store.get(advancedSettingsOpenAtom)).toBe(false);
  });

  it("隠しQAボタンは既定で非表示、ハイライト対象は既定でnull", () => {
    const store = getDefaultStore();
    expect(store.get(visualQaUnlockedAtom)).toBe(false);
    expect(store.get(visualQaHighlightKeyAtom)).toBeNull();
  });
});
