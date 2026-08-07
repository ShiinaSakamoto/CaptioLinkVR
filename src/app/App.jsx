import { useEffect } from "react";

import { SubtitleWorkspace } from "../features/subtitles/components/SubtitleWorkspace.jsx";

export const App = () => {
  // F5 / Ctrl+R / Cmd+R によるリロード防止、右クリックメニューの抑制
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "F5") {
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
      }
    };
    const handleContextMenu = (e) => {
      e.preventDefault();
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("contextmenu", handleContextMenu);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  return <SubtitleWorkspace />;
};
