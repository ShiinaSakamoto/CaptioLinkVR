export const clearTimerId = (timerId) => {
  window.clearTimeout(timerId);
  window.clearInterval(timerId);
};

export const clearTimerIds = (timerIds) => {
  timerIds.forEach((timerId) => {
    if (timerId) clearTimerId(timerId);
  });
};