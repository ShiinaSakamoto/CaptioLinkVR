import { memo, useCallback } from "react";
import { ui } from "../../../shared/uiText.js";
import styles from "../Captions.module.scss";

// 再生中ロック時にクリックを受け、停止ボタンへ注意を送るラッパー。
export const LockedSourceControl = memo(({
  as: Component = "div",
  locked = false,
  lockedTitle = "",
  onLockedAttempt,
  className = "",
  onClick,
  children,
  ...rest
}) => {
  const handleClick = useCallback(
    (event) => {
      if (locked) {
        event.preventDefault();
        event.stopPropagation();
        onLockedAttempt?.();
        return;
      }
      onClick?.(event);
    },
    [locked, onClick, onLockedAttempt],
  );

  return (
    <Component
      {...rest}
      className={[className, locked ? styles.presetSourceLocked : ""].filter(Boolean).join(" ")}
      onClick={handleClick}
      title={locked ? lockedTitle || ui.presetLockedWhilePlaying : rest.title}
      aria-disabled={locked || rest["aria-disabled"] || undefined}
    >
      {children}
    </Component>
  );
});

LockedSourceControl.displayName = "LockedSourceControl";
