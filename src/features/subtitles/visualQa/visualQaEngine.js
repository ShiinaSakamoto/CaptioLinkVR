// 進捗補間ではなく離散アクション列を事前組み立てする（タイマー遅延でも値が崩れない）。
// action.kind はハイライト部品の識別に使う（slider / reset / increment 等）。
export const VISUAL_QA_ACTION_KIND = {
  SLIDER: "slider",
  RESET: "reset",
  INCREMENT: "increment",
  DECREMENT: "decrement",
  TOGGLE: "toggle",
  COLOR: "color",
};

/** ステップ開始時、タブ切替などが完了するまでの基本待ち時間 */
export const STEP_INTRO_MS = 900;
/** dependsOnKeyを強制ONした後、描画が完全に反映されるまでの追加待ち時間 */
export const DEPEND_KEY_SETTLE_MS = 850;
/** ステップの操作が終わってから次へ進むまでの余裕（同上） */
export const STEP_SETTLE_MS = 900;
/**
 * スライダーをmin⇔max片道動かすのにかける目安時間。スライダーごとにメモリ数
 * （(max-min)/step）が大きく異なっても「動く速さ」の見え方を揃えるため、
 * 1メモリあたりの表示時間はこの値から逆算する（メモリ数が多いほど短く、少ないほど長くする）。
 */
export const SWEEP_TRAVERSAL_MS = 2200;
/** 1メモリあたりの表示時間の下限（これより短くすると描画が追いつかない） */
export const MIN_NOTCH_HOLD_MS = 18;
/** 1メモリあたりの表示時間の上限（メモリ数が極端に少ないスライダーが間延びしないよう） */
export const MAX_NOTCH_HOLD_MS = 140;
/** ON/OFFを1回切り替えるごとの表示時間（判断に時間がかかるため十分な余裕を持たせる） */
export const TOGGLE_HOLD_MS = 850;
/** 色を1回切り替えるごとの表示時間（プリセット全色を見比べられる余裕を持たせる） */
export const COLOR_HOLD_MS = 950;
/** リセットボタンを押した状態を見せる時間（スライダー移動と区別できるよう長めにする） */
export const RESET_CHECK_HOLD_MS = 650;
/** +/-ボタンを1回押すごとの表示時間 */
export const STEP_BUTTON_HOLD_MS = 420;
/** min⇔maxを往復する回数 */
export const SWEEP_LAPS = 1;
/** 最小値・最大値・折り返し地点で一時停止する時間（値の変化を認識しやすくする） */
export const PEAK_HOLD_MS = 480;
/** ON/OFFを往復する回数 */
export const TOGGLE_GACHA_TIMES = 3;
/** +/-ボタンの確認で押す回数 */
export const STEP_BUTTON_PRESSES = 3;

const snapToStep = (value, step) => Number((Math.round(value / step) * step).toFixed(6));
const clampToStep = (value, min, max, step) => Math.min(max, Math.max(min, snapToStep(value, step)));

// スライダーのメモリ数（(max-min)/step）から、1メモリあたりの表示時間を逆算する。
// メモリ数が多いスライダーほど短く、少ないスライダーほど長くして、
// min⇔max片道の所要時間（＝見た目の動く速さ）をスライダー間で揃える。
const resolveNotchHoldMs = (min, max, step) => {
  const notchCount = Math.max(1, Math.round(Math.abs(max - min) / step));
  return Math.min(MAX_NOTCH_HOLD_MS, Math.max(MIN_NOTCH_HOLD_MS, SWEEP_TRAVERSAL_MS / notchCount));
};

// from→to まで、実際のスライダーのstep幅で1メモリずつ進むアクションを積む。
// 誤差が溜まらないよう、最後だけ必ず to そのものへスナップする。
const walkTo = (actions, key, from, to, step, holdMs) => {
  const direction = to >= from ? 1 : -1;
  const count = Math.round(Math.abs(to - from) / step);
  if (count === 0) return;
  let value = from;
  for (let i = 0; i < count; i += 1) {
    value = snapToStep(value + direction * step, step);
    actions.push({ key, value, holdMs, kind: VISUAL_QA_ACTION_KIND.SLIDER });
  }
  actions[actions.length - 1].value = snapToStep(to, step);
};

