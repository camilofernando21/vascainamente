"use client";

import { useEffect, useState } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { NumberTicker } from "@/components/motion/number-ticker";

export default function StatsBar({
  totalPosts,
  postsToday,
}: {
  totalPosts: number;
  postsToday: number;
}) {
  const [readingNow, setReadingNow] = useState(4827 + postsToday * 37);

  useEffect(() => {
    const id = setInterval(() => {
      setReadingNow((v) => Math.max(1200, v + Math.round((Math.random() - 0.5) * 60)));
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid grid-cols-3 border-b border-border">
      <Stat value={<AnimatedNumber value={totalPosts} format={(n) => Math.round(n).toLocaleString("pt-BR")} className="font-serif text-[34px] font-normal text-text-hero" />} label="NOTÍCIAS PUBLICADAS" />
      <Stat value={<AnimatedNumber value={postsToday} format={(n) => Math.round(n).toLocaleString("pt-BR")} className="font-serif text-[34px] font-normal text-text-hero" />} label="PUBLICADAS HOJE" border />
      <Stat value={<NumberTicker value={readingNow} format={(n) => n.toLocaleString("pt-BR")} className="font-serif text-[34px] font-normal text-text-hero" />} label="LENDO AGORA" border />
    </div>
  );
}

function Stat({
  value,
  label,
  border,
}: {
  value: React.ReactNode;
  label: string;
  border?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 px-4 py-8 ${
        border ? "border-l border-border" : ""
      }`}
    >
      {value}
      <span className="text-center text-[10px] tracking-[1.5px] text-text-muted">{label}</span>
    </div>
  );
}
