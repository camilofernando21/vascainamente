"use client";

import Link from "next/link";
import { reopenConsent } from "@/lib/consent";

// Footer links. "Privacidade" also reopens the cookie choice (when there are trackers to choose about).
export default function LegalLinks() {
  return (
    <ul className="vm-footer-legal">
      <li>
        <Link href="/quem-somos">Quem somos</Link>
      </li>
      <li>
        <Link href="/como-produzimos">Como produzimos</Link>
      </li>
      <li>
        <Link href="/correcoes">Correções</Link>
      </li>
      <li>
        <Link href="/privacidade" onClick={() => reopenConsent()}>
          Privacidade
        </Link>
      </li>
      <li>
        <Link href="/termos">Termos</Link>
      </li>
    </ul>
  );
}
