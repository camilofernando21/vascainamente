import { INSTAGRAM } from "@/lib/site";
import { cn } from "@/lib/utils";

// Line glyph in the site's cream (not the brand's colored logo), so it sits with the rest of the UI.
function InstagramGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" />
    </svg>
  );
}

export default function InstagramLink({
  size = 20,
  showHandle = false,
  className,
}: {
  size?: number;
  showHandle?: boolean;
  className?: string;
}) {
  return (
    <a
      href={INSTAGRAM.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("vm-insta", className)}
      aria-label={`Instagram do Vascainamente (${INSTAGRAM.handle})`}
    >
      <InstagramGlyph size={size} />
      {showHandle && <span className="vm-insta-handle">{INSTAGRAM.handle}</span>}
    </a>
  );
}
