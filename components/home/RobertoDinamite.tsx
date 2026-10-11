"use client";

import { useEffect, useRef } from "react";
import LiteYouTube from "@/components/LiteYouTube";
import { CruzMalta } from "@/components/ui/cruz-malta";
import { IDOLS } from "@/lib/idols";

// Roberto Dinamite, the club's greatest idol: a monument (the 708 goals), the numbers, the career in
// years, his videos from the official channels, and the farewell. Facts checked against several
// sources (births, titles, Copas, presidency); the figures in IDOLS are the editor's own.
const DINAMITE = IDOLS[0];

const STATS: { value: number; label: string; note: string }[] = [
  { value: 1110, label: "jogos pelo Vasco", note: "De 1971 a 1992, ninguém vestiu mais vezes a camisa." },
  { value: 190, label: "gols no Brasileirão", note: "O maior artilheiro da história da competição." },
  { value: 6, label: "títulos pelo clube", note: "O Brasileiro de 1974 e cinco Cariocas." },
  { value: 2, label: "Copas do Mundo", note: "1978 e 1982, com a camisa da Seleção." },
];

const CAREER: { year: string; text: string }[] = [
  { year: "1971", text: "Estreia no time principal do Vasco, aos 17 anos." },
  { year: "1974", text: "Primeiro título brasileiro do Vasco, com Dinamite artilheiro do campeonato." },
  { year: "1977", text: "Primeiro de cinco títulos cariocas." },
  { year: "1978", text: "Vai à sua primeira Copa do Mundo, na Argentina." },
  { year: "1980", text: "É negociado com o Barcelona, mas volta ao Vasco depois de poucos meses." },
  { year: "1982", text: "Segunda Copa do Mundo e mais um Carioca." },
  { year: "1992", text: "Quinto título carioca." },
  { year: "2008", text: "Eleito presidente do Vasco." },
  { year: "2023", text: "Morre no Rio de Janeiro, em 8 de janeiro, aos 68 anos." },
];

const VIDEOS = [DINAMITE.videos[1], DINAMITE.videos[0], DINAMITE.videos[2], DINAMITE.videos[3]];

const dots = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

// counts from 0 to the value once, when it reaches the screen. The server renders the final number,
// so without scripts or with reduced motion nothing changes.
function CountUp({ to, className }: { to: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.textContent = "0";
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const run = (now: number) => {
          const t = Math.min(1, (now - start) / 2200);
          el.textContent = dots(Math.round(to * easeOutExpo(t)));
          if (t < 1) raf = requestAnimationFrame(run);
        };
        raf = requestAnimationFrame(run);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);

  return (
    <span ref={ref} className={className}>
      {dots(to)}
    </span>
  );
}

export default function RobertoDinamite() {
  const rootRef = useRef<HTMLElement>(null);

  // scroll reveals: hidden only once scripts run, so nothing depends on them to be readable
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.classList.add("is-ready");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
    );
    root.querySelectorAll("[data-reveal], [data-reveal-line]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="vm-dinamite" className="vm-rd" ref={rootRef} aria-label="Roberto Dinamite, o ídolo máximo do Vasco">
      <div className="vm-rd-hero">
        <div className="vm-rd-glow" aria-hidden="true" />
        <CruzMalta size="100%" color="#F0EBE1" opacity={0.04} className="vm-rd-cross" />

        <div className="vm-rd-top">
          <p className="vm-label">O ídolo máximo</p>
          <p className="vm-label vm-rd-dates">Duque de Caxias · 13.04.1954 · 08.01.2023</p>
        </div>

        <div className="vm-rd-figure">
          <CountUp to={708} className="vm-rd-number" />
          <p className="vm-rd-figure-label">gols pelo Vasco</p>
          <p className="vm-label vm-rd-figure-note">O maior artilheiro da história do clube</p>
        </div>

        <h2 className="vm-rd-name">
          <span className="vm-rd-name-line" data-reveal-line>
            <span>Roberto</span>
          </span>
          <span className="vm-rd-name-line" data-reveal-line>
            <em>Dinamite</em>
          </span>
        </h2>
      </div>

      <div className="vm-rd-wrap">
        <p className="vm-rd-lede" data-reveal>
          Estreou aos 17 anos e fez gol pelo Vasco durante mais de duas décadas. Voltou para presidir o clube. <em>Para o vascaíno, ele é o maior.</em>
        </p>

        <div className="vm-rd-stats">
          {STATS.map((s, i) => (
            <div key={s.label} className="vm-rd-stat" data-reveal style={{ transitionDelay: `${i * 0.08}s` }}>
              <CountUp to={s.value} className="vm-rd-stat-value" />
              <p className="vm-label vm-rd-stat-label">{s.label}</p>
              <p className="vm-rd-stat-note">{s.note}</p>
            </div>
          ))}
        </div>

        <div className="vm-rd-career">
          <p className="vm-label vm-rd-sub" data-reveal>
            A carreira em anos
          </p>
          <ol className="vm-rd-years">
            {CAREER.map((c, i) => (
              <li key={c.year} data-reveal style={{ transitionDelay: `${(i % 3) * 0.08}s` }}>
                <span className="vm-rd-year">{c.year}</span>
                <span className="vm-rd-year-text">{c.text}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="vm-rd-videos">
          <p className="vm-label vm-rd-sub" data-reveal>
            Dinamite em campo e fora dele
          </p>
          <div className="vm-rd-video-grid">
            {VIDEOS.map((v, i) => (
              <figure key={v.id} className="vm-rd-video" data-reveal style={{ transitionDelay: `${(i % 2) * 0.1}s` }}>
                <LiteYouTube
                  id={v.id}
                  title={v.title ?? "Roberto Dinamite"}
                  sizes="(max-width: 767px) 92vw, 46vw"
                  trackLocation="dinamite"
                />
                <figcaption>
                  <span>{v.title}</span>
                  <span className="vm-label">Vídeo: {v.credit}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        <div className="vm-rd-farewell" data-reveal>
          <CruzMalta size={34} />
          <p className="vm-rd-eternal">Eterno.</p>
          <p className="vm-label">Roberto Dinamite · Vasco da Gama</p>
        </div>
      </div>
    </section>
  );
}
