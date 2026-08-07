import { describe, expect, it } from "vitest";
import {
  beginDependsOnKey,
  buildColorCycleActions,
  buildNumericSweepActions,
  buildToggleGachaActions,
  DEPEND_KEY_SETTLE_MS,
  finishDependsOnKey,
  getStepActionsDurationMs,
  getStepDurationMs,
  getVisualQaScenarioTotalDurationMs,
  MAX_NOTCH_HOLD_MS,
  MIN_NOTCH_HOLD_MS,
  STEP_INTRO_MS,
  STEP_SETTLE_MS,
  SWEEP_TRAVERSAL_MS,
  VISUAL_QA_ACTION_KIND,
} from "./visualQaEngine.js";

describe("buildNumericSweepActions", () => {
  it("基準値→最小値→（最小⇔最大の往復）→基準値の順で、実際のstep幅を1メモリずつ進む", () => {
    const actions = buildNumericSweepActions({ key: "v", min: 0, max: 10, step: 5, base: 5, laps: 1 });
    const values = actions.map((a) => a.value);
    // 基準値(5)→最小(0): 1メモリ + ピーク時の一時停止
    expect(values[0]).toBe(0);
    expect(values[1]).toBe(0); // ピーク時の一時停止
    // 最小(0)→最大(10): 2メモリ + ピーク
    const maxIndex = values.findIndex((v, i) => i > 1 && v === 10);
    expect(maxIndex).toBeGreaterThan(1);
    expect(values[maxIndex + 1]).toBe(10); // ピーク時の一時停止
    // 最大(10)→最小(0): 2メモリ + ピーク
    const minIndex = values.findIndex((v, i) => i > maxIndex + 1 && v === 0);
    expect(minIndex).toBeGreaterThan(maxIndex + 1);
    expect(values[minIndex + 1]).toBe(0); // ピーク時の一時停止
  });

  it("隣り合う値は必ずstep幅ちょうど分だけ変化する（メモリを飛ばさない）", () => {
    const actions = buildNumericSweepActions({ key: "v", min: -2, max: 2, step: 0.05, base: 0, laps: 1 });
    // リセット/+-ボタン確認区間より前（スライダー移動区間）だけを対象にする
    const sweepPortion = actions.slice(0, actions.length - 8);
    // ピーク時の一時停止(同じ値が2回連続)を除外して、実際の移動だけを見る
    const movingActions = sweepPortion.filter((action, i, arr) => i === 0 || action.value !== arr[i - 1].value);
    for (let i = 1; i < movingActions.length; i += 1) {
      const diff = Math.abs(movingActions[i].value - movingActions[i - 1].value);
      expect(diff).toBeCloseTo(0.05, 5);
    }
  });

  it("最後は必ず基準値に戻る（原状復帰の保証。テスト中に半端な値が残るのを防ぐ）", () => {
    const actions = buildNumericSweepActions({ key: "v", min: -2, max: 2, step: 0.05, base: 0 });
    expect(actions.at(-1).value).toBeCloseTo(0, 6);
  });

  it("リセット相当のアクションを1つ含む（基準値に戻すアクション）", () => {
    const actions = buildNumericSweepActions({ key: "v", min: 0, max: 100, step: 10, base: 50 });
    const resetLikeCount = actions.filter((a) => a.value === 50).length;
    // 基準値ちょうどのアクションが複数回（往路・復路・リセット・最終復帰）現れる
    expect(resetLikeCount).toBeGreaterThanOrEqual(2);
  });

  it("+/-ボタン確認は実際のStepButtonGroupと同じclamp計算で、範囲を超えない", () => {
    // 基準値を最大値付近にして、+ボタンで即座に上限へ当たるケースを確認する
    const actions = buildNumericSweepActions({
      key: "v",
      min: 0,
      max: 100,
      step: 10,
      base: 100,
      buttonPresses: 3,
    });
    actions.forEach((action) => {
      expect(action.value).toBeGreaterThanOrEqual(0);
      expect(action.value).toBeLessThanOrEqual(100);
    });
  });

  it("全てのアクションが対象キーだけを操作する", () => {
    const actions = buildNumericSweepActions({ key: "fontSizePercent", min: 50, max: 200, step: 5, base: 100 });
    actions.forEach((action) => expect(action.key).toBe("fontSizePercent"));
  });

  it("notchHoldMsを明示しない場合、メモリ数が多いスライダーほど1メモリの表示時間が短くなる（速さを揃える）", () => {
    // メモリ数が少ない（18）スライダーと多い（180）スライダーを比較する
    const fewNotches = buildNumericSweepActions({ key: "v", min: 0, max: 18, step: 1, base: 8, laps: 0 });
    const manyNotches = buildNumericSweepActions({ key: "v", min: -90, max: 90, step: 1, base: 0, laps: 0 });
    expect(fewNotches[0].holdMs).toBeGreaterThan(manyNotches[0].holdMs);
  });

  it("片道の所要時間（メモリ数×holdMs）がスライダー間でおおよそ揃う", () => {
    const traversalMsFor = (min, max, step, base) => {
      const actions = buildNumericSweepActions({ key: "v", min, max, step, base, laps: 0 });
      // laps:0でも「基準値→最小値」の1区間だけは含まれるので、そこからholdMsを取る
      const notchHoldMs = actions[0].holdMs;
      const notchCount = Math.round(Math.abs(max - min) / step);
      return notchHoldMs * notchCount;
    };
    const outlineWidthTraversal = traversalMsFor(0, 18, 1, 8);
    const rotationYTraversal = traversalMsFor(-90, 90, 1, 0);
    // 上限/下限のクランプにかかるケースを除けば、目安時間(SWEEP_TRAVERSAL_MS)に近い値になる
    expect(outlineWidthTraversal).toBeGreaterThan(0);
    expect(rotationYTraversal).toBeGreaterThan(0);
    // 極端な差（10倍以上）にはならない、というのが「速さを揃える」の最低ラインの確認
    const ratio = Math.max(outlineWidthTraversal, rotationYTraversal) / Math.min(outlineWidthTraversal, rotationYTraversal);
    expect(ratio).toBeLessThan(3);
  });

  it("notchHoldMsは下限・上限の範囲内に収まる", () => {
    // base(1)をmin(0)からずらし、「基準値→最小値」の区間に必ずアクションが生まれるようにする
    const many = buildNumericSweepActions({ key: "v", min: 0, max: 1000, step: 1, base: 1, laps: 0 });
    const few = buildNumericSweepActions({ key: "v", min: 0, max: 2, step: 1, base: 1, laps: 0 });
    expect(many[0].holdMs).toBeGreaterThanOrEqual(MIN_NOTCH_HOLD_MS);
    expect(few[0].holdMs).toBeLessThanOrEqual(MAX_NOTCH_HOLD_MS);
  });

  it("notchHoldMsを明示すれば、その値がそのまま使われる", () => {
    const actions = buildNumericSweepActions({ key: "v", min: 0, max: 10, step: 5, base: 5, laps: 0, notchHoldMs: 99 });
    expect(actions[0].holdMs).toBe(99);
  });

  it("各アクションはkind（slider/reset/increment/decrement）を持ち、対応するボタンをハイライトできる", () => {
    const actions = buildNumericSweepActions({ key: "v", min: 0, max: 100, step: 10, base: 50, buttonPresses: 3 });
    // 末尾8件: リセット確認1 + 増減ボタン確認3+3 + 最終復帰1
    const tail = actions.slice(-8);
    expect(tail[0].kind).toBe(VISUAL_QA_ACTION_KIND.RESET);
    expect(tail.slice(1, 4).every((a) => a.kind === VISUAL_QA_ACTION_KIND.INCREMENT)).toBe(true);
    expect(tail.slice(4, 7).every((a) => a.kind === VISUAL_QA_ACTION_KIND.DECREMENT)).toBe(true);
    expect(tail.at(-1).kind).toBe(VISUAL_QA_ACTION_KIND.RESET);
    // それより前（スライダー移動区間）は全てslider
    const sweepPortion = actions.slice(0, actions.length - 8);
    expect(sweepPortion.every((a) => a.kind === VISUAL_QA_ACTION_KIND.SLIDER)).toBe(true);
  });
});

