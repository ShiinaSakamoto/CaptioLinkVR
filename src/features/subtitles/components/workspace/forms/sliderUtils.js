// スライダー増減の step 精度に合わせて値を丸め、範囲内に収める。
export const clampStep = (value, min, max, step) => {
  const precision = String(step).split(".")[1]?.length || 0;
  return Number(Math.min(max, Math.max(min, value)).toFixed(precision));
};

export const toNumericRange = (min, max, step) => [Number(min), Number(max), Number(step)];

// ツールチップ表示用。step の小数桁に合わせて文字列化する。
export const formatSliderValue = (value, step) => {
  const precision = String(step).split(".")[1]?.length || 0;
  return Number(value).toFixed(precision);
};

export const getSliderThumbRatio = (value, min, max) => {
  const numericMin = Number(min);
  const numericMax = Number(max);
  const numericValue = Number(value);
  if (numericMax === numericMin) return 0;
  return (numericValue - numericMin) / (numericMax - numericMin);
};
