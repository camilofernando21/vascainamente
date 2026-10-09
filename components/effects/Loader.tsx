"use client";

import { useEffect, useState } from "react";
import { CruzMalta } from "@/components/ui/cruz-malta";

// Ported from Bam83's #bam-loader: 1100ms per step, label fades in 0.3s, loader fades out in 0.8s.
const STEPS: { label: string; num?: string }[] = [
  { label: "Fundação", num: "1898" },
  { label: "Brasileiro", num: "1974" },
  { label: "Libertadores", num: "1998" },
  { label: "Vascainamente" },
];

const STORAGE_KEY = "vm-loader-seen";

export default function Loader() {
  const [active, setActive] = useState(true);
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // the inline script in <head> already flagged repeat visits / reduced motion before paint
    if (document.documentElement.classList.contains("vm-loader-off")) {
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
        }, 300)
      );
    };

    show(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i >= STEPS.length) {
        clearInterval(interval);
        timers.push(setTimeout(() => setDone(true), 900));
        timers.push(setTimeout(() => setActive(false), 900 + 800));
      } else {
        show(i);
      }
    }, 1100);

    return () => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
    };
  }, []);

  if (!active) return null;

  const current = STEPS[step];
  return (
    <div id="vm-loader" className={done ? "done" : undefined} aria-hidden="true">
      <p id="vm-loader-label" className={visible ? "visible" : undefined}>
        {current.label}
      </p>
      <div id="vm-loader-number" style={{ opacity: visible ? 1 : 0 }}>
        {current.num ?? <CruzMalta size="1em" className="vm-loader-cross" />}
      </div>
    </div>
  );
}

// Runs in <head> before first paint so returning visitors never see a flash of the loader.
export const LOADER_HEAD_SCRIPT = `try{if(sessionStorage.getItem('${STORAGE_KEY}')||matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('vm-loader-off')}catch(e){}`;
