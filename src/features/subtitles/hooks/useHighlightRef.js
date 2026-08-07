import { useEffect, useRef } from "react";

// Visua QA が別タブの設定を操作するとき、対象を視界に入れる。
export const useHighlightRef = (isHighlighted) => {
  const ref = useRef(null);

  useEffect(() => {
    if (isHighlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  return ref;
};
