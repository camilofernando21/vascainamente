"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Stats are placeholders on purpose: to be filled in by hand, never invented.
const IDOLS = ["Roberto Dinamite", "Romário", "Edmundo", "Juninho"];

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
        {IDOLS.map((name, i) => (
          <Fragment key={name}>
            <div className="final-name-wrap" tabIndex={0}>
              <span className="final-name">{name}</span>
              <div className="final-stats">
                <span className="final-stats-rank">[confirmar]</span>
                <span className="final-stats-pts">
                  [confirmar] <span>gols</span>
                </span>
                <p className="final-stats-detail">
                  [confirmar]
                  <br />
                  [confirmar]
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
