"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import {
  claimAudio,
  useAudioClaims,
  useInViewport,
  useNearViewport,
  useYouTubeReady,
  ytCommand,
  ytEmbedUrl,
  ytWatchUrl,
} from "@/lib/youtube";
import { cn } from "@/lib/utils";

// Official channels only (Vasco TV, ge tv), all checked for embedding.
const VASCO_TV = "Vasco TV";
const GE = "ge.globo";

type IdolVideo = { id: string; credit: string };

// Texts supplied by the editor; do not change numbers or wording without checking with them.
const IDOLS: {
  name: string;
  videos: IdolVideo[];
  rank: string;
  value: string;
  unit: string;
  lines: string[];
}[] = [
  {
    name: "Roberto Dinamite",
    videos: [
      { id: "RpTCqNPEq-g", credit: VASCO_TV },
      { id: "Cf0EsQDY4iI", credit: GE },
      { id: "-COqah3cdZw", credit: GE },
      { id: "nIbv85ePNvU", credit: GE },
    ],
    rank: "Maior artilheiro da história",
    value: "708",
    unit: "gols",
    lines: ["1.110 jogos, de 1971 a 1992", "190 gols no Brasileirão, recorde"],
  },
  {
    name: "Romário",
    videos: [
      { id: "FGur3GPvfmw", credit: GE }, // milésimo gol, Vasco 3 x 1 Sport, 2007
      { id: "rSy14ftksyg", credit: GE },
      { id: "IWiM_ktgua0", credit: GE },
    ],
    rank: "2º maior artilheiro do clube",
    value: "313",
    unit: "gols",
    lines: ["402 jogos em quatro passagens", "De 1985 a 2007"],
  },
  {
    name: "Edmundo",
    videos: [
      { id: "8iMIV_v6T-Y", credit: VASCO_TV },
      { id: "BveUu9158t8", credit: GE },
      { id: "FiOzHG5k0yA", credit: VASCO_TV },
    ],
    rank: "Brasileirão de 1997",
    value: "29",
    unit: "gols",
    lines: ["Recorde da competição na época", "6 gols em um jogo contra o União São João"],
  },
  {
    name: "Juninho",
    videos: [
      { id: "ETlflPNEvJ4", credit: VASCO_TV },
      { id: "Xf1q1YYWNTU", credit: VASCO_TV },
      { id: "rSy14ftksyg", credit: GE },
    ],
    rank: "O gol do Monumental",
    value: "1998",
    unit: "Libertadores",
    lines: ["Falta contra o River Plate", "Semifinal, 22 de julho de 1998"],
  },
];

// One iframe for the whole section, created near the viewport, loaded paused. Each time an idol is
// chosen the next video of their list plays (position kept in sessionStorage); when a video ends the
// following one starts. It stays until another name is chosen or the section leaves the screen
// (then it pauses and the sound goes back to muted).
const FIRST_VIDEO = IDOLS[0].videos[0].id;
const STORAGE_KEY = (idol: number) => `vm-idol-video-${idol}`;

function readNext(idol: number): number {
  try {
    const n = Number(sessionStorage.getItem(STORAGE_KEY(idol)));
    return Number.isInteger(n) && n >= 0 ? n % IDOLS[idol].videos.length : 0;
  } catch {
    return 0;
  }
}

