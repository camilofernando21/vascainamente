"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Texts supplied by the editor; do not change numbers or wording without checking with them.
const IDOLS = [
  {
    name: "Roberto Dinamite",
    rank: "Maior artilheiro da história",
    value: "708",
    unit: "gols",
    lines: ["1.110 jogos, de 1971 a 1992", "190 gols no Brasileirão, recorde"],
  },
  {
    name: "Romário",
    rank: "2º maior artilheiro do clube",
    value: "313",
    unit: "gols",
    lines: ["402 jogos em quatro passagens", "De 1985 a 2007"],
  },
  {
    name: "Edmundo",
    rank: "Brasileirão de 1997",
    value: "29",
    unit: "gols",
    lines: ["Recorde da competição na época", "6 gols em um jogo contra o União São João"],
  },
  {
    name: "Juninho",
    rank: "O gol do Monumental",
    value: "1998",
    unit: "Libertadores",
    lines: ["Falta contra o River Plate", "Semifinal, 22 de julho de 1998"],
  },
];

// Ported from Bam83's #final: giant names, hover card with stats, pulsing hint.
export default function Idols() {
  const namesRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch("ontouchstart" in window);
    const el = namesRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="idolos" aria-label="Ídolos">
      <div ref={namesRef} className={cn("final-names", visible && "visible")}>
        {IDOLS.map((idol, i) => (
          <Fragment key={idol.name}>
            <div className="final-name-wrap" tabIndex={0}>
              <span className="final-name">{idol.name}</span>
              <div className="final-stats">
                <span className="final-stats-rank">{idol.rank}</span>
                <span className="final-stats-pts">
                  {idol.value} <span>{idol.unit}</span>
                </span>
                <p className="final-stats-detail">
                  {idol.lines.map((line, j) => (
                    <Fragment key={j}>
                      {j > 0 && <br />}
                      {line}
                    </Fragment>
                  ))}
                </p>
              </div>
            </div>
            {i < IDOLS.length - 1 && <span className="final-dot">·</span>}
          </Fragment>
        ))}
      </div>
      <p id="final-hint">{isTouch ? "Toque em cada nome" : "Passe o mouse em cada nome"}</p>
    </section>
  );
}
