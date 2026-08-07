import { useEffect } from "react";

// 外側クリックと Escape でポップオーバーを閉じる。追加キー操作は onKeyDown へ任せる。
export const useDismissiblePopover = ({
  open,
  onClose,
  rootRef,
  onKeyDown,
  preventEscapeDefault = false,
}) => {
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        onClose();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (preventEscapeDefault) event.preventDefault();
        onClose();
        return;
      }
      onKeyDown?.(event);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, onKeyDown, open, preventEscapeDefault, rootRef]);
};