describe("buildToggleGachaActions", () => {
  it("基準値の反転→基準値をtimes回往復し、最後は基準値に戻る", () => {
    const actions = buildToggleGachaActions({ key: "rubyEnabled", base: true, times: 3 });
    expect(actions).toHaveLength(6);
    expect(actions.map((a) => a.value)).toEqual([false, true, false, true, false, true]);
    expect(actions.at(-1).value).toBe(true);
  });

  it("基準値がfalseでも同様に反転できる（袋文字のような既定OFFの機能）", () => {
    const actions = buildToggleGachaActions({ key: "outlineEnabled", base: false, times: 2 });
    expect(actions.map((a) => a.value)).toEqual([true, false, true, false]);
    expect(actions.at(-1).value).toBe(false);
  });

  it("全てのアクションのkindはtoggle", () => {
    const actions = buildToggleGachaActions({ key: "rubyEnabled", base: true });
    actions.forEach((action) => expect(action.kind).toBe(VISUAL_QA_ACTION_KIND.TOGGLE));
  });
});

describe("buildColorCycleActions", () => {
  it("基準色以外の候補色を順番に切り替え、最後は基準色に戻る", () => {
    const actions = buildColorCycleActions({
      key: "textColor",
      base: "#ffffff",
      colors: ["#ffffff", "#ffff00", "#00ffff", "#00ff00"],
    });
    expect(actions.map((a) => a.value)).toEqual(["#ffff00", "#00ffff", "#00ff00", "#ffffff"]);
    expect(actions.at(-1).value).toBe("#ffffff");
  });

  it("候補色リストに基準色が含まれていなくても正しく動作する", () => {
    const actions = buildColorCycleActions({ key: "textColor", base: "#000000", colors: ["#ffffff", "#ff0000"] });
    expect(actions.map((a) => a.value)).toEqual(["#ffffff", "#ff0000", "#000000"]);
  });

  it("全てのアクションのkindはcolor", () => {
    const actions = buildColorCycleActions({ key: "textColor", base: "#ffffff", colors: ["#ffff00", "#00ffff"] });
    actions.forEach((action) => expect(action.kind).toBe(VISUAL_QA_ACTION_KIND.COLOR));
  });
});

