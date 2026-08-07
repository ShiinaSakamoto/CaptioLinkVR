// リセットや方向ボタンで使う、CSS色に追従する軽量アイコン群。
export const ResetIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
    <path d="M7.2 7.4A6.5 6.5 0 1 1 5.5 12" />
    <path d="M7.2 3.8v3.6h3.6" />
  </svg>
);

export const TriangleIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
    <path d="M12 5 21 19H3Z" />
  </svg>
);

export const AdjustTriangleIcon = ({ direction = "up" }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false" data-direction={direction}>
    <path d="M12 6 19 18H5Z" />
  </svg>
);

export const ExternalLinkIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
    <path d="M14 5h5v5" />
    <path d="M10 14 19 5" />
    <path d="M19 14v5H5V5h5" />
  </svg>
);

export const ChevronDownIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const XIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
    <path
      fill="currentColor"
      stroke="none"
      d="M16.99 3H20.1l-6.27 7.16L21.25 21h-5.56l-4.35-5.68L6.32 21H3.2l6.7-7.65L2.75 3h5.7l3.93 5.2L16.99 3Zm-1.05 16.2h1.72L8.14 4.7H6.3l9.64 14.5Z"
    />
  </svg>
);

export const GitHubIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
    <path
      fill="currentColor"
      stroke="none"
      d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.94.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0 1 12 7.5c.85 0 1.71.12 2.51.34 1.91-1.32 2.75-1.05 2.75-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.38-.01 2.49-.01 2.83 0 .26.18.58.69.48A10.28 10.28 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z"
    />
  </svg>
);

// 字幕テスト送信用。字幕バーと送信のイメージ。
export const SubtitleTestIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
    <rect x="3" y="6" width="14" height="12" rx="2" />
    <path d="M6.5 11h7" />
    <path d="M6.5 14.5h4.5" />
    <path d="M15.5 12h5.5" />
    <path d="M18.5 9.5 21 12l-2.5 2.5" />
  </svg>
);

export const SubtitleTestStopIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
    <rect x="7" y="7" width="10" height="10" rx="1.5" />
  </svg>
);

// Visual QA（目視チェック）の再生/停止用。
export const PlayIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
    <path fill="currentColor" stroke="none" d="M7 4.5v15l13-7.5Z" />
  </svg>
);

export const PauseIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
    <rect x="6" y="5" width="4.5" height="14" rx="1" fill="currentColor" stroke="none" />
    <rect x="13.5" y="5" width="4.5" height="14" rx="1" fill="currentColor" stroke="none" />
  </svg>
);

// 注意・目安表示用（丸囲みの !）
export const NoticeIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5" />
    <path d="M12 16h.01" />
  </svg>
);
