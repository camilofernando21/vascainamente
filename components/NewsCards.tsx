import Link from "next/link";
import type { HomeItem } from "@/lib/home";
import { cn } from "@/lib/utils";
import { PlayMark } from "@/components/ui/play-mark";

// Static version of the home's floating cards ("Tudo o que saiu"): avatar with the source's initials,
// source, time and the headline, with the same slight tilt.
const TILTS = [-1.5, 1, -0.75];

export default function NewsCards({ items }: { items: HomeItem[] }) {
  return (
    <ul className="vm-cards">
      {items.map((item, i) => (
        <li key={item.slug} style={{ "--rot": `${TILTS[i % TILTS.length]}deg` } as React.CSSProperties}>
          <Link href={`/${item.slug}`} className="vm-card">
            <span className="quote-card-header">
              <span className={cn("quote-avatar", item.urgent && "is-red")}>{item.sourceShort}</span>
              <span className="quote-meta">
                <span className="quote-name">
                  {item.source || "Vascainamente"}
                  {item.hasVideo && <PlayMark size={8} />}
                </span>
                <span className="quote-handle">{item.ago}</span>
              </span>
            </span>
            <span className="vm-card-title">{item.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
