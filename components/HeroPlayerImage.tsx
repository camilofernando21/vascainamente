"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { PLAYER_IMAGES } from "@/lib/players";

const IMAGES = PLAYER_IMAGES;

export default function HeroPlayerImage({
  className,
  intervalMs = 6000,
}: {
  className?: string;
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % IMAGES.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={index}
        src={IMAGES[index]}
        alt=""
        // lazy: on phones this desktop photo sits in a hidden block, and lazy images that aren't
        // rendered are never downloaded; on desktop it's on screen, so it loads right away
        loading="lazy"
        className="glitch-in absolute inset-0 h-full w-full object-contain object-bottom"
      />
      <div
        key={`scan-${index}`}
        className="glitch-scanlines pointer-events-none absolute inset-0"
        style={{
          WebkitMaskImage: `url(${IMAGES[index]})`,
          maskImage: `url(${IMAGES[index]})`,
        }}
      />
      {/* Bam83 RGB split layers, remounted (and so re-fired) on every image swap */}
      <div
        key={`red-${index}`}
        className="glitch-layer glitch-layer-red active"
        style={{ backgroundImage: `url(${IMAGES[index]})` }}
      />
      <div
        key={`blue-${index}`}
        className="glitch-layer glitch-layer-blue active"
        style={{ backgroundImage: `url(${IMAGES[index]})` }}
      />
    </div>
  );
}
