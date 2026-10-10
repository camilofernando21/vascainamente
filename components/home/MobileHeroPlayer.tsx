"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { PLAYER_IMAGES } from "@/lib/players";

const SIZES = "70vw"; // phone only: served resized (WebP/AVIF) instead of the 900px PNGs

// Phone version of the hero players (the desktop HeroPlayerImage stays as it is): one photo at a time,
// bottom right, behind the logo and the menu, faded into the background so text stays readable.
// Same glitch on each swap; with prefers-reduced-motion the swap is a plain change.
export default function MobileHeroPlayer({ intervalMs = 6000 }: { intervalMs?: number }) {
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    // mounted only on phones, so desktops never download these images
    const phone = window.matchMedia("(max-width: 767px)");
    setIsPhone(phone.matches);
    const onChange = () => setIsPhone(phone.matches);
    phone.addEventListener("change", onChange);
    return () => phone.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!isPhone) return;
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const id = setInterval(() => setIndex((i) => (i + 1) % PLAYER_IMAGES.length), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, isPhone]);

  if (!isPhone) return null;

  const src = PLAYER_IMAGES[index];
  const next = PLAYER_IMAGES[(index + 1) % PLAYER_IMAGES.length];

  return (
    <div className="vm-mhero-player" aria-hidden="true">
      <Image
        key={src}
        src={src}
        alt=""
        fill
        sizes={SIZES}
        priority={index === 0}
        loading={index === 0 ? "eager" : "lazy"}
        className={reduced ? "vm-mhero-img" : "vm-mhero-img glitch-in"}
      />
      {!reduced && (
        <>
          <span key={`r-${src}`} className="vm-mhero-layer glitch-layer-red active">
            <Image src={src} alt="" fill sizes={SIZES} className="vm-mhero-img" />
          </span>
          <span key={`b-${src}`} className="vm-mhero-layer glitch-layer-blue active">
            <Image src={src} alt="" fill sizes={SIZES} className="vm-mhero-img" />
          </span>
        </>
      )}
      {/* preload the next photo so the swap never waits on the network */}
      <Image key={`next-${next}`} src={next} alt="" fill sizes={SIZES} loading="eager" className="vm-mhero-preload" />
    </div>
  );
}
