"use client";

import { useEffect, useRef, useState } from "react";
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

// Dinamite Eterno, Vasco TV (official channel, embedding allowed).
const VIDEO_ID = "n4Noppe79tI";

const EMBED_SRC = ytEmbedUrl(VIDEO_ID, {
  autoplay: 1,
  mute: 1,
  loop: 1,
  playlist: VIDEO_ID,
  controls: 0,
  playsinline: 1,
  rel: 0,
  modestbranding: 1,
});

// Ported from Bam83's #presser: background video with gradient burn, dark overlay and a sound toggle.
// The iframe only exists once the section is one screen away; before that the texture shows.
export default function HistoricQuote() {
  const sectionRef = useRef<HTMLElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const near = useNearViewport(sectionRef);
  const inView = useInViewport(sectionRef, near);
  const { ready, onLoad } = useYouTubeReady(iframeRef, near);
  const [muted, setMuted] = useState(true);

  // pause off screen, resume on screen
  useEffect(() => {
    if (!ready) return;
    ytCommand(iframeRef.current, inView ? "playVideo" : "pauseVideo");
  }, [ready, inView]);

  const toggleSound = () => {
    const next = !muted;
    if (!next) claimAudio("presser");
    ytCommand(iframeRef.current, next ? "mute" : "unMute");
    setMuted(next);
  };

  // the idols section turned its sound on: go quiet
  useAudioClaims("presser", () => {
    ytCommand(iframeRef.current, "mute");
    setMuted(true);
  });

  return (
    <section id="vm-presser" ref={sectionRef} aria-label="Resposta Histórica">
      <div id="vm-presser-bg" aria-hidden="true" />
      {near && (
        <div id="vm-presser-video-wrap" className={cn(ready && "is-ready")} aria-hidden="true">
          <iframe
            ref={iframeRef}
            src={EMBED_SRC}
            title="Dinamite Eterno, Vasco TV"
            onLoad={onLoad}
            tabIndex={-1}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}
      <div id="vm-presser-overlay" aria-hidden="true" />
      <blockquote id="vm-presser-quote">
        <p className="presser-quote-text">&ldquo;O clube que abriu as portas para todos.&rdquo;</p>
        <cite className="vm-label presser-quote-attr">Resposta Histórica · 7 de abril de 1924</cite>
      </blockquote>

      {near && (
        <>
          <button type="button" id="vm-presser-sound" className="vm-sound-toggle" onClick={toggleSound} aria-pressed={!muted}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <polygon points="3,7 3,17 8,17 14,22 14,2 8,7" fill="#F0EBE1" />
              <path d="M17 9a4 4 0 0 1 0 6" stroke="#F0EBE1" strokeWidth="2" strokeLinecap="round" />
              <path d="M20 6a8 8 0 0 1 0 12" stroke="#F0EBE1" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>{muted ? "Toque para ouvir" : "Toque para silenciar"}</span>
          </button>
          <a
            className="vm-video-credit"
            href={ytWatchUrl(VIDEO_ID)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Vídeo: Vasco TV
          </a>
        </>
      )}
    </section>
  );
}