describe("時間計算", () => {
  const step = {
    id: "s",
    actions: [
      { key: "v", value: 1, holdMs: 100 },
      { key: "v", value: 2, holdMs: 200 },
    ],
  };

  it("getStepActionsDurationMsはholdMsの合計", () => {
    expect(getStepActionsDurationMs(step)).toBe(300);
  });

  it("getStepDurationMsはintro/settleを含めた合計", () => {
    expect(getStepDurationMs(step)).toBe(STEP_INTRO_MS + 300 + STEP_SETTLE_MS);
  });

  it("getVisualQaScenarioTotalDurationMsは全ステップの合計", () => {
    expect(getVisualQaScenarioTotalDurationMs([step, step])).toBe(getStepDurationMs(step) * 2);
  });

  it("空シナリオは0", () => {
    expect(getVisualQaScenarioTotalDurationMs([])).toBe(0);
  });

  it("SWEEP_TRAVERSAL_MSは0より大きい", () => {
    expect(SWEEP_TRAVERSAL_MS).toBeGreaterThan(0);
  });
});

describe("dependsOnKey の開始/終了（袋文字OFFレースの防止）", () => {
  it("currentValueがtrueでも常にforceOnする（未反映の古いrefを信用しない）", () => {
    // 再現: 直前ステップが outlineEnabled=false へ復元する setState を積んだ直後、
    // ref はまだ true のまま。ここで「既にONだから何もしない」と判定すると、
    // その後に false 復元だけが効いて OFF のまま太さテストが走る。
    const result = beginDependsOnKey({
      dependsOnKey: "outlineEnabled",
      currentValue: true,
      existingSnapshot: null,
    });
    expect(result.forceOn).toBe(true);
    expect(result.introExtraMs).toBe(DEPEND_KEY_SETTLE_MS);
    expect(result.snapshot).toEqual({ key: "outlineEnabled", priorValue: true });
  });

  it("連続する同一dependsOnKeyでは priorValue を引き継ぎ、終了時は復元しない", () => {
    const first = beginDependsOnKey({
      dependsOnKey: "outlineEnabled",
      currentValue: false,
      existingSnapshot: null,
    });
    expect(first.snapshot.priorValue).toBe(false);

    const second = beginDependsOnKey({
      dependsOnKey: "outlineEnabled",
      currentValue: true, // 強制ON後の値
      existingSnapshot: first.snapshot,
    });
    // 色→太さのように連続する場合、元の false を保持する
    expect(second.snapshot.priorValue).toBe(false);
    expect(second.forceOn).toBe(true);

    // 次も同じキーなら復元しない（チラつき＋レース防止）
    const midFinish = finishDependsOnKey({
      snapshot: second.snapshot,
      nextDependsOnKey: "outlineEnabled",
    });
    expect(midFinish.shouldRestore).toBe(false);
    expect(midFinish.clearSnapshot).toBe(false);

    // 次が別キー（または無し）なら復元する
    const endFinish = finishDependsOnKey({
      snapshot: second.snapshot,
      nextDependsOnKey: "shadowEnabled",
    });
    expect(endFinish.shouldRestore).toBe(true);
    expect(endFinish.clearSnapshot).toBe(true);
  });

  it("dependsOnKeyが無いステップは何もしない", () => {
    expect(beginDependsOnKey({ dependsOnKey: undefined, currentValue: false, existingSnapshot: null })).toEqual({
      snapshot: null,
      forceOn: false,
      introExtraMs: 0,
    });
    expect(finishDependsOnKey({ snapshot: null, nextDependsOnKey: undefined })).toEqual({
      shouldRestore: false,
      clearSnapshot: false,
    });
  });
});
