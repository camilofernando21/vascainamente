"use client";

import { reopenConsent } from "@/lib/consent";

export default function ReopenConsentButton() {
  return (
    <button type="button" className="vm-button" onClick={() => reopenConsent()}>
      Alterar minha escolha de cookies
    </button>
  );
}
