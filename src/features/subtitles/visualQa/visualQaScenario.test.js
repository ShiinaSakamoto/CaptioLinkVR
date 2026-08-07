import { describe, expect, it } from "vitest";
import {
  ALL_VISUAL_SETTING_KEYS,
  VISUAL_QA_EXCLUDED_SETTING_KEYS,
} from "../constants/visualQaSettingKeys.js";
import {
  DEFAULT_VISUAL_QA_SCENARIO,
  filterVisualQaScenarioByBlock,
  VISUAL_QA_BLOCK_IDS,
} from "./visualQaScenario.js";

const coveredSettingKeys = new Set(DEFAULT_VISUAL_QA_SCENARIO.flatMap((step) => step.settingKeys));
const stepById = new Map(DEFAULT_VISUAL_QA_SCENARIO.map((step) => [step.id, step]));

describe("DEFAULT_VISUAL_QA_SCENARIO のカバレッジ", () => {
  // 新しいスタイル設定（styleFeatures.js）やVR設定（BasicSettingsPanel）を追加したのに
  // Visual QA シナリオへ反映し忘れると、このテストが失敗して気づける。
  it("見た目に関わる全設定キーがいずれかのQAステップでカバーされている", () => {
    const missing = ALL_VISUAL_SETTING_KEYS.filter((key) => !coveredSettingKeys.has(key));
    expect(missing, "以下のキーを visualQaScenario.js のいずれかのステップの settingKeys / actions へ追加してください").toEqual([]);
  });

  it("除外リストの設定キーはシナリオ側で二重にカバーしなくてよい（意図の明示）", () => {
    VISUAL_QA_EXCLUDED_SETTING_KEYS.forEach((key) => {
      expect(ALL_VISUAL_SETTING_KEYS).not.toContain(key);
    });
  });

  it("ステップが宣言するsettingKeysは実際にactionsへ現れるキーと一致する（宣言漏れ・書き過ぎ防止）", () => {
    DEFAULT_VISUAL_QA_SCENARIO.forEach((step) => {
      const actionKeys = new Set(step.actions.map((action) => action.key));
      const declaredKeys = new Set(step.settingKeys);
      expect([...actionKeys].sort(), `step "${step.id}" のactionsとsettingKeysが不一致`).toEqual(
        [...declaredKeys].sort(),
      );
    });
  });
});

describe("DEFAULT_VISUAL_QA_SCENARIO の形の妥当性", () => {
  it("各ステップは1つの設定キーだけを操作する（何が変化しているか分かりやすくするため）", () => {
    DEFAULT_VISUAL_QA_SCENARIO.forEach((step) => {
      expect(step.settingKeys, `step "${step.id}" は単一キーだけを操作すべき`).toHaveLength(1);
    });
  });

  it("各ステップはUI操作を再現するためtabを持ち、settingsタブではadjustPageも整合している", () => {
    DEFAULT_VISUAL_QA_SCENARIO.forEach((step) => {
      expect(["settings", "style"], `step "${step.id}" のtabが不正`).toContain(step.tab);
      if (step.adjustPage) {
        expect(step.tab, `step "${step.id}" はadjustPageを持つならtab="settings"のはず`).toBe("settings");
        expect(["position", "rotation"]).toContain(step.adjustPage);
      }
    });
  });

  it("id・label・actionsが重複や欠落なく設定されている", () => {
    const ids = DEFAULT_VISUAL_QA_SCENARIO.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
    DEFAULT_VISUAL_QA_SCENARIO.forEach((step) => {
      expect(step.label).toBeTruthy();
      expect(step.actions.length).toBeGreaterThan(0);
    });
  });

  it("各ステップは必ずbaseValueへ戻って終わる（原状復帰の保証。テスト中に半端な値が残らない）", () => {
    DEFAULT_VISUAL_QA_SCENARIO.forEach((step) => {
      const lastValue = step.actions.at(-1).value;
      if (typeof lastValue === "number") {
        expect(lastValue, `step "${step.id}" の最後の値が基準値に戻っていない`).toBeCloseTo(step.baseValue, 6);
      } else {
        expect(lastValue, `step "${step.id}" の最後の値が基準値に戻っていない`).toBe(step.baseValue);
      }
    });
  });

  it("dependsOnKeyを指定するステップは、対応するON/OFFキーのステップが別に存在する", () => {
    DEFAULT_VISUAL_QA_SCENARIO.forEach((step) => {
      if (!step.dependsOnKey) return;
      const ownerStep = [...DEFAULT_VISUAL_QA_SCENARIO].find((candidate) =>
        candidate.settingKeys.includes(step.dependsOnKey),
      );
      expect(ownerStep, `step "${step.id}" のdependsOnKey="${step.dependsOnKey}" を操作するステップが見つからない`).toBeTruthy();
      expect(typeof ownerStep.baseValue, `dependsOnKey="${step.dependsOnKey}" は真偽値のはず`).toBe("boolean");
    });
  });

  it("数値スライダー系ステップは、隣り合うアクションの値が飛ばず1メモリずつ変化する（スライダー移動区間）", () => {
    const NUMERIC_SWEEP_STEP_IDS = new Set([
      "font-size",
      "render-scale",
      "position-x",
      "position-y",
      "position-z",
      "rotation-x",
      "rotation-y",
      "rotation-z",
      "text-opacity",
      "ruby-distance",
      "background-opacity",
      "background-padding",
      "outline-width",
      "shadow-blur",
    ]);
    NUMERIC_SWEEP_STEP_IDS.forEach((id) => {
      const step = stepById.get(id);
      expect(step, `step "${id}" が見つからない`).toBeTruthy();
      // 末尾8件（リセット確認1 + 増減ボタン確認3+3 + 最終復帰1）はスライダー移動ではないので除く
      const sweepPortion = step.actions.slice(0, step.actions.length - 8);
      // ピーク時の一時停止(同じ値が2回連続)を除外して、実際の移動だけを見る
      const movingActions = sweepPortion.filter((action, i, arr) => i === 0 || action.value !== arr[i - 1].value);
      const diffs = movingActions.slice(1).map((action, i) => Math.abs(action.value - movingActions[i].value));
      const notchStep = diffs[0];
      expect(notchStep, `step "${id}" のstep幅が0になっている`).toBeGreaterThan(0);
      diffs.forEach((diff, i) => {
        expect(diff, `step "${id}" のアクション${i + 1}でメモリを飛ばしている（step幅が不一致）`).toBeCloseTo(notchStep, 6);
      });
    });
  });
});

