"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CruzMalta } from "@/components/ui/cruz-malta";
import { HISTORY_HREF } from "@/lib/categories";

// A Resposta Histórica told as a pinned chapter: four beats that change with the scroll
// (the 1923 title, the AMEA demand, the answer of 7 April 1924, what it became).
// Sources: Wikipédia (Resposta Histórica), Wikisource, Lance, NetVasco. The letter is quoted only where
// the closing line is the same in every source; everything else is told in our own words.
const BEATS: { kicker: string; lines: string[]; body: string }[] = [
  {
    kicker: "1923",
    lines: ["O Vasco é", "campeão carioca."],
    body: "Com um time de jogadores negros, mestiços e operários, o clube vence 12 dos 14 jogos e fica com o título do Rio de Janeiro.",
  },
  {
    kicker: "1924",
    lines: ["Os grandes clubes", "criam uma liga."],
    body: "A AMEA nasce e exige que o Vasco afaste 12 jogadores para participar. A justificativa era a conduta esportiva. Na prática, a lista atingia os negros e os operários do time.",
  },
  {
    kicker: "7 de abril de 1924",
    lines: ["José Augusto Prestes", "responde."],
    body: "O presidente do Vasco escreve a Arnaldo Guinle, presidente da AMEA, e recusa. Prefere deixar a liga a abrir mão dos seus jogadores.",
  },
  {
    kicker: "Resposta Histórica",
    lines: ["O clube que abriu", "as portas para todos."],
    body: "A carta virou símbolo da luta contra o racismo e a desigualdade no futebol brasileiro, e o clube a lembra a cada 7 de abril.",
  },
];

const QUOTE = "sentimos ter que comunicar a V. Exa. que desistimos de fazer parte da A.M.E.A.";
const TWELVE = Array.from({ length: 12 }, (_, i) => i);
const GHOST = ["1923", "1924", "07.04", "1924"];
const TWELVE_LABEL = ["Time campeão de 1923", "12 jogadores na lista da AMEA", "12 jogadores mantidos", "12 jogadores mantidos"];

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export default function HistoricResponse() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // reduced motion: the CSS shows every beat in sequence, nothing is pinned
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const beats = Array.from(section.querySelectorAll<HTMLElement>(".vm-resp-beat"));
    const leaving = new Map<HTMLElement, number>();
    let current = -1;
    let ticking = false;

    function update() {
      ticking = false;
      const rect = section!.getBoundingClientRect();
      const scrollable = section!.offsetHeight - window.innerHeight;
      const p = clamp01(-rect.top / scrollable);
      section!.style.setProperty("--p", p.toFixed(4));
      const next = Math.min(BEATS.length - 1, Math.floor(p * BEATS.length));
      if (next !== current) {
        const prev = beats[current];
        current = next;
        section!.dataset.beat = String(next);
        beats.forEach((el, i) => el.classList.toggle("is-active", i === next));
        // the beat that is going away slides out first, then the new one comes in
        if (prev) {
          window.clearTimeout(leaving.get(prev));
          prev.classList.add("is-leaving");
          leaving.set(prev, window.setTimeout(() => prev.classList.remove("is-leaving"), 520));
        }
        beats[next].classList.remove("is-leaving");
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
      leaving.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <section id="vm-resposta" className="vm-resp" ref={sectionRef} data-beat="0" aria-label="A Resposta Histórica, 7 de abril de 1924">
      <div className="vm-resp-stage">
        <div className="vm-resp-rail" aria-hidden="true" />

        <div className="vm-resp-ghosts" aria-hidden="true">
          {GHOST.map((g, i) => (
            <span key={i} className={`vm-resp-ghost g${i}`}>
              {g}
            </span>
          ))}
        </div>

        <p className="vm-label vm-resp-tag">Resposta Histórica</p>

        <div className="vm-resp-beats">
          {BEATS.map((b, i) => (
            <div key={i} className={i === 0 ? "vm-resp-beat is-active" : "vm-resp-beat"}>
              <p className="vm-resp-kicker">{b.kicker}</p>
              <h2 className="vm-resp-title">
                {b.lines.map((line, j) => (
                  <span key={j} className="vm-resp-line">
                    <span className="vm-resp-line-in" style={{ transitionDelay: `${0.08 + j * 0.1}s` }}>
                      {line}
                    </span>
                  </span>
                ))}
              </h2>
              <p className="vm-resp-body">{b.body}</p>
              {i === 2 && (
                <blockquote className="vm-resp-mquote">
                  <p>&hellip;{QUOTE}</p>
                </blockquote>
              )}
            </div>
          ))}
        </div>

        {/* the letter (wide screens): header from the sources, the closing line quoted */}
        <aside className="vm-resp-letter" aria-hidden="true">
          <p className="vm-resp-letter-head">Club de Regatas Vasco da Gama</p>
          <p className="vm-resp-letter-date">Rio de Janeiro, 7 de abril de 1924.</p>
          <p className="vm-resp-letter-to">
            Ao Dr. Arnaldo Guinle
            <br />
            Presidente da A.M.E.A.
          </p>
          <div className="vm-resp-letter-rules">
            {[100, 94, 98, 62, 0, 100, 91, 97, 84].map((w, i) =>
              w ? <span key={i} style={{ width: `${w}%` }} /> : <i key={i} />,
            )}
          </div>
          <p className="vm-resp-letter-quote">
            &hellip;{QUOTE}
          </p>
          <p className="vm-resp-letter-sign">
            José Augusto Prestes
            <br />
            Presidente do Vasco
          </p>
        </aside>

        <div className="vm-resp-twelve">
          <div className="vm-resp-twelve-label" aria-hidden="true">
            {TWELVE_LABEL.map((t, i) => (
              <span key={i} className={`t${i}`}>
                {t}
              </span>
            ))}
          </div>
          <div className="vm-resp-crosses" aria-hidden="true">
            {TWELVE.map((i) => (
              <span key={i} className="vm-resp-cross" style={{ ["--i" as string]: i }}>
                <CruzMalta size="100%" color="currentColor" />
              </span>
            ))}
          </div>
        </div>

        <div className="vm-resp-count" aria-hidden="true">
          {BEATS.map((_, i) => (
            <span key={i} className={`c${i}`}>
              0{i + 1} / 0{BEATS.length}
            </span>
          ))}
        </div>

        <Link href={HISTORY_HREF} className="vm-resp-cta">
          <span>Ver a linha do tempo do clube</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 7h11M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
