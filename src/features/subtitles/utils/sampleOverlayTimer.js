// 字幕テスト送信の interval 実体。atom が null になっても zombie 化しないよう、ここを正とする。
let activeSampleTimerId = null;

export const armSampleTimer = (timerId) => {
  if (activeSampleTimerId != null && activeSampleTimerId !== timerId) {
    window.clearInterval(activeSampleTimerId);
  }
  activeSampleTimerId = timerId;
};

export const disarmSampleTimer = () => {
  if (activeSampleTimerId == null) return;
  window.clearInterval(activeSampleTimerId);
  activeSampleTimerId = null;
};

export const getActiveSampleTimerId = () => activeSampleTimerId;