describe("filterVisualQaScenarioByBlock（ブロック単位の目視チェック）", () => {
  it("\"all\" は全ステップを返す", () => {
    expect(filterVisualQaScenarioByBlock(DEFAULT_VISUAL_QA_SCENARIO, "all")).toEqual(DEFAULT_VISUAL_QA_SCENARIO);
  });

  it("\"settings\" はVR設定タブのステップだけを返す", () => {
    const filtered = filterVisualQaScenarioByBlock(DEFAULT_VISUAL_QA_SCENARIO, "settings");
    expect(filtered.length).toBeGreaterThan(0);
    filtered.forEach((step) => expect(step.tab).toBe("settings"));
  });

  it("\"settings.position\" は位置調整カテゴリのステップだけを返す", () => {
    const filtered = filterVisualQaScenarioByBlock(DEFAULT_VISUAL_QA_SCENARIO, "settings.position");
    expect(filtered.length).toBeGreaterThan(0);
    filtered.forEach((step) => {
      expect(step.tab).toBe("settings");
      expect(step.category).toBe("position");
    });
  });

  it("\"settings.rotation\" は回転調整カテゴリのステップだけを返す", () => {
    const filtered = filterVisualQaScenarioByBlock(DEFAULT_VISUAL_QA_SCENARIO, "settings.rotation");
    expect(filtered.length).toBeGreaterThan(0);
    filtered.forEach((step) => {
      expect(step.tab).toBe("settings");
      expect(step.category).toBe("rotation");
    });
  });

  it("\"style\" は字幕スタイルタブのステップだけを返す", () => {
    const filtered = filterVisualQaScenarioByBlock(DEFAULT_VISUAL_QA_SCENARIO, "style");
    expect(filtered.length).toBeGreaterThan(0);
    filtered.forEach((step) => expect(step.tab).toBe("style"));
  });

  it("settings + style の合計は全ステップ数と一致する（漏れ・重複がない）", () => {
    const settings = filterVisualQaScenarioByBlock(DEFAULT_VISUAL_QA_SCENARIO, "settings");
    const style = filterVisualQaScenarioByBlock(DEFAULT_VISUAL_QA_SCENARIO, "style");
    expect(settings.length + style.length).toBe(DEFAULT_VISUAL_QA_SCENARIO.length);
  });

  it("カテゴリ単位の絞り込みは、タブ全体より少ないステップを返す", () => {
    const position = filterVisualQaScenarioByBlock(DEFAULT_VISUAL_QA_SCENARIO, "settings.position");
    const rotation = filterVisualQaScenarioByBlock(DEFAULT_VISUAL_QA_SCENARIO, "settings.rotation");
    const general = filterVisualQaScenarioByBlock(DEFAULT_VISUAL_QA_SCENARIO, "settings.general");
    const settings = filterVisualQaScenarioByBlock(DEFAULT_VISUAL_QA_SCENARIO, "settings");
    expect(position.length).toBeGreaterThan(0);
    expect(rotation.length).toBeGreaterThan(0);
    expect(general.length).toBeGreaterThan(0);
    expect(position.length + rotation.length + general.length).toBe(settings.length);
  });
});
