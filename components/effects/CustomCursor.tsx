"use client";

import { useEffect, useRef, useState } from "react";

const INTERACTIVE = 'a, button, [role="button"], input, select, textarea, label';

// Ported from Bam83's #custom-cursor: cream dot with mix-blend-mode difference, 2.5x over links. Desktop only.
export default function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if ("ontouchstart" in window) {
      document.body.classList.add("is-touch");
      setIsTouch(true);
      return;
    }
    const cursor = ref.current;
    if (!cursor) return;
    document.documentElement.classList.add("vm-cursor");

    const onMove = (e: MouseEvent) => {
      cursor.style.left = e.clientX + "px";
      cursor.style.top = e.clientY + "px";
      cursor.classList.remove("is-hidden");
    };
    const onLeave = () => cursor.classList.add("is-hidden");
    const onEnter = () => cursor.classList.remove("is-hidden");
    const onOver = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const hit = target?.closest?.(INTERACTIVE);
      cursor.classList.toggle("hovered", !!hit && !hit.closest('[data-cursor="plain"]'));
    };

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    document.addEventListener("mouseover", onOver, { passive: true });

    return () => {
      document.documentElement.classList.remove("vm-cursor");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      document.removeEventListener("mouseover", onOver);
    };
  }, []);

  if (isTouch) return null;
  return <div id="custom-cursor" ref={ref} className="is-hidden" aria-hidden="true" />;
}
