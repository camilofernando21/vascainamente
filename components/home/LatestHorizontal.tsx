"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CROSS_PATH } from "@/components/ui/cruz-malta";
import type { HomeItem } from "@/lib/home";
import { cn } from "@/lib/utils";
import { PlayMark } from "@/components/ui/play-mark";
import { TimeAgo } from "@/components/TimeAgo";

const LINE = "rgba(240,235,225,0.08)";
const LINE_MID = "rgba(240,235,225,0.15)";

// Half pitch seen from above, in the same 300x280 box and stroke tones as Bam83's court.
function PitchLines() {
  return (
    <>
      <rect x="1" y="1" width="298" height="278" rx="2" fill="none" stroke={LINE} strokeWidth="1" />
      <line x1="1" y1="262" x2="299" y2="262" stroke="rgba(240,235,225,0.06)" strokeWidth="1" />
      <line x1="1" y1="20" x2="299" y2="20" stroke={LINE} strokeWidth="1" />
      <path d="M 110,20 A 40,40 0 0 0 190,20" fill="none" stroke={LINE} strokeWidth="1" strokeDasharray="4 3" />
      <rect x="62" y="186" width="176" height="76" fill="none" stroke={LINE_MID} strokeWidth="1" />
      <rect x="110" y="236" width="80" height="26" fill="none" stroke={LINE_MID} strokeWidth="1" />
      <path d="M 123.2,186 A 36,36 0 0 1 176.8,186" fill="none" stroke={LINE_MID} strokeWidth="1" />
      <circle cx="150" cy="210" r="1.6" fill="rgba(240,235,225,0.4)" />
      <rect x="128" y="262" width="44" height="8" fill="none" stroke="rgba(240,235,225,0.35)" strokeWidth="1.2" />
      <path d="M 9,262 A 8,8 0 0 0 1,254" fill="none" stroke={LINE} strokeWidth="1" />
      <path d="M 291,262 A 8,8 0 0 1 299,254" fill="none" stroke={LINE} strokeWidth="1" />
    </>
  );
}

// Deterministic marker spots per panel (same on server and client).
function markers(seed: number) {
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: 16 }, () => ({
    x: 24 + rnd() * 252,
    y: 36 + rnd() * 216,
    size: 7 + rnd() * 5,
    red: rnd() > 0.45,
  }));
}
const MARKERS = [1, 2, 3, 4].map(markers);

function PitchMarkers({ panel, popped }: { panel: number; popped: boolean }) {
  if (!popped) return null;
  return (
    <g>
      {MARKERS[panel % MARKERS.length].map((m, i) => (
        <g key={i} transform={`translate(${(m.x - m.size / 2).toFixed(2)} ${(m.y - m.size / 2).toFixed(2)}) scale(${(m.size / 696).toFixed(5)})`}>
          <g className="shot-dot popped" style={{ animationDelay: `${i * 28}ms` }}>
            <path d={CROSS_PATH} fill={m.red ? "#C8003C" : "rgba(240,235,225,0.5)"} />
          </g>
        </g>
      ))}
    </g>
  );
}

// Ported from Bam83's #quarters: vertical scroll drives a horizontal track of panels.
export default function LatestHorizontal({ items }: { items: HomeItem[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [rendered, setRendered] = useState<Set<number>>(() => new Set([0]));
  const panels = items.length;

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    const progress = progressRef.current;
    if (!section || !track || !progress || panels === 0) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRendered(new Set(items.map((_, i) => i)));
      return;
    }

    let last = -1;
    let ticking = false;

    function update() {
      ticking = false;
      const rect = section!.getBoundingClientRect();
      const scrollable = section!.offsetHeight - window.innerHeight;
      const p = Math.max(0, Math.min(1, -rect.top / scrollable));

      track!.style.transform = `translateX(-${p * (panels - 1) * 100}vw)`;
      progress!.style.width = `${p * 100}%`;

      const now = Math.min(panels - 1, Math.floor(p * panels));
      if (now !== last) {
        last = now;
        setActive(now);
        setRendered((prev) => (prev.has(now) ? prev : new Set(prev).add(now)));
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
  }, [panels, items]);

  if (panels === 0) return null;

  return (
    <section
      id="vm-latest"
      ref={sectionRef}
      aria-label="Últimas notícias"
      style={{ "--panels": panels } as React.CSSProperties}
    >
      <div id="vm-latest-sticky">
        <div id="vm-latest-progress" ref={progressRef} />
        <div id="vm-latest-nav" aria-hidden="true">
          {items.map((_, i) => (
            <div key={i} className={cn("q-nav-dot", i === active && "active")}>
              {String(i + 1).padStart(2, "0")}
            </div>
          ))}
        </div>

        <div id="vm-latest-track" ref={trackRef}>
          {items.map((item, i) => (
            <article key={item.slug} className="q-panel">
              <div className="q-panel-ghost" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </div>

              <div className="q-court-side" aria-hidden="true">
                <svg className="q-court-svg" viewBox="0 0 300 280" preserveAspectRatio="xMinYMin meet">
                  <PitchLines />
                  <PitchMarkers panel={i} popped={rendered.has(i)} />
                </svg>
              </div>

              <div className="q-editorial">
                <p className={cn("vm-label q-panel-eyebrow", item.urgent && "is-red")}>
                  {item.category}
                  {item.hasVideo && <PlayMark size={11} />}
                </p>
                <h3 className="q-panel-title">
                  <Link href={`/${item.slug}`}>{item.title}</Link>
                </h3>
                {item.excerpt && <p className="q-panel-story">{item.excerpt}</p>}
                <div className="q-stat-trio">
                  <div className="q-stat-item">
                    <span className="q-stat-val">{item.source || "Vascainamente"}</span>
                    <span className="q-stat-cat">Fonte</span>
                  </div>
                  <div className="q-stat-item">
                    <span className="q-stat-val"><TimeAgo date={item.date} initial={item.ago} /></span>
                    <span className="q-stat-cat">Publicado</span>
                  </div>
                  <div className="q-stat-item">
                    <span className="q-stat-val red">{item.category.toLowerCase()}</span>
                    <span className="q-stat-cat">Categoria</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
