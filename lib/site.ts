// Public address of the site (canonical URLs, share links, sitemap). Override with NEXT_PUBLIC_SITE_URL
// when a custom domain is connected.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://vascainamente.vercel.app").replace(/\/$/, "");

export const SITE_NAME = "Vascainamente";

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
