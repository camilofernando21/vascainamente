"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CruzMalta } from "@/components/ui/cruz-malta";

// Opening of the home, shown once per session: the three milestones (1898, 1974, 1998) and the cross,
// paced to be read (about 4 s), with a button to skip it. Reduced-motion visitors never see it.
const STEPS: { label: string; num?: string }[] = [
  { label: "Fundação", num: "1898" },
  { label: "Brasileiro", num: "1974" },
  { label: "Libertadores", num: "1998" },
  { label: "Vascainamente" },
];

const SWAP_MS = 200; // the label fades out, then the next one comes in
const STEP_MS = 850; // each milestone
const HOLD_MS = 450; // the cross stays a moment before the fade
const FADE_MS = 600; // same as the CSS transition of #vm-loader

const STORAGE_KEY = "vm-loader-seen";

function shouldSkip(): boolean {
  if (document.documentElement.classList.contains("vm-loader-off")) return true;
  try {
    if (sessionStorage.getItem(STORAGE_KEY)) return true;
  } catch {}
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// layout effect on the client (runs before paint), plain effect on the server (where it never runs)
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function Loader() {
  const [active, setActive] = useState(true);
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);
  const stopTimers = useRef<() => void>(() => {});

  useBeforePaint(() => {
    // The inline script at the top of <body> normally flags repeat visits / reduced motion before paint.
    // Some pages (the dynamic 404) are rendered only on the client, so check here too, still before paint.
    if (shouldSkip()) {
      setActive(false);
      return;
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {}

    const timers: ReturnType<typeof setTimeout>[] = [];
    const show = (i: number) => {
      setVisible(false);
      timers.push(
        setTimeout(() => {
          setStep(i);
          setVisible(true);
        }, SWAP_MS)
      );
    };

    show(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i >= STEPS.length) {
        clearInterval(interval);
        timers.push(setTimeout(() => setDone(true), HOLD_MS));
        timers.push(setTimeout(() => setActive(false), HOLD_MS + FADE_MS));
      } else {
        show(i);
      }
    }, STEP_MS);

    stopTimers.current = () => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
    };
    return stopTimers.current;
  }, []);

  const skip = () => {
    stopTimers.current();
    setDone(true);
    window.setTimeout(() => setActive(false), FADE_MS);
  };

  useEffect(() => {
    if (!active || done) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && skip();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, done]);

  if (!active) return null;

  const current = STEPS[step];
  return (
    <div id="vm-loader" className={done ? "done" : undefined}>
      <div aria-hidden="true" className="vm-loader-stage">
        <p id="vm-loader-label" className={visible ? "visible" : undefined}>
          {current.label}
        </p>
        <div id="vm-loader-number" style={{ opacity: visible ? 1 : 0 }}>
          {current.num ?? <CruzMalta size="1em" className="vm-loader-cross" />}
        </div>
      </div>
      <button type="button" className="vm-loader-skip" onClick={skip}>
        Pular
      </button>
    </div>
  );
}

// Runs in <head> before first paint so returning visitors never see a flash of the loader.
export const LOADER_HEAD_SCRIPT = `try{if(sessionStorage.getItem('${STORAGE_KEY}')||matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('vm-loader-off')}catch(e){}`;
