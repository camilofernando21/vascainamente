"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CruzMalta } from "@/components/ui/cruz-malta";
import NewsImage from "@/components/NewsImage";
import type { HomeItem } from "@/lib/home";

// Goal drawn in the same 160x120 box and stroke weights as Bam83's hoop.
// The ball rests on the goal's ground line (y = 116 of 120).
const REST_RATIO = 116 / 120;
const DROP_END = 0.7;

const f = (n: number) => n.toFixed(2);
const polar = (r: number, deg: number, c = 50) => {
  const a = (deg * Math.PI) / 180;
  return [c + r * Math.cos(a), c + r * Math.sin(a)];
};
const pentagon = (cx: number, cy: number, r: number, rot: number) =>
  Array.from({ length: 5 }, (_, k) => {
    const a = ((rot + 72 * k) * Math.PI) / 180;
    return `${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}`;
  }).join(" ");

// Classic panel ball: a center pentagon, five clipped outer pentagons and the seams between them.
const BALL_CENTER = pentagon(50, 50, 13, -90);
const BALL_OUTER = Array.from({ length: 5 }, (_, k) => {
  const ang = -90 + 36 + 72 * k;
  const [cx, cy] = polar(38, ang);
  return pentagon(cx, cy, 10, ang + 180);
});
const BALL_SEAMS = Array.from({ length: 5 }, (_, k) => {
  const ang = -90 + 72 * k;
  const [x1, y1] = polar(13, ang);
  const [x2, y2] = polar(23, ang);
  const [lx, ly] = polar(28, ang - 36);
  const [rx, ry] = polar(28, ang + 36);
  return `M${f(x1)},${f(y1)} L${f(x2)},${f(y2)} M${f(lx)},${f(ly)} L${f(x2)},${f(y2)} L${f(rx)},${f(ry)}`;
}).join(" ");

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

function GoalBack() {
  return (
    <svg id="goal-back" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* back frame */}
      <path d="M26 104 V14 H134 V104" stroke="#F0EBE1" strokeWidth="1" opacity="0.3" />
      <line x1="26" y1="104" x2="134" y2="104" stroke="#F0EBE1" strokeWidth="0.6" opacity="0.15" />
      {/* depth: front corners to back corners */}
      <line x1="10" y1="30" x2="26" y2="14" stroke="#F0EBE1" strokeWidth="1" opacity="0.3" />
      <line x1="150" y1="30" x2="134" y2="14" stroke="#F0EBE1" strokeWidth="1" opacity="0.3" />
      <line x1="10" y1="118" x2="26" y2="104" stroke="#F0EBE1" strokeWidth="0.6" opacity="0.2" />
      <line x1="150" y1="118" x2="134" y2="104" stroke="#F0EBE1" strokeWidth="0.6" opacity="0.2" />
      {/* back net */}
      {range(8).map((k) => (
        <line key={`v${k}`} x1={26 + 12 * k} y1="14" x2={26 + 12 * k} y2="104" stroke="#F0EBE1" strokeWidth="0.6" opacity="0.2" />
      ))}
      {range(8).map((k) => (
        <line key={`h${k}`} x1="26" y1={14 + 10 * k} x2="134" y2={14 + 10 * k} stroke="#F0EBE1" strokeWidth="0.6" opacity="0.2" />
      ))}
      {/* roof net */}
      {range(7).map((k) => (
        <line key={`r${k}`} x1={10 + 17.5 * k} y1="30" x2={26 + 13.5 * k} y2="14" stroke="#F0EBE1" strokeWidth="0.6" opacity="0.15" />
      ))}
      {/* side nets */}
      {range(7).map((k) => (
        <g key={`s${k}`} opacity="0.15">
          <line x1="10" y1={30 + 11 * k} x2="26" y2={14 + 11.25 * k} stroke="#F0EBE1" strokeWidth="0.6" />
          <line x1="150" y1={30 + 11 * k} x2="134" y2={14 + 11.25 * k} stroke="#F0EBE1" strokeWidth="0.6" />
        </g>
      ))}
    </svg>
  );
}

function GoalFront() {
  return (
    <svg id="goal-front" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="0" y1="118.5" x2="160" y2="118.5" stroke="#F0EBE1" strokeWidth="0.6" opacity="0.2" />
      <line x1="10" y1="30" x2="10" y2="118" stroke="#F0EBE1" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
      <line x1="150" y1="30" x2="150" y2="118" stroke="#F0EBE1" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
      <line x1="8" y1="30" x2="152" y2="30" stroke="#F0EBE1" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

function Ball() {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      <defs>
        <clipPath id="vm-ball-clip">
          <circle cx="50" cy="50" r="47" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="47" fill="#F0EBE1" />
      <g clipPath="url(#vm-ball-clip)" fill="#0D0D0D">
        <polygon points={BALL_CENTER} />
        {BALL_OUTER.map((pts, i) => (
          <polygon key={i} points={pts} />
        ))}
        <path d={BALL_SEAMS} fill="none" stroke="#0D0D0D" strokeWidth="1.6" strokeLinecap="round" />
      </g>
      <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(13,13,13,0.25)" strokeWidth="1" />
    </svg>
  );
}

export default function GoalSection({ item }: { item: HomeItem | null }) {
  const sectionRef = useRef<HTMLElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const ball = ballRef.current;
    const panel = panelRef.current;
    const flash = flashRef.current;
    if (!section || !ball || !panel || !flash) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      panel.classList.add("visible");
      return;
    }

    let triggered = false;
    let ticking = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function update() {
      ticking = false;
      const rect = section!.getBoundingClientRect();
      const scrollable = section!.offsetHeight - window.innerHeight;
      const progress = Math.max(0, Math.min(1, -rect.top / scrollable));

      const goalWidth = Math.min(600, window.innerWidth * 0.85);
      const goalHeight = goalWidth * (120 / 160);
      const svgBottom = window.innerHeight * 0.96;
      const svgTop = svgBottom - goalHeight;

      const ballSize = ball!.offsetWidth;
      const startY = -ballSize - 40;
      const restY = svgTop + goalHeight * REST_RATIO - ballSize;

      let ballY: number;
      let rotation: number;
      if (progress <= DROP_END) {
        const p = progress / DROP_END;
        ballY = startY + (restY - startY) * p * p;
        rotation = p * 360;
      } else {
        ballY = restY;
        rotation = 360;
      }
      ball!.style.transform = `translateX(-50%) translateY(${ballY}px) rotate(${rotation}deg)`;

      if (progress > DROP_END && !triggered) {
        triggered = true;
        flash!.style.opacity = "0.45";
        timers.push(setTimeout(() => (flash!.style.opacity = "0"), 160));
        timers.push(setTimeout(() => panel!.classList.add("visible"), 250));
      }
      if (progress < 0.65 && triggered) {
        triggered = false;
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

  return (
    <section id="vm-goal" ref={sectionRef} aria-label="A notícia do dia">
      <div ref={flashRef} id="vm-goal-flash" aria-hidden="true" />
      <div id="vm-goal-sticky">
        <p className="vm-court-label" aria-hidden="true">
          {item.dateFull}
        </p>

        <GoalBack />
        <div id="vm-ball" ref={ballRef} aria-hidden="true">
          <Ball />
        </div>
        <GoalFront />

        <div id="vm-swish-panel" ref={panelRef}>
          <div className="swish-left">
            <p className="vm-label swish-eyebrow">A notícia do dia</p>
            <p className="swish-word">Gol.</p>
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
