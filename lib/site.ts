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

// Who publishes the site. The CNPJ is shown only on /privacidade and /termos (not in the footer or schema).
export const PUBLISHER = {
  legalName: "Camilo Fernando Bomfim & Cia Ltda",
  name: "CatetoaoCubo",
  cnpj: "68.436.917/0001-77",
  url: "https://catetoaocubo.com.br",
  email: "contato@catetoaocubo.com.br",
} as const;

// Contact for LGPD and content removal requests. Switch back to "contato@vascainamente.com.br"
// once the domain's e-mail exists.
export const CONTACT_EMAIL = PUBLISHER.email;
