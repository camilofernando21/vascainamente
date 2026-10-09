"use client";

import { useRef } from "react";
import LiteYouTube from "@/components/LiteYouTube";
import type { ChannelVideo } from "@/lib/vascotv";

// Horizontal carousel of the channel's latest videos; each one plays in place (lite embed).
export default function VascoTv({ videos, channelUrl }: { videos: ChannelVideo[]; channelUrl: string }) {
  const trackRef = useRef<HTMLUListElement>(null);

  if (videos.length === 0) return null;

  const scrollBy = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector("li");
    const step = card ? card.getBoundingClientRect().width + 24 : track.clientWidth * 0.8;
    track.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <section id="vm-vascotv" aria-label="Vasco TV">
      <header className="vm-vtv-head">
        <div>
          <p className="vm-label vm-vtv-eyebrow">Canal oficial · últimos vídeos</p>
          <h2 className="vm-vtv-title">Vasco TV</h2>
        </div>
        <div className="vm-vtv-controls">
          <button type="button" className="vm-vtv-arrow" onClick={() => scrollBy(-1)} aria-label="Vídeos anteriores">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10 3 L5 8 L10 13" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
          <button type="button" className="vm-vtv-arrow" onClick={() => scrollBy(1)} aria-label="Próximos vídeos">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6 3 L11 8 L6 13" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
      </header>

      <ul className="vm-vtv-track" ref={trackRef}>
        {videos.map((video) => (
          <li key={video.id}>
            <LiteYouTube id={video.id} title={video.title} />
            <p className="vm-vtv-video-title">{video.title}</p>
            <p className="vm-vtv-meta">
              {video.dateLabel && <time dateTime={video.published}>{video.dateLabel}</time>}
            </p>
          </li>
        ))}
      </ul>

      <a className="vm-lite-credit vm-vtv-credit" href={channelUrl} target="_blank" rel="noopener noreferrer">
        Vídeos: Vasco TV
      </a>
    </section>
  );
}
