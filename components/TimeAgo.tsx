"use client";

import { useEffect, useState } from "react";
import { timeAgoCompact, timeAgoWords } from "@/lib/time";

// The pages are cached, so a time computed on the server ("3 horas atrás") goes stale
// while the page waits to be regenerated. The browser recomputes it on load and every minute.
export function TimeAgo({ date, initial, compact = false }: { date: string; initial: string; compact?: boolean }) {
  const [text, setText] = useState(initial);

  useEffect(() => {
    const update = () => setText(compact ? timeAgoCompact(date) : timeAgoWords(date));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [date, compact]);

  return (
    <time dateTime={date} suppressHydrationWarning>
      {text}
    </time>
  );
}
