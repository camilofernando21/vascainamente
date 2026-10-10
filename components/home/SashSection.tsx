"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CruzMalta } from "@/components/ui/cruz-malta";
import NewsImage from "@/components/NewsImage";
import type { HomeItem } from "@/lib/home";

// The news of the day, told with the shirt: the white diagonal sash cuts across the screen
// with the headline running inside it, the Cruz de Malta is stamped on it, then the news opens.
const DRAW_END = 0.42; // sash fully across
const STAMP_START = 0.42;
const STAMP_END = 0.52; // cross lands (flash)
const PANEL_AT = 0.66; // news panel opens

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function SashText({ title }: { title: string }) {
  // repeated so the band is never empty while it slides
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="sash-run">
          {title}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/escudo-1-cruz.png" alt="" className="sash-sep" />
        </span>
      ))}
    </>
  );
}

export default function SashSection({ item }: { item: HomeItem | null }) {
  const sectionRef = useRef<HTMLElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const crossRef = useRef<HTMLImageElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const band = bandRef.current;
    const text = textRef.current;
    const cross = crossRef.current;
    const panel = panelRef.current;
    const flash = flashRef.current;
    if (!section || !band || !text || !cross || !panel || !flash) return;

    // phones and reduced motion: final state right away (the news must be on the first screen)
    if (window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 767px)").matches) {
      section.classList.add("sash-static");
      panel.classList.add("visible");
      return;
    }

    let stamped = false;
    let open = false;
    let ticking = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function update() {
      ticking = false;
      const rect = section!.getBoundingClientRect();
      const scrollable = section!.offsetHeight - window.innerHeight;
      const progress = clamp01(-rect.top / scrollable);

      // 1. the sash is drawn from the left shoulder down to the right (only the middle of the band is on screen)
      const draw = easeOut(clamp01(progress / DRAW_END));
      const reveal = 0.16 + 0.68 * draw;
      band!.style.clipPath = `inset(-20% ${((1 - reveal) * 100).toFixed(2)}% -20% 0)`;

      // the headline keeps running along the sash while the reader scrolls
      text!.style.transform = `translate3d(${(-progress * 22).toFixed(2)}%, 0, 0)`;

      // 2. the cross is stamped on the sash
      const s = easeOut(clamp01((progress - STAMP_START) / (STAMP_END - STAMP_START)));
      cross!.style.opacity = s.toFixed(3);
      cross!.style.transform = `translate(-50%, -50%) scale(${(2.4 - 1.4 * s).toFixed(3)}) rotate(${(-28 * (1 - s)).toFixed(2)}deg)`;

      if (s >= 1 && !stamped) {
        stamped = true;
        band!.classList.add("stamped");
        flash!.style.opacity = "0.4";
        timers.push(setTimeout(() => (flash!.style.opacity = "0"), 140));
      } else if (s < 1 && stamped) {
        stamped = false;
        band!.classList.remove("stamped");
      }

      // 3. the news opens over the shirt
      if (progress >= PANEL_AT && !open) {
        open = true;
        section!.classList.add("sash-open");
        panel!.classList.add("visible");
      } else if (progress < PANEL_AT - 0.04 && open) {
        open = false;
        section!.classList.remove("sash-open");
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
      timers.forEach(clearTimeout);
    };
  }, []);

  if (!item) return null;

  const word = item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1).toLowerCase() : "Hoje";

  return (
    <section id="vm-goal" ref={sectionRef} aria-label="A notícia do dia">
      <div ref={flashRef} id="vm-goal-flash" aria-hidden="true" />
      <div id="vm-goal-sticky">
        <p className="vm-court-label" aria-hidden="true">
          {item.dateFull}
        </p>

        <div className="vm-sash" ref={bandRef} aria-hidden="true">
          <div className="vm-sash-text" ref={textRef}>
            <SashText title={item.title} />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={crossRef} src="/images/escudo-1-cruz.png" alt="" className="vm-sash-cross" />
        </div>

        <div id="vm-swish-panel" ref={panelRef}>
          <div className="swish-left">
            <p className="vm-label swish-eyebrow">A notícia do dia</p>
            <p className="swish-word">{word}.</p>
            <h2 className="swish-title">{item.title}</h2>
            {item.excerpt && <p className="swish-copy">{item.excerpt}</p>}
            <Link href={`/${item.slug}`} className="vm-button">
              Ler matéria
            </Link>
          </div>

          <Link href={`/${item.slug}`} className="swish-right" aria-label={item.title}>
            <div className="video-corner video-corner-tl" />
            <div className="video-corner video-corner-tr" />
            <div className="video-corner video-corner-bl" />
            <div className="video-corner video-corner-br" />
            {item.source && <span className="video-caption">{item.source}</span>}
            {item.imageUrl ? (
              // below the hero: lazy, never priority
              <NewsImage src={item.imageUrl} sizes="(max-width: 767px) 88vw, 44vw" className="swish-image" />
            ) : (
              <div className="swish-placeholder">
                <CruzMalta size="55%" opacity={0.06} />
              </div>
            )}
          </Link>
        </div>
      </div>
    </section>
  );
}
