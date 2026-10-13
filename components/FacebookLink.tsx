import { FACEBOOK } from "@/lib/site";
import { cn } from "@/lib/utils";

// Line glyph in the site's cream, same size and touch target as the Instagram and X links.
function FacebookGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FacebookLink({
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
      href={FACEBOOK.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("vm-insta", className)}
      aria-label={`Página do ${FACEBOOK.nome} no Facebook`}
    >
      <FacebookGlyph size={size} />
      {showHandle && <span className="vm-insta-handle">{FACEBOOK.nome}</span>}
    </a>
  );
}
