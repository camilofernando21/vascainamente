"use client";

import { useEffect, useRef } from "react";
import type { HistoryDate } from "@/lib/historia";
import { dayLabel } from "@/lib/historia";
import { CruzMalta } from "@/components/ui/cruz-malta";

// Same mechanism as the home's horizontal "últimas" (Bam83's #quarters): the section is pinned and
// vertical scroll moves a horizontal track. Panels are narrower than the screen, so the section's
// height is derived from the track's real width instead of a fixed vh count.
export default function HistoryTimeline({ dates }: { dates: HistoryDate[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    const progress = progressRef.current;
    if (!section || !track || !progress) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let distance = 0;
    let ticking = false;

    const measure = () => {
      distance = Math.max(0, track.scrollWidth - window.innerWidth);
      section.style.height = `${window.innerHeight + distance}px`;
      update();
    };

    function update() {
      ticking = false;
      const rect = section!.getBoundingClientRect();
      const scrollable = section!.offsetHeight - window.innerHeight;
      const p = scrollable > 0 ? Math.max(0, Math.min(1, -rect.top / scrollable)) : 0;
      track!.style.transform = `translateX(${-p * distance}px)`;
      progress!.style.width = `${p * 100}%`;
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll);
      section.style.height = "";
    };
  }, []);

  return (
    <section className="vm-tl" ref={sectionRef} aria-label="Linha do tempo">
      <div className="vm-tl-sticky">
        <div className="vm-tl-progress" ref={progressRef} />
        <p className="vm-label vm-tl-eyebrow">Linha do tempo</p>
        <ol className="vm-tl-track" ref={trackRef}>
          {dates.map((d) => (
            <li key={`${d.ano}-${d.dia}`} className="vm-tl-item">
              <span className="vm-tl-year">{d.ano}</span>
              <span className="vm-label vm-tl-day">
                <CruzMalta size={10} />
                {dayLabel(d.dia)}
              </span>
              <h3 className="vm-tl-title">{d.titulo}</h3>
              <p className="vm-tl-text">{d.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
