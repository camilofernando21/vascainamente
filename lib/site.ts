// Public address of the site (canonical URLs, share links, sitemap). Override with NEXT_PUBLIC_SITE_URL
// when a custom domain is connected.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://vascainamente.vercel.app").replace(/\/$/, "");

export const SITE_NAME = "Vascainamente";

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export const SITE_DESCRIPTION =
  "Portal de notícias 100% dedicado ao Club de Regatas Vasco da Gama. Transferências, resultados, elenco e tudo sobre o Gigante da Colina.";

// Next merges metadata shallowly: a page that sets openGraph replaces the layout's whole object,
// so every page spreads these shared fields into its own.
export const OG_DEFAULTS = {
  siteName: SITE_NAME,
  locale: "pt_BR",
} as const;