function storeNext(idol: number, playingIndex: number) {
  try {
    sessionStorage.setItem(STORAGE_KEY(idol), String((playingIndex + 1) % IDOLS[idol].videos.length));
  } catch {}
}
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
  const endedVideo = useRef<string | null>(null);
  const near = useNearViewport(sectionRef);
  const inView = useInViewport(sectionRef, near);
  const { ready, onLoad } = useYouTubeReady(iframeRef, near);
  const [active, setActive] = useState<number | null>(null);
  const [videoIndex, setVideoIndex] = useState(0);
  const [lastVideo, setLastVideo] = useState<IdolVideo | null>(null);
  const activeRef = useRef<number | null>(null);
  const videoIndexRef = useRef(0);
  activeRef.current = active;
  videoIndexRef.current = videoIndex;
  const [muted, setMuted] = useState(true);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
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

  const activeEntry = active !== null ? IDOLS[active].videos[videoIndex] ?? null : null;
  const activeVideo = activeEntry?.id ?? null;
  const playing = !!activeVideo && ready && inView;

  // leaving the section clears the choice and the sound
  useEffect(() => {
    if (!inView) {
      setActive(null);
      setMuted(true);
    }
  }, [inView]);

  // swap / play / pause the single player; a new idol keeps the current sound setting
  useEffect(() => {
    if (!ready) return;
    const iframe = iframeRef.current;
    if (!activeVideo || !inView) {
      ytCommand(iframe, "pauseVideo");
      ytCommand(iframe, "mute");
      return;
    }
    if (loadedVideo.current !== activeVideo) {
      ytCommand(iframe, "loadVideoById", [activeVideo]);
      loadedVideo.current = activeVideo;
      endedVideo.current = null;
    } else {
      ytCommand(iframe, "playVideo");
    }
    ytCommand(iframe, mutedRef.current ? "mute" : "unMute");
    setLastVideo(activeEntry);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activeEntry follows activeVideo
  }, [ready, activeVideo, inView]);

  useEffect(() => {
    if (ready && activeVideo) ytCommand(iframeRef.current, muted ? "mute" : "unMute");
  }, [ready, muted, activeVideo]);

  // the historic quote turned its sound on: go quiet
  useAudioClaims("idols", () => setMuted(true));

  const toggleSound = () => {
    if (muted) claimAudio("idols");
    setMuted(!muted);
  };

  // a video ended: move on to the idol's next one (a one-video list just restarts)
  useEffect(() => {
    if (!ready) return;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        // the postMessage API reports state inside "infoDelivery" (onStateChange only for subscribers)
        const ended =
          (data?.event === "infoDelivery" && data.info?.playerState === 0) ||
          (data?.event === "onStateChange" && data.info === 0);
        // infoDelivery repeats: advance once per loaded video
        if (!ended || endedVideo.current === loadedVideo.current) return;
        endedVideo.current = loadedVideo.current;
        const idol = activeRef.current;
        if (idol === null) return;
        const list = IDOLS[idol].videos;
        const next = (videoIndexRef.current + 1) % list.length;
        storeNext(idol, next);
        if (list[next].id === loadedVideo.current) {
          endedVideo.current = null;
          ytCommand(iframeRef.current, "seekTo", [0, true]);
          ytCommand(iframeRef.current, "playVideo");
        } else {
          setVideoIndex(next);
        }
      } catch {}
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [ready]);

  // choosing a different idol starts their next video; re-entering the current one changes nothing
  const choose = (i: number) => {
    if (activeRef.current === i) return;
    const index = readNext(i);
    storeNext(i, index);
    setVideoIndex(index);
    setActive(i);
  };

  return (
    <section id="idolos" ref={sectionRef} aria-label="Ídolos">
      {near && (
        <div id="vm-idol-video" className={cn(playing && "is-visible")} aria-hidden="true">
          <iframe
            ref={iframeRef}
            src={EMBED_SRC}
            title="Vídeos dos ídolos"
            onLoad={onLoad}
            tabIndex={-1}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <div className="vm-idol-video-overlay" />
        </div>
      )}
      <div ref={namesRef} className={cn("final-names", visible && "visible", playing && "has-active")}>
        {IDOLS.map((idol, i) => (
          <Fragment key={idol.name}>
            <div
              className={cn("final-name-wrap", opensDown[i] && "opens-down", active === i && "is-active")}
              tabIndex={0}
              onMouseEnter={() => choose(i)}
              onFocus={() => choose(i)}
              onClick={() => choose(i)}
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
      {playing && (
        <button
          type="button"
          className="vm-sound-toggle is-idols"
          onClick={toggleSound}
          aria-pressed={!muted}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <polygon points="3,7 3,17 8,17 14,22 14,2 8,7" fill="#F0EBE1" />
            <path d="M17 9a4 4 0 0 1 0 6" stroke="#F0EBE1" strokeWidth="2" strokeLinecap="round" />
            <path d="M20 6a8 8 0 0 1 0 12" stroke="#F0EBE1" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>{muted ? "Toque para ouvir" : "Toque para silenciar"}</span>
        </button>
      )}
      {/* keeps pointing at the last video played, so it can still be clicked after the fade */}
      {lastVideo && (
        <a
          className={cn("vm-video-credit", !playing && "is-dim")}
          href={ytWatchUrl(lastVideo.id)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Vídeo: {lastVideo.credit}
        </a>
      )}
    </section>
  );
}
