"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

// WhatsApp first: it's where Vasco news actually gets passed around.
export default function ShareLinks({
  url,
  title,
  variant,
}: {
  url: string;
  title: string;
  variant: "inline" | "rail";
}) {
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  // rail: visible only while the article text crosses the middle band of the screen
  useEffect(() => {
    if (variant !== "rail") return;
    const body = document.querySelector(".vm-article-body");
    if (!body) return;
    const io = new IntersectionObserver((entries) => setShown(entries[0]?.isIntersecting ?? false), {
      rootMargin: "-35% 0px -35% 0px",
    });
    io.observe(body);
    return () => io.disconnect();
  }, [variant]);

  const share = (method: "whatsapp" | "copiar_link" | "x") =>
    track("share", { method, content_type: "article", item_id: url, placement: variant });

  const copy = async () => {
    share("copiar_link");
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // older browsers / insecure contexts
      const input = document.createElement("textarea");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2200);
  };

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;
  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;

  return (
    <div className={cn("vm-share", `is-${variant}`, shown && "is-shown")}>
      {variant === "inline" && <p className="vm-label vm-share-title">Compartilhar</p>}
      <ul>
        <li>
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="vm-share-link"
            onClick={() => share("whatsapp")}
          >
            Enviar no WhatsApp
          </a>
        </li>
        <li>
          <button type="button" onClick={copy} className="vm-share-link">
            Copiar link
          </button>
        </li>
        <li>
          <a href={x} target="_blank" rel="noopener noreferrer" className="vm-share-link" onClick={() => share("x")}>
            X / Twitter
          </a>
        </li>
      </ul>
      <p className={cn("vm-share-toast", copied && "is-visible")} role="status" aria-live="polite">
        {copied ? "Link copiado" : ""}
      </p>
    </div>
  );
}
