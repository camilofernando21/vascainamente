// Small play triangle shown next to the category of news that carry a video.
export function PlayMark({ size = 9 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      aria-label="Com vídeo"
      role="img"
      className="vm-play-mark"
    >
      <path d="M2 1.2 L8.6 5 L2 8.8 Z" fill="currentColor" />
    </svg>
  );
}
