"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ACTIVE_TRACKERS, CLARITY_ID, GA_ID, META_PIXEL_ID, listPt } from "@/lib/trackers";
import { CONSENT_REOPEN, readConsent, saveConsent, type Consent } from "@/lib/consent";

// Cookie banner + analytics loader. Nothing here runs unless at least one tracking ID is configured,
// and no script is loaded before the visitor accepts.
export default function ConsentManager() {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const loadedRef = useRef(false);
  const pathname = usePathname();

  const hasTrackers = ACTIVE_TRACKERS.length > 0;

  useEffect(() => {
    setMounted(true);
    if (!hasTrackers) return;
    const stored = readConsent();
    setConsent(stored);
    setOpen(stored === null);

    const onReopen = () => setOpen(true);
    window.addEventListener(CONSENT_REOPEN, onReopen);
    return () => window.removeEventListener(CONSENT_REOPEN, onReopen);
  }, [hasTrackers]);

  // Meta Pixel: one PageView per client-side navigation (GA4 tracks history changes on its own)
  useEffect(() => {
    if (consent !== "accepted" || !META_PIXEL_ID || !loadedRef.current) return;
    const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
    fbq?.("track", "PageView");
  }, [pathname, consent]);

  useEffect(() => {
    if (consent === "accepted") loadedRef.current = true;
  }, [consent]);

  if (!mounted || !hasTrackers) return null;

  const choose = (value: Consent) => {
    const wasAccepted = consent === "accepted";
    saveConsent(value);
    setConsent(value);
    setOpen(false);
    // scripts already running can't be unloaded: a reload is the only clean way to stop them
    if (value === "rejected" && wasAccepted) window.location.reload();
  };

  return (
    <>
      {consent === "accepted" && GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="vm-ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}');`}
          </Script>
        </>
      )}
      {consent === "accepted" && CLARITY_ID && (
        <Script id="vm-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`}
        </Script>
      )}
      {consent === "accepted" && META_PIXEL_ID && (
        <Script id="vm-meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
        </Script>
      )}

      {open && (
        <div className="vm-consent" role="dialog" aria-live="polite" aria-label="Cookies">
          <p className="vm-consent-text">
            Usamos cookies de {META_PIXEL_ID ? "estatística e de anúncios" : "estatística"} ({listPt(ACTIVE_TRACKERS)})
            só se você aceitar. Recusar não muda nada
            no site. <Link href="/privacidade">Privacidade</Link>
          </p>
          <div className="vm-consent-actions">
            <button type="button" className="vm-consent-btn" onClick={() => choose("rejected")}>
              Recusar
            </button>
            <button type="button" className="vm-consent-btn" onClick={() => choose("accepted")}>
              Aceitar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
