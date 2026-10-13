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

// Link-preview image for pages without their own (the site card at app/opengraph-image.tsx).
export const OG_IMAGE_DEFAULT = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Vascainamente, notícias do Vasco da Gama",
} as const;

// Who publishes the site. The CNPJ is shown only on /privacidade and /termos (not in the footer or schema).
export const PUBLISHER = {
  legalName: "Camilo Fernando Bomfim & Cia Ltda",
  name: "CatetoaoCubo",
  cnpj: "68.436.917/0001-77",
  url: "https://catetoaocubo.com.br",
  email: "contato@catetoaocubo.com.br",
} as const;

// Contact for LGPD and content removal requests (shown on /privacidade and /termos).
export const CONTACT_EMAIL = "contato@vascainamente.com.br";

// Signature of every article, and the person in charge of the editorial side (shown on /quem-somos).
export const BYLINE = "Redação Vascainamente";
export const EDITOR = "Camilo Fernando Bomfim";

// Official social profiles (also listed as "sameAs" in the Organization schema).
export const INSTAGRAM = {
  url: "https://www.instagram.com/_vascainamente_/",
  handle: "@_vascainamente_",
} as const;

export const FACEBOOK = {
  url: "https://www.facebook.com/profile.php?id=61594983706485",
  nome: "Vascainamente",
} as const;

export const X_PROFILE = {
  url: "https://x.com/Vascainamente",
  handle: "@Vascainamente",
} as const;
