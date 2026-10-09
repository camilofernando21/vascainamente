"use client";

import { useState } from "react";
import { ytEmbedUrl } from "@/lib/youtube-url";
import { cn } from "@/lib/utils";
import NewsImage from "@/components/NewsImage";
import { track } from "@/lib/analytics";

// Lite embed: only the thumbnail until the click, then the real (nocookie) player with autoplay.
// Nothing from YouTube's player loads for people who never press play.
export default function LiteYouTube({
  id,
  title,
  className,
  sizes = "(max-width: 767px) 92vw, 820px",
  priority = false,
  trackLocation,
}: {
  id: string;
  title: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** when set, a GA4 "video_play" event is sent on play (e.g. "materia") */
  trackLocation?: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className={cn("vm-lite", className)}>
      {playing ? (
        <iframe
          src={ytEmbedUrl(id, { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1 })}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className="vm-lite-poster"
          onClick={() => {
            setPlaying(true);
            if (trackLocation) track("video_play", { video_id: id, video_title: title, location: trackLocation });
          }}
          aria-label={`Assistir: ${title}`}
        >
          <NewsImage src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} sizes={sizes} priority={priority} />
          <span className="vm-lite-play" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 10 10">
              <path d="M2.5 1.2 L8.8 5 L2.5 8.8 Z" fill="#F0EBE1" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
