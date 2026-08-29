"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const IMAGES = [
  "/images/jogador-vasco-1.png",
  "/images/jogador-vasco-2.png",
  "/images/jogador-vasco-3.png",
  "/images/jogador-vasco-4.png",
  "/images/jogador-vasco-5.png",
  "/images/jogador-vasco-6.png",
  "/images/jogador-vasco-7.png",
  "/images/jogador-vasco-8.png",
];

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
        className="glitch-in absolute inset-0 h-full w-full object-contain object-bottom"
      />
      <div key={`scan-${index}`} className="glitch-scanlines pointer-events-none absolute inset-0" />
    </div>
  );
}
