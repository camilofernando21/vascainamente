import { X_PROFILE } from "@/lib/site";
import { cn } from "@/lib/utils";

// The X mark in the site's cream (currentColor), same size and touch target as the Instagram link.
function XGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function XLink({
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
      href={X_PROFILE.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("vm-insta", className)}
      aria-label={`X do Vascainamente (${X_PROFILE.handle})`}
    >
      <XGlyph size={size} />
      {showHandle && <span className="vm-insta-handle">{X_PROFILE.handle}</span>}
    </a>
  );
}
