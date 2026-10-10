"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { HomeItem } from "@/lib/home";
import { cn } from "@/lib/utils";
import { PlayMark } from "@/components/ui/play-mark";
import { CruzMalta } from "@/components/ui/cruz-malta";
import { TimeAgo } from "@/components/TimeAgo";

// Positions and tilts copied from Bam83's #quotes field.
const SLOTS: { style: React.CSSProperties; rot: number }[] = [
  { style: { top: "12%", left: "10%" }, rot: -2 },
  { style: { top: "14%", left: "36%" }, rot: 1.5 },
  { style: { top: "8%", right: "20%" }, rot: -1 },
  { style: { top: "42%", left: "10%" }, rot: 2 },
  { style: { top: "38%", left: "40%" }, rot: -1.5 },
  { style: { top: "35%", right: "15%" }, rot: 1 },
  { style: { top: "65%", left: "12%" }, rot: -2.5 },
  { style: { top: "62%", right: "22%" }, rot: 2 },
  { style: { top: "72%", left: "35%" }, rot: -1 },
];

export type HistoryCard = { year: number; title: string; day: string };

export default function TodayCards({
  items,
  isToday,
  history = null,
}: {
  items: HomeItem[];
  isToday: boolean;
  // "Hoje na história": only when today's date exists in content/historia.json; takes the first slot
  history?: HistoryCard | null;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const punchRef = useRef<HTMLDivElement>(null);
  const offset = history ? 1 : 0;
  const cards = items.slice(0, SLOTS.length - offset);

  useEffect(() => {
    const section = sectionRef.current;
    const headline = headlineRef.current;
    const field = fieldRef.current;
    const punch = punchRef.current;
    if (!section || !headline || !field || !punch) return;
    // phones get a plain readable list instead of the floating cards (see the CSS)
    if (window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 767px)").matches) return;

    const els = Array.from(field.querySelectorAll<HTMLElement>(".quote-card"));
    const total = els.length;
    const state = { punchShown: false, headlineFaded: false };
    const timers: ReturnType<typeof setTimeout>[] = [];
    let ticking = false;

    function update() {
      ticking = false;
      const rect = section!.getBoundingClientRect();
      const scrollable = section!.offsetHeight - window.innerHeight;
      const p = Math.max(0, Math.min(1, -rect.top / scrollable));

      if (p >= 0.18 && !state.headlineFaded) {
        state.headlineFaded = true;
        headline!.style.opacity = "0";
      } else if (p < 0.18 && state.headlineFaded) {
        state.headlineFaded = false;
        headline!.style.opacity = "1";
      }

      if (p >= 0.18 && p < 0.88) {
        const target = Math.floor(((p - 0.18) / 0.62) * total);
        els.forEach((card, i) => {
          card.classList.remove("fading");
          card.classList.toggle("popped", i < target);
        });
      } else if (p < 0.18) {
        els.forEach((card) => card.classList.remove("popped", "fading"));
      }

      if (p >= 0.88) {
        if (!state.punchShown) {
          state.punchShown = true;
          els.forEach((card) => {
            card.classList.remove("popped");
            card.classList.add("fading");
          });
          headline!.style.opacity = "0";
          timers.push(setTimeout(() => punch!.classList.add("visible"), 400));
        }
      } else if (p < 0.86 && state.punchShown) {
        state.punchShown = false;
        punch!.classList.remove("visible");
        els.forEach((card) => card.classList.remove("fading"));
      }
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      timers.forEach(clearTimeout);
    };
  }, []);

  if (cards.length === 0) return null;

  return (
    <section id="vm-today" ref={sectionRef} aria-label="Notícias do dia">
      <div id="vm-today-sticky">
        <div id="vm-today-headline" ref={headlineRef}>
          <p className="vm-label quotes-eyebrow">
            {cards.length} {cards.length === 1 ? "notícia" : "notícias"} ·{" "}
            {isToday ? "últimas 24 horas" : "mais recentes"}
          </p>
          <h2 className="quotes-heading">
            Tudo o que saiu <em>sobre o Vasco</em> {isToday ? "hoje." : "nos últimos dias."}
          </h2>
        </div>

        <div id="vm-today-field" ref={fieldRef}>
          {history && (
            <Link
              href="/historia"
              className="quote-card is-history"
              style={
                { ...SLOTS[0].style, "--rot": `${SLOTS[0].rot}deg`, "--tot": `${SLOTS[0].rot}deg` } as React.CSSProperties
              }
            >
              <div className="quote-card-header">
                <div className="quote-avatar is-red">
                  <CruzMalta size={14} color="#F0EBE1" />
                </div>
                <div className="quote-meta">
                  <span className="quote-name">Hoje na história</span>
                  <span className="quote-handle">
                    {history.day} de {history.year}
                  </span>
                </div>
              </div>
              <p className="quote-text">{history.title}</p>
            </Link>
          )}
          {cards.map((item, i) => {
            const slot = SLOTS[i + offset];
            return (
              <Link
                key={item.slug}
                href={`/${item.slug}`}
                className="quote-card"
                style={
                  {
                    ...slot.style,
                    "--rot": `${slot.rot}deg`,
                    "--tot": `${slot.rot}deg`,
                  } as React.CSSProperties
                }
              >
                <div className="quote-card-header">
                  <div className={cn("quote-avatar", item.urgent && "is-red")}>{item.sourceShort}</div>
                  <div className="quote-meta">
                    <span className="quote-name">
                      {item.source || "Vascainamente"}
                      {item.hasVideo && <PlayMark size={8} />}
                    </span>
                    <span className="quote-handle"><TimeAgo date={item.date} initial={item.ago} /></span>
                  </div>
                </div>
                <p className="quote-text">{item.title}</p>
              </Link>
            );
          })}
        </div>

        <div id="vm-today-punchline" ref={punchRef}>
          <p className="punchline-main">Vasco é Vasco.</p>
        </div>
      </div>
    </section>
  );
}
