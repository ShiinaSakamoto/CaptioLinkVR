import { useSetAtom } from "jotai";
import { useCallback } from "react";
import { updateRenderSettingAtom } from "../../../stores/subtitleStore.js";

export const useUpdateRenderSetting = () => {
  const setUpdate = useSetAtom(updateRenderSettingAtom);
  return useCallback((key, value) => setUpdate({ key, value }), [setUpdate]);
};
