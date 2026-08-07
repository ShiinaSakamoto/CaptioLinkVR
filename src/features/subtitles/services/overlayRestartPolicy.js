/** 失敗時フル再起動を許可するか（クリティカル帯では false）。 */
let fullRestartAllowed = true;

export const setOverlayFullRestartAllowed = (allowed) => {
  fullRestartAllowed = Boolean(allowed);
};

export const isOverlayFullRestartAllowed = () => fullRestartAllowed;
