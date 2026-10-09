import Link from "next/link";
import type { HomeItem } from "@/lib/home";
import { cn } from "@/lib/utils";

// List rows in the language of the home's "últimas" panels: label, serif title, mono summary, stat line.
export default function NewsList({
  items,
  startIndex = 0,
  showCategory = true,
}: {
  items: HomeItem[];
  startIndex?: number;
  showCategory?: boolean;
}) {
  return (
    <ol className="vm-news-list">
      {items.map((item, i) => (
        <li key={item.slug}>
          <Link href={`/${item.slug}`} className="vm-news-row">
            <span className="vm-news-index" aria-hidden="true">
              {String(startIndex + i + 1).padStart(2, "0")}
            </span>
            <span className="vm-news-main">
              {showCategory && (
                <span className={cn("vm-label vm-news-cat", item.urgent && "is-red")}>{item.category}</span>
              )}
              <span className="vm-news-title">{item.title}</span>
              {item.excerpt && <span className="vm-news-excerpt">{item.excerpt}</span>}
            </span>
            <span className="vm-news-meta">
              <span>{item.source || "Vascainamente"}</span>
              <span>{item.ago}</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
