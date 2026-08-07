import { useEffect, useState } from "react";
import { listCaptionPresets } from "../captionPresetApi.js";

export const useCaptionPresets = () => {
  const [presets, setPresets] = useState([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    listCaptionPresets()
      .then((entries) => {
        if (cancelled) return;
        setPresets(Array.isArray(entries) ? entries : []);
        setLoadError("");
      })
      .catch((error) => {
        if (cancelled) return;
        setPresets([]);
        setLoadError(String(error));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { presets, loadError };
};
