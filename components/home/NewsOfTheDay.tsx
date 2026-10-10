"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import NewsImage from "@/components/NewsImage";
import type { HomeItem } from "@/lib/home";

// The news of the day seen through the Cruz de Malta: the photo shows inside the cross,
// the cross grows with the scroll until the photo fills the screen, then the headline rises over it.
const OPEN_END = 0.62; // photo fills the screen
const TEXT_AT = 0.66; // headline rises

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export default function NewsOfTheDay({ item }: { item: HomeItem | null }) {
  const sectionRef = useRef<HTMLElement>(null);
  const windowRef = useRef<HTMLAnchorElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const win = windowRef.current;
    const photo = photoRef.current;
    const intro = introRef.current;
    const panel = panelRef.current;
    if (!section || !win || !photo || !intro || !panel) return;

    // phones and reduced motion: photo and news right away (the news must be on the first screen)
    if (window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 767px)").matches) {
      section.classList.add("day-static");
      panel.classList.add("visible");
      return;
    }

    let open = false;
    let ticking = false;

    function update() {
      ticking = false;
      const rect = section!.getBoundingClientRect();
      const scrollable = section!.offsetHeight - window.innerHeight;
      const progress = clamp01(-rect.top / scrollable);

      // the cross starts as a window the size of a crest and grows past the edges of the screen:
      // its solid center is ~15% of the drawing, so ~9x the longest side covers everything
      const p = easeInOut(clamp01(progress / OPEN_END));
      const vmax = Math.max(window.innerWidth, window.innerHeight);
      const start = Math.min(window.innerWidth, window.innerHeight) * 0.42;
      const end = vmax * 9;
      const size = start * Math.pow(end / start, p);
      win!.style.setProperty("--cross", `${size.toFixed(1)}px`);
      win!.classList.toggle("full", p >= 1);

      // the photo settles while the window opens (slow push-in, like a camera)
      photo!.style.transform = `scale(${(1.28 - 0.28 * p).toFixed(4)})`;

      // the date and the label leave as the cross opens
      intro!.style.opacity = (1 - clamp01(p * 4)).toFixed(3);
      intro!.style.transform = `translateY(${(-40 * p).toFixed(1)}px)`;

      if (progress >= TEXT_AT && !open) {
        open = true;
        section!.classList.add("day-open");
        panel!.classList.add("visible");
      } else if (progress < TEXT_AT - 0.04 && open) {
        open = false;
        section!.classList.remove("day-open");
        panel!.classList.remove("visible");
      }
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  if (!item) return null;

  return (
    <section id="vm-goal" className="vm-day" ref={sectionRef} aria-label="A notícia do dia">
      <div id="vm-goal-sticky">
        <div className="vm-day-intro" ref={introRef} aria-hidden="true">
          <p className="vm-label vm-day-kicker">A notícia do dia</p>
          <p className="vm-court-label">{item.dateFull}</p>
        </div>

        <Link href={`/${item.slug}`} className="vm-day-window" ref={windowRef} aria-label={item.title} tabIndex={-1}>
          <div className="vm-day-photo" ref={photoRef}>
            {item.imageUrl ? (
              // below the hero: lazy, never priority
              <NewsImage src={item.imageUrl} sizes="100vw" className="vm-day-img" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/images/vasco-bg.png" alt="" className="vm-day-img" />
            )}
          </div>
          <div className="vm-day-shade" />
        </Link>

        <div className="vm-day-panel" ref={panelRef}>
          <p className="vm-label vm-day-eyebrow">
            A notícia do dia{item.source ? ` · ${item.source}` : ""}
          </p>
          <h2 className="vm-day-title">
            <Link href={`/${item.slug}`}>{item.title}</Link>
          </h2>
          {item.excerpt && <p className="vm-day-copy">{item.excerpt}</p>}
          <Link href={`/${item.slug}`} className="vm-button">
            Ler matéria
          </Link>
        </div>
      </div>
    </section>
  );
}
