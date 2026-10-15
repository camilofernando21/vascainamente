"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Invitation to install the site as an app, for phones only.
// - Android (Chrome, Samsung Internet, Edge): uses the browser's own install dialog, one tap.
// - iPhone: Safari never offers it by itself, so a short guide shows the three steps.
// It waits until the reader has spent a little time and scrolled, never covers the cookie banner,
// stays away from in-app browsers (Instagram, Facebook, X...) where installing is impossible,
// and after a "now not" stays quiet for two weeks.

const KEY = "vm-install";
const QUIET_DAYS = 14;
const MIN_SECONDS = 20;
const MIN_SCROLL = 500;

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Mode = "android" | "ios";

const read = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const write = (value: string) => {
  try {
    localStorage.setItem(KEY, value);
  } catch {}
};

const isQuiet = () => {
  const v = read();
  if (!v) return false;
  if (v === "installed") return true;
  const at = Number(v);
  return Number.isFinite(at) && Date.now() - at < QUIET_DAYS * 86_400_000;
};

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

const isInAppBrowser = (ua: string) => /Instagram|FBAN|FBAV|FB_IAB|Twitter|TikTok|musical_ly|Line\/|; wv\)/i.test(ua);

const isIos = (ua: string) =>
  /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function ShareIcon() {
  return (
    <svg className="vm-install-share" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M12 15V3m0 0L8 7m4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function InstallPrompt() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [visible, setVisible] = useState(false);
  const [guide, setGuide] = useState(false);
  const eventRef = useRef<InstallEvent | null>(null);
  const shownRef = useRef(false);
  const guideBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const phone = window.matchMedia("(max-width: 900px)").matches && window.matchMedia("(pointer: coarse)").matches;
    if (!phone || isStandalone() || isQuiet() || isInAppBrowser(ua)) return;

    let detected: Mode | null = isIos(ua) ? "ios" : null;
    if (detected) setMode(detected);

    const onBefore = (e: Event) => {
      e.preventDefault();
      eventRef.current = e as InstallEvent;
      detected = "android";
      setMode("android");
    };
    const onInstalled = () => {
      write("installed");
      setVisible(false);
      setGuide(false);
    };
    window.addEventListener("beforeinstallprompt", onBefore);
    window.addEventListener("appinstalled", onInstalled);

    const started = Date.now();
    // waits for time on the page, some scrolling and for the cookie banner to be answered
    const check = () => {
      if (shownRef.current || !detected) return;
      const waited = (Date.now() - started) / 1000 >= MIN_SECONDS;
      const scrolled = window.scrollY >= MIN_SCROLL;
      const cookieOpen = !!document.querySelector(".vm-consent");
      if (waited && scrolled && !cookieOpen) {
        shownRef.current = true;
        setVisible(true);
      }
    };
    const timer = window.setInterval(check, 2000);
    window.addEventListener("scroll", check, { passive: true });

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("scroll", check);
      window.removeEventListener("beforeinstallprompt", onBefore);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const close = useCallback(() => {
    write(String(Date.now()));
    setVisible(false);
    setGuide(false);
  }, []);

  const install = async () => {
    if (mode === "ios") {
      setGuide(true);
      return;
    }
    const ev = eventRef.current;
    if (!ev) return;
    try {
      await ev.prompt();
      const choice = await ev.userChoice;
      if (choice.outcome === "accepted") write("installed");
      else write(String(Date.now()));
    } catch {
      write(String(Date.now()));
    }
    eventRef.current = null;
    setVisible(false);
  };

  useEffect(() => {
    if (!guide) return;
    guideBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGuide(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [guide]);

  if (!mode || !visible) return null;

  return (
    <>
      <aside className="vm-install" aria-label="Instalar o Vascainamente no celular">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="vm-install-icon" src="/icons/icon-192.png" alt="" width={44} height={44} />
        <div className="vm-install-body">
          <p className="vm-install-title">Instale o Vascainamente</p>
          <p className="vm-install-text">Fica na tela inicial e abre em tela cheia, direto nas notícias.</p>
        </div>
        <div className="vm-install-actions">
          <button type="button" className="vm-install-main" onClick={install}>
            {mode === "ios" ? "Como instalar" : "Instalar"}
          </button>
          <button type="button" className="vm-install-later" onClick={close}>
            Agora não
          </button>
        </div>
      </aside>

      {guide && (
        <div className="vm-install-sheet-wrap" onClick={() => setGuide(false)}>
          <div
            className="vm-install-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vm-install-sheet-title"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="vm-install-sheet-title" className="vm-install-sheet-title">
              Instalar no iPhone
            </p>
            <ol className="vm-install-steps">
              <li>
                <span className="vm-install-n">1</span>
                <span>
                  Toque no botão de compartilhar <ShareIcon />, o quadrado com a seta para cima, na barra do navegador.
                </span>
              </li>
              <li>
                <span className="vm-install-n">2</span>
                <span>Role a lista e toque em &ldquo;Adicionar à Tela de Início&rdquo;.</span>
              </li>
              <li>
                <span className="vm-install-n">3</span>
                <span>Toque em &ldquo;Adicionar&rdquo;. O escudo aparece na sua tela inicial.</span>
              </li>
            </ol>
            <button ref={guideBtnRef} type="button" className="vm-install-main vm-install-ok" onClick={close}>
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
