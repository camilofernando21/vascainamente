import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

// Official Vasco TV embeds only: never download or self-host the videos.
export const YT_ORIGIN = "https://www.youtube-nocookie.com";

export function ytEmbedUrl(id: string, params: Record<string, string | number>): string {
  const query = new URLSearchParams(
    Object.entries({ ...params, enablejsapi: 1 }).map(([k, v]) => [k, String(v)])
  );
  return `${YT_ORIGIN}/embed/${id}?${query.toString()}`;
}

export function ytWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

// The IFrame API answers postMessage commands without loading the full JS API script.
export function ytCommand(iframe: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
}

// Commands sent before the player is ready are silently dropped, so we register as a
// listener on load and wait for the player's own "onReady"/"initialDelivery" message.
export function useYouTubeReady(iframeRef: RefObject<HTMLIFrameElement>, active: boolean) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) {
      setReady(false);
      return;
    }
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.event === "onReady" || data?.event === "initialDelivery") setReady(true);
      } catch {}
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [active, iframeRef]);

  const onLoad = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
      "*"
    );
  }, [iframeRef]);

  return { ready, onLoad };
}

// True once the element comes within one screen of the viewport (rootMargin 100%), and stays true.
// Never true with prefers-reduced-motion: no video is loaded at all in that case.
export function useNearViewport(ref: RefObject<HTMLElement>): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "100% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return near;
}

// Tracks whether the element is actually on screen (used to pause / resume playback).
export function useInViewport(ref: RefObject<HTMLElement>, enabled: boolean): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    // at least 1% visible: an edge touching the viewport (or a sub-pixel sliver) counts as off screen
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        setInView(!!entry && entry.isIntersecting && entry.intersectionRatio >= 0.01);
      },
      { threshold: [0, 0.01] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, enabled]);
  return inView;
}


// Only one section may have sound on at a time: unmuting broadcasts a claim, and every
// other player that hears it mutes itself.
const AUDIO_CLAIM = "vm-audio-claim";

export function claimAudio(owner: string) {
  window.dispatchEvent(new CustomEvent(AUDIO_CLAIM, { detail: owner }));
}

export function useAudioClaims(owner: string, onOtherClaim: () => void) {
  const callback = useRef(onOtherClaim);
  callback.current = onOtherClaim;
  useEffect(() => {
    const onClaim = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== owner) callback.current();
    };
    window.addEventListener(AUDIO_CLAIM, onClaim);
    return () => window.removeEventListener(AUDIO_CLAIM, onClaim);
  }, [owner]);
}
