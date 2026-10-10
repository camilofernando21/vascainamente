"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Order matters: must start with the red Maltese cross, then the club's crest history.
const CRESTS = [
  "/images/escudo-1-cruz.png",
  "/images/escudo-2-1898.png",
  "/images/escudo-3-1903.png",
  "/images/escudo-4-1920.png",
  "/images/escudo-5-atual.png",
];

export default function CrestShowcase({
  className,
  intervalMs = 5000,
  sizes = "300px",
}: {
  className?: string;
  intervalMs?: number;
  // rendered width of the crest, so the server sends a resized WebP instead of the original PNG
  sizes?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % CRESTS.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return (
    <div className={cn("pointer-events-none relative", className)} style={{ perspective: "800px" }}>
      <Image
        key={index}
        src={CRESTS[index]}
        alt="Escudos históricos do Vasco da Gama"
        fill
        sizes={sizes}
        className="crest-flip object-contain"
      />
    </div>
  );
}
