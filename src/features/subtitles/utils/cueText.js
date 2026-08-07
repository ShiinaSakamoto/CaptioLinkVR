// ASSの話者名がある場合だけ、字幕本文の前に角括弧付きで付ける。
export const buildCueText = (cue) => (cue.actor ? `[${cue.actor}] ${cue.text}` : cue.text);
