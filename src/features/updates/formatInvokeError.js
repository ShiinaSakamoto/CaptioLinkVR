// Tauri invoke の拒否理由は文字列のことが多いので、表示用に正規化する。
export const formatInvokeError = (error, fallback = "") => {
  if (!error) {
    return fallback;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "object" && typeof error.message === "string") {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};
