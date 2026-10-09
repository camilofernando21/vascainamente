// Tracking IDs come only from environment variables (never written in the code). Without them nothing
// is loaded and no cookie banner is shown. Values are validated so they can be safely inlined in scripts.
const read = (value: string | undefined, pattern: RegExp) => {
  const v = (value ?? "").trim();
  return pattern.test(v) ? v : "";
};

export const GA_ID = read(process.env.NEXT_PUBLIC_GA_ID, /^G-[A-Z0-9]{4,20}$/i);
export const CLARITY_ID = read(process.env.NEXT_PUBLIC_CLARITY_ID, /^[a-z0-9]{6,20}$/i);
export const META_PIXEL_ID = read(process.env.NEXT_PUBLIC_META_PIXEL_ID, /^\d{6,20}$/);

/** Names of the tools that are actually configured (used in the banner and the privacy page). */
export const ACTIVE_TRACKERS = [
  GA_ID && "Google Analytics",
  CLARITY_ID && "Microsoft Clarity",
  META_PIXEL_ID && "pixel da Meta",
].filter(Boolean) as string[];

/** "A", "A e B", "A, B e C" */
export function listPt(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}
