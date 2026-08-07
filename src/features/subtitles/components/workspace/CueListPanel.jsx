import { useAtomValue, useSetAtom } from "jotai";
import { memo, useCallback, useLayoutEffect, useMemo, useRef } from "react";
import {
  activeCueIdAtom,
  cueListScrollTopAtom,
  selectedCueIdAtom,
  subtitleCuesAtom,
} from "../../../../stores/subtitleStore.js";
import { buildCueText } from "../../utils/cueText.js";
import { formatClock } from "../../utils/subtitleParsers.js";
import { RubyText } from "../shared/RubyText.jsx";
import { ui } from "../../../../shared/uiText.js";
import styles from "../SubtitleWorkspace.module.scss";

export const CueListPanel = memo(({ jumpToCue }) => {
  const cues = useAtomValue(subtitleCuesAtom);
  const selectedCueId = useAtomValue(selectedCueIdAtom);
  const activeCueId = useAtomValue(activeCueIdAtom);
  const scrollTop = useAtomValue(cueListScrollTopAtom);
  const setScrollTop = useSetAtom(cueListScrollTopAtom);
  const listRef = useRef(null);
  const isUserScrollingRef = useRef(false);

  const selectedCue = useMemo(() => cues.find((cue) => cue.id === selectedCueId), [cues, selectedCueId]);
  const selectedTimeText = useMemo(() => {
    if (!selectedCue) return ui.notSelected;
    return `${formatClock(selectedCue.startTime)} - ${formatClock(selectedCue.endTime)}`;
  }, [selectedCue]);

  useLayoutEffect(() => {
    if (!listRef.current || isUserScrollingRef.current) {
      isUserScrollingRef.current = false;
      return;
    }
    listRef.current.scrollTop = scrollTop;
  }, [scrollTop]);

  const handleScroll = useCallback(() => {
    if (!listRef.current) return;
    isUserScrollingRef.current = true;
    setScrollTop(listRef.current.scrollTop);
  }, [setScrollTop]);

  return (
    <div className={styles.cuePage}>
      <div className={styles.cueHeader}>
        <div>
          <p>{ui.cue}</p>
          <span>{selectedTimeText}</span>
        </div>
      </div>

      <div ref={listRef} className={styles.cueList} onScroll={handleScroll}>
        {cues.length === 0 && <div className={styles.emptyList}>{ui.empty}</div>}
        {cues.map((cue) => (
          <CueRow
            key={cue.id}
            cue={cue}
            isSelected={selectedCueId === cue.id}
            isActive={activeCueId === cue.id}
            onJump={jumpToCue}
          />
        ))}
      </div>
    </div>
  );
});

const CueRow = memo(({ cue, isSelected, isActive, onJump }) => {
  const cueText = useMemo(() => buildCueText(cue), [cue]);
  const startTimeText = useMemo(() => formatClock(cue.startTime), [cue.startTime]);

  return (
    <div className={[styles.cueRow, isSelected ? styles.isSelected : "", isActive ? styles.isActive : ""].join(" ")}>
      <div className={styles.cueRowContent}>
        <time>{startTimeText}</time>
        <span className={styles.cueText}>
          <RubyText text={cueText} />
        </span>
      </div>
      <button type="button" className={styles.cuePlayButton} onClick={() => onJump(cue)}>
        {ui.playFromHere}
      </button>
    </div>
  );
});

CueListPanel.displayName = "CueListPanel";
