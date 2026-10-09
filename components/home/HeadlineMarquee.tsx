import Link from "next/link";
import { CruzMalta } from "@/components/ui/cruz-malta";
import type { HomeItem } from "@/lib/home";
import { cn } from "@/lib/utils";

// Ported from Bam83's #marquee-section: the list is rendered twice so the -50% loop is seamless.
export default function HeadlineMarquee({ items }: { items: HomeItem[] }) {
  if (items.length === 0) return null;
  const loop = [...items, ...items];

  return (
    <section id="vm-marquee" aria-label="Manchetes">
      <div className="vm-marquee-track">
        {loop.map((item, i) => {
          const isCopy = i >= items.length;
          return (
            <Link
              key={`${item.slug}-${i}`}
              href={`/${item.slug}`}
              className={cn("vm-marquee-item", item.urgent && "is-urgent")}
              aria-hidden={isCopy || undefined}
              tabIndex={isCopy ? -1 : undefined}
            >
              <CruzMalta size={10} />
              {item.title}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
