"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import {
  useInViewport,
  useNearViewport,
  useYouTubeReady,
  ytCommand,
  ytEmbedUrl,
  ytWatchUrl,
} from "@/lib/youtube";
import { cn } from "@/lib/utils";

// Texts supplied by the editor; do not change numbers or wording without checking with them.
const IDOLS = [
  {
    name: "Roberto Dinamite",
    videoId: "RpTCqNPEq-g",
    rank: "Maior artilheiro da história",
    value: "708",
    unit: "gols",
    lines: ["1.110 jogos, de 1971 a 1992", "190 gols no Brasileirão, recorde"],
  },
  {
    name: "Romário",
    // no goals video on the official channel yet: the background stays as is
    videoId: null,
    rank: "2º maior artilheiro do clube",
    value: "313",
    unit: "gols",
    lines: ["402 jogos em quatro passagens", "De 1985 a 2007"],
  },
  {
    name: "Edmundo",
    videoId: "8iMIV_v6T-Y",
    rank: "Brasileirão de 1997",
    value: "29",
    unit: "gols",
    lines: ["Recorde da competição na época", "6 gols em um jogo contra o União São João"],
  },
  {
    name: "Juninho",
    videoId: "ETlflPNEvJ4",
    rank: "O gol do Monumental",
    value: "1998",
    unit: "Libertadores",
    lines: ["Falta contra o River Plate", "Semifinal, 22 de julho de 1998"],
  },
];

// Official Vasco TV videos. One iframe for the whole section, created near the viewport,
// loaded paused; the hovered (or tapped) idol's video plays muted behind the names.
const FIRST_VIDEO = IDOLS.find((idol) => idol.videoId)?.videoId ?? "";
const EMBED_SRC = ytEmbedUrl(FIRST_VIDEO, {
  autoplay: 0,
  mute: 1,
  controls: 0,
  playsinline: 1,
  rel: 0,
  modestbranding: 1,
});

// Ported from Bam83's #final: giant names, hover card with stats, pulsing hint.
export default function Idols() {
  const sectionRef = useRef<HTMLElement>(null);
  const namesRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadedVideo = useRef(FIRST_VIDEO);
  const near = useNearViewport(sectionRef);
  const inView = useInViewport(sectionRef, near);
  const { ready, onLoad } = useYouTubeReady(iframeRef, near);
  const [active, setActive] = useState<number | null>(null);
  const [lastVideo, setLastVideo] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [opensDown, setOpensDown] = useState<boolean[]>([]);

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

  // Names below the first row open their card downwards, so it doesn't cover the row above.
  // Measured from layout (not hardcoded names) so it follows whatever wrapping the width produces.
  useEffect(() => {
    const el = namesRef.current;
    if (!el) return;
    const update = () => {
      const names = Array.from(el.querySelectorAll<HTMLElement>(".final-name-wrap"));
      if (names.length === 0) return;
      const firstTop = names[0].offsetTop;
      const next = names.map((n) => n.offsetTop > firstTop + n.offsetHeight / 2);
      setOpensDown((prev) => (prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    document.fonts?.ready.then(update);
    return () => ro.disconnect();
  }, []);

  const activeVideo = active !== null ? IDOLS[active].videoId : null;
  const playing = !!activeVideo && ready && inView;

  // swap / play / pause the single player
  useEffect(() => {
    if (!ready) return;
    const iframe = iframeRef.current;
    if (!activeVideo || !inView) {
      ytCommand(iframe, "pauseVideo");
      return;
    }
    if (loadedVideo.current !== activeVideo) {
      ytCommand(iframe, "loadVideoById", [activeVideo]);
      loadedVideo.current = activeVideo;
    } else {
      ytCommand(iframe, "playVideo");
    }
    ytCommand(iframe, "mute");
    setLastVideo(activeVideo);
  }, [ready, activeVideo, inView]);

  // loop: loadVideoById plays once, so restart it when it ends while still active
  useEffect(() => {
    if (!ready) return;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.event === "onStateChange" && data.info === 0) {
          ytCommand(iframeRef.current, "seekTo", [0, true]);
          ytCommand(iframeRef.current, "playVideo");
        }
      } catch {}
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [ready]);

  const activate = (i: number) => setActive(i);
  const deactivate = (i: number) => setActive((cur) => (cur === i ? null : cur));

  return (
    <section id="idolos" ref={sectionRef} aria-label="Ídolos">
      {near && (
        <div id="vm-idol-video" className={cn(playing && "is-visible")} aria-hidden="true">
          <iframe
            ref={iframeRef}
            src={EMBED_SRC}
            title="Vídeos dos ídolos, Vasco TV"
            onLoad={onLoad}
            tabIndex={-1}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <div className="vm-idol-video-overlay" />
        </div>
      )}
      <div ref={namesRef} className={cn("final-names", visible && "visible")}>
        {IDOLS.map((idol, i) => (
          <Fragment key={idol.name}>
            <div
              className={cn("final-name-wrap", opensDown[i] && "opens-down")}
              tabIndex={0}
              onMouseEnter={() => activate(i)}
              onMouseLeave={() => deactivate(i)}
              onFocus={() => activate(i)}
              onBlur={() => deactivate(i)}
            >
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
      {/* keeps pointing at the last video played, so it can still be clicked after the fade */}
      {lastVideo && (
        <a
          className={cn("vm-video-credit", !playing && "is-dim")}
          href={ytWatchUrl(lastVideo)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Vídeo: Vasco TV
        </a>
      )}
    </section>
  );
}