// 数値スライダー用のアクション列を作る。
// 1) 基準値→最小値(一時停止) 2) 最小⇔最大をlaps回往復(端点で一時停止) 3) 基準値へ戻す
// 4) リセット相当の操作 5) +/-ボタン相当の操作（実際のclamp計算と同じ） 6) 最後は必ず基準値
export const buildNumericSweepActions = ({
  key,
  min,
  max,
  step,
  base,
  laps = SWEEP_LAPS,
  notchHoldMs,
  peakHoldMs = PEAK_HOLD_MS,
  resetHoldMs = RESET_CHECK_HOLD_MS,
  buttonHoldMs = STEP_BUTTON_HOLD_MS,
  buttonPresses = STEP_BUTTON_PRESSES,
}) => {
  const resolvedNotchHoldMs = notchHoldMs ?? resolveNotchHoldMs(min, max, step);
  const actions = [];

  // 基準値→最小値
  walkTo(actions, key, base, min, step, resolvedNotchHoldMs);
  if (actions.length > 0) {
    // 最小値到達時、一時停止（値の変化を認識しやすくする）
    actions.push({ key, value: min, holdMs: peakHoldMs, kind: VISUAL_QA_ACTION_KIND.SLIDER });
  }

  let cursor = min;
  for (let lap = 0; lap < laps; lap += 1) {
    // 最小値→最大値
    walkTo(actions, key, cursor, max, step, resolvedNotchHoldMs);
    cursor = max;
    actions.push({ key, value: max, holdMs: peakHoldMs, kind: VISUAL_QA_ACTION_KIND.SLIDER });

    // 最大値→最小値
    walkTo(actions, key, cursor, min, step, resolvedNotchHoldMs);
    cursor = min;
    actions.push({ key, value: min, holdMs: peakHoldMs, kind: VISUAL_QA_ACTION_KIND.SLIDER });
  }

  // 最小値→基準値（ここは一時停止なし、すぐリセット確認に入るため）
  walkTo(actions, key, cursor, base, step, resolvedNotchHoldMs);

  // リセット確認（ハイライト用）
  actions.push({ key, value: base, holdMs: resetHoldMs, kind: VISUAL_QA_ACTION_KIND.RESET });

  // +/- を実UIと同じ clamp で確認
  let buttonCursor = base;
  for (let i = 0; i < buttonPresses; i += 1) {
    buttonCursor = clampToStep(buttonCursor + step, min, max, step);
    actions.push({ key, value: buttonCursor, holdMs: buttonHoldMs, kind: VISUAL_QA_ACTION_KIND.INCREMENT });
  }
  for (let i = 0; i < buttonPresses; i += 1) {
    buttonCursor = clampToStep(buttonCursor - step, min, max, step);
    actions.push({ key, value: buttonCursor, holdMs: buttonHoldMs, kind: VISUAL_QA_ACTION_KIND.DECREMENT });
  }

  // 最後のリセット
  actions.push({ key, value: base, holdMs: buttonHoldMs, kind: VISUAL_QA_ACTION_KIND.RESET });
  return actions;
};

// ON/OFFトグル用のアクション列。base の逆 → base を times 回往復する（がちゃがちゃ）。
export const buildToggleGachaActions = ({ key, base, times = TOGGLE_GACHA_TIMES, holdMs = TOGGLE_HOLD_MS }) => {
  const actions = [];
  for (let i = 0; i < times; i += 1) {
    actions.push({ key, value: !base, holdMs, kind: VISUAL_QA_ACTION_KIND.TOGGLE });
    actions.push({ key, value: base, holdMs, kind: VISUAL_QA_ACTION_KIND.TOGGLE });
  }
  return actions;
};

// 色選択用のアクション列。渡された候補色（プリセット全色を想定）を順番に切り替え、
// 最後に必ず基準色へ戻る。基準色と同じ候補は重複して見せないよう除外する。
export const buildColorCycleActions = ({ key, base, colors, holdMs = COLOR_HOLD_MS }) => {
  const actions = colors
    .filter((color) => color !== base)
    .map((color) => ({ key, value: color, holdMs, kind: VISUAL_QA_ACTION_KIND.COLOR }));
  actions.push({ key, value: base, holdMs, kind: VISUAL_QA_ACTION_KIND.COLOR });
  return actions;
};

export const getStepActionsDurationMs = (step) => step.actions.reduce((sum, action) => sum + action.holdMs, 0);

export const getStepDurationMs = (step) => STEP_INTRO_MS + getStepActionsDurationMs(step) + STEP_SETTLE_MS;

export const getVisualQaScenarioTotalDurationMs = (scenario) =>
  scenario.reduce((sum, step) => sum + getStepDurationMs(step), 0);

/**
 * dependsOnKey の開始時処理。
 *
 * 重要: 「今の値が既に true なら ON にしない」という分岐をしてはいけない。
 * 直前ステップの終了処理が同じキーを false に戻す setState を積んだ直後に
 * この関数が走ると、React 未反映の古い ref（true）を読んで強制ONをスキップし、
 * その後に false 復元だけが効いて「OFFのまま子設定をテストする」レースになる。
 * そのため、dependsOnKey があるステップでは常に true を書き込む。
 *
 * 連続するステップが同じ dependsOnKey を使う場合（袋文字の色→太さなど）は、
 * 最初のステップで撮った priorValue を引き継ぎ、途中で上書きしない。
 *
 * @returns {{ snapshot: { key: string, priorValue: unknown } | null, forceOn: boolean, introExtraMs: number }}
 */
export const beginDependsOnKey = ({ dependsOnKey, currentValue, existingSnapshot }) => {
  if (!dependsOnKey) {
    return { snapshot: null, forceOn: false, introExtraMs: 0 };
  }
  const snapshot =
    existingSnapshot?.key === dependsOnKey
      ? existingSnapshot
      : { key: dependsOnKey, priorValue: currentValue };
  return { snapshot, forceOn: true, introExtraMs: DEPEND_KEY_SETTLE_MS };
};

/**
 * dependsOnKey の終了時処理。
 * 次のステップも同じキーを必要とするなら、いったんOFFへ戻さない
 * （戻してすぐONにすると上記レースが再発し、UIも一瞬OFFにチラつくため）。
 *
 * @returns {{ shouldRestore: boolean, clearSnapshot: boolean }}
 */
export const finishDependsOnKey = ({ snapshot, nextDependsOnKey }) => {
  if (!snapshot) {
    return { shouldRestore: false, clearSnapshot: false };
  }
  if (nextDependsOnKey === snapshot.key) {
    return { shouldRestore: false, clearSnapshot: false };
  }
  return { shouldRestore: true, clearSnapshot: true };
};
