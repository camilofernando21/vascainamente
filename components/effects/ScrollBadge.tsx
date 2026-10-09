"use client";

import { useEffect, useRef } from "react";

const BADGE_W = 60;

// Ported from Bam83's #scroll-badge: spinning ring, follows the mouse after the first scroll,
// hides while scrolling, and is gone for good once the idols section is reached.
export default function ScrollBadge({ stopAtId = "idolos" }: { stopAtId?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const badge = ref.current;
    if (!badge) return;

    const isTouch = "ontouchstart" in window;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let followTimer: ReturnType<typeof setTimeout> | undefined;
    let gone = false;
    let following = false;
    let initialized = false;
    let mouseX = 0;
    let mouseY = 0;
    let ticking = false;

    const cursor = () => document.getElementById("custom-cursor");

    if (isTouch) {
      badge.style.left = "1.5rem";
      badge.style.top = "1.5rem";
      badge.style.width = "100px";
      badge.style.height = "100px";
    }

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (following && !gone) {
        badge.style.left = mouseX - BADGE_W + "px";
        badge.style.top = mouseY - BADGE_W + "px";
      }
    };

    function showBadge() {
      if (gone) return;
      initialized = true;
      badge!.classList.remove("is-hidden");
      if (!isTouch && following) cursor()?.classList.add("badge-active");
    }

    function hideBadge() {
      badge!.classList.add("is-hidden");
      if (!isTouch) cursor()?.classList.remove("badge-active");
    }

    function update() {
      ticking = false;
      if (gone) return;
      const stop = document.getElementById(stopAtId);
      if (stop && stop.getBoundingClientRect().top <= window.innerHeight * 0.75) {
        gone = true;
        clearTimeout(hideTimer);
        hideBadge();
        return;
      }
      if (!initialized) return;

      if (!isTouch && !following) {
        following = true;
        badge!.style.left = mouseX - BADGE_W + "px";
        badge!.style.top = mouseY - BADGE_W + "px";
        followTimer = setTimeout(() => badge!.classList.add("following"), 650);
      }

      hideBadge();
      clearTimeout(hideTimer);
      hideTimer = setTimeout(showBadge, 2500);
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    if (!isTouch) document.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    const firstShow = setTimeout(showBadge, 9000);

    return () => {
      clearTimeout(firstShow);
      clearTimeout(hideTimer);
      clearTimeout(followTimer);
      document.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      cursor()?.classList.remove("badge-active");
    };
  }, [stopAtId]);

  return (
    <div id="scroll-badge" ref={ref} className="is-hidden" aria-hidden="true">
      <svg className="badge-ring" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <path id="badge-circle" d="M 80,80 m -54,0 a 54,54 0 1,1 108,0 a 54,54 0 1,1 -108,0" />
        </defs>
        <text className="badge-text">
          <textPath href="#badge-circle" startOffset="0%">
            ROLE PARA VER AS NOTÍCIAS
          </textPath>
        </text>
      </svg>
      <div className="badge-arrow">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <line x1="9" y1="2" x2="9" y2="15" stroke="#F0EBE1" strokeWidth="1.2" strokeLinecap="round" />
          <polyline
            points="4,10 9,15 14,10"
            fill="none"
            stroke="#F0EBE1"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
