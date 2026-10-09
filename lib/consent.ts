// Cookie consent, stored in the browser. "rejected" means no analytics or ads script is loaded.
export type Consent = "accepted" | "rejected";

const KEY = "vm-consent";
export const CONSENT_CHANGED = "vm-consent-changed";
export const CONSENT_REOPEN = "vm-consent-reopen";

export function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch {
    return null;
  }
}

export function saveConsent(value: Consent) {
  try {
    localStorage.setItem(KEY, value);
  } catch {}
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED, { detail: value }));
}

/** Shows the banner again (footer "Privacidade" link, privacy page button). */
export function reopenConsent() {
  window.dispatchEvent(new Event(CONSENT_REOPEN));
}
