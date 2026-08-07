import { useCallback, useEffect, useRef, useState } from "react";
import { getCaptionPresetMeta } from "../captionPresetApi.js";

export const usePresetPickerMeta = (presets) => {
  const cacheRef = useRef(new Map());
  const presetKey = presets.map((preset) => preset.id).join("\0");
  const [metaById, setMetaById] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    cacheRef.current.clear();
    setMetaById({});
    setLoadError("");
  }, [presetKey]);

  const ensureLoaded = useCallback(async () => {
    const ids = presets.map((preset) => preset.id);
    const missing = ids.filter((id) => !cacheRef.current.has(id));

    if (missing.length === 0) {
      setMetaById(Object.fromEntries(ids.map((id) => [id, cacheRef.current.get(id) ?? null])));
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      await Promise.all(
        missing.map(async (id) => {
          try {
            const meta = await getCaptionPresetMeta(id);
            cacheRef.current.set(id, meta);
          } catch {
            cacheRef.current.set(id, null);
          }
        }),
      );

      setMetaById(Object.fromEntries(ids.map((id) => [id, cacheRef.current.get(id) ?? null])));
    } catch (error) {
      setLoadError(String(error));
    } finally {
      setLoading(false);
    }
  }, [presets]);

  return { metaById, loading, loadError, ensureLoaded };
};
