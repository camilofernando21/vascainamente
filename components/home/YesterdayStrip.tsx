import Link from "next/link";
import type { HomeItem } from "@/lib/home";

// Small strip under the news of the day: the best story of the day before, so the visitor sees
// that the site publishes every day and that yesterday had its own highlight.
export default function YesterdayStrip({ item }: { item: HomeItem | null }) {
  if (!item) return null;
  return (
    <section className="vm-yday" aria-label="Ontem em destaque">
      <div className="vm-yday-inner">
        <p className="vm-label vm-yday-eyebrow">
          Ontem em destaque · {item.dateFull}
        </p>
        <h2 className="vm-yday-title">
          <Link href={`/${item.slug}`}>{item.title}</Link>
        </h2>
        {item.excerpt && <p className="vm-yday-copy">{item.excerpt}</p>}
        <Link href={`/${item.slug}`} className="vm-yday-link">
          Ler matéria
        </Link>
      </div>
    </section>
  );
}
