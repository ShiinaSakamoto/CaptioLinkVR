export const resetSubtitleContent = ({
  setFile,
  setCues,
  setSelectedCueId,
  setCueListScrollTop,
  setActiveCueText,
  emptyFile,
}) => {
  setFile(emptyFile);
  setCues([]);
  setSelectedCueId(null);
  setCueListScrollTop(0);
  setActiveCueText("");
};
