import { memo } from "react";
import styles from "./SharedForms.module.scss";

export const FieldRow = memo(({ label, children, className = "", inline = false, compact = false }) => (
  <div
    className={[
      styles.fieldRow,
      inline ? styles.fieldRowInline : "",
      compact ? styles.fieldRowCompact : "",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
  >
    <span>{label}</span>
    {children}
  </div>
));

FieldRow.displayName = "FieldRow";
