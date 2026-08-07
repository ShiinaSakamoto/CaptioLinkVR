import { useEffect, useState } from "react";
import { checkForUpdates } from "../updateApi.js";
import { formatInvokeError } from "../formatInvokeError.js";

export const useUpdateCheck = () => {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateCheckError, setUpdateCheckError] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    checkForUpdates()
      .then((result) => {
        if (!cancelled) {
          setUpdateInfo(result ?? null);
          setUpdateCheckError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          const message = formatInvokeError(error, "不明なエラー");
          setUpdateCheckError(message);
          console.warn("update check failed", message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setChecking(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { updateInfo, updateCheckError, checking };
};
