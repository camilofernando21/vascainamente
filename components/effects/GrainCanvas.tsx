"use client";

import { useEffect, useRef } from "react";

// Ported from Bam83's grain loop (requestAnimationFrame), drawn at half resolution and stretched by CSS.
export default function GrainCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let image: ImageData | null = null;
    let pixels: Uint32Array | null = null;

    function resize() {
      canvas!.width = Math.ceil(window.innerWidth / 2);
      canvas!.height = Math.ceil(window.innerHeight / 2);
      image = ctx!.createImageData(canvas!.width, canvas!.height);
      pixels = new Uint32Array(image.data.buffer);
    }

    function drawGrain() {
      if (!image || !pixels) return;
      for (let i = 0; i < pixels.length; i++) {
        const v = (Math.random() * 255) | 0;
        pixels[i] = 0xff000000 | (v << 16) | (v << 8) | v;
      }
      ctx!.putImageData(image, 0, 0);
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    function loop() {
      drawGrain();
      raf = requestAnimationFrame(loop);
    }

    function onResize() {
      resize();
      if (reduced) drawGrain();
    }

    resize();
    if (reduced) drawGrain();
    else loop();
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas id="grain-canvas" ref={ref} aria-hidden="true" />;
}
