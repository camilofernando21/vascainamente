import type { Post } from "@/lib/posts";
import { CATEGORY_LABELS } from "@/lib/categories";
import { timeAgoWords, timeAgoCompact, formatDateFull } from "@/lib/time";

// Plain, serializable shape handed to the home's client sections.
// Relative times are computed on the server so the client never re-renders them differently.
export interface HomeItem {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  urgent: boolean;
  source: string;
  sourceShort: string;
  imageUrl: string;
  date: string;
  ago: string;
  agoCompact: string;
  dateFull: string;
  hasVideo: boolean;
}

const SOURCE_SHORT: Record<string, string> = {
  "ge.globo": "GE",
  ge: "GE",
  "uol esporte": "UOL",
  uol: "UOL",
  espn: "ESPN",
  lance: "LN",
  "lance!": "LN",
  "gazeta esportiva": "GZ",
  trivela: "TRV",
};

export function sourceShort(source: string): string {
  const known = SOURCE_SHORT[source.trim().toLowerCase()];
  if (known) return known;
  const initials = source
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return initials.slice(0, 3) || "VM";
}

export function toHomeItem(post: Post): HomeItem {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: CATEGORY_LABELS[post.category] ?? post.category.toUpperCase(),
    urgent: post.category === "urgente",
    source: post.source,
    sourceShort: sourceShort(post.source),
    imageUrl: post.imageUrl,
    date: post.date,
    ago: timeAgoWords(post.date),
    agoCompact: timeAgoCompact(post.date),
    dateFull: formatDateFull(post.date),
    hasVideo: !!post.videoId,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Cards section: only the last 24h; with fewer than 3, fall back to the most recent ones.
export function pickTodayPosts(posts: Post[], max = 9): { items: Post[]; isToday: boolean } {
  const now = Date.now();
  const today = posts.filter((p) => now - new Date(p.date).getTime() <= DAY_MS);
  if (today.length >= 3) return { items: today.slice(0, max), isToday: true };
  return { items: posts.slice(0, max), isToday: false };
}

// "A notícia do dia": the most important news of the last 30 hours, not simply the latest one.
// Older articles have no importance score, so they get one from what they are about.
function importanceOf(post: Post): number {
  if (post.importance) return post.importance;
  if (post.category === "urgente") return 5;
  const title = post.title.toLowerCase();
  // "contra o Vasco" / "Boca x Vasco": the news is about the rival, not about Vasco
  const aboutVasco = title.includes("vasco") && !/contra o vasco|\bx vasco/.test(title);
  const official = /\b(oficializa|oficial|anuncia|confirma|contrata|libera)\b/.test(title);
  if (post.category === "resultado" && /\b(vence|venceu|bate|goleia|vira|empata|perde|perdeu)\b|\d+ a \d+/.test(title))
    return aboutVasco ? 3.5 : 2;
  if (!aboutVasco) return 1.5;
  return (post.category === "transferencia" ? 3 : 2.5) + (official ? 1 : 0);
}

// calendar day in Brasília, so "today" turns at midnight for the fan, not at midnight UTC
const spDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export function pickFeaturedPost(posts: Post[]): Post | null {
  const now = Date.now();
  const today = spDay(new Date(now));
  // the news of the day is always from today: the best of today's news, even a modest one.
  // Only when nothing came out yet today (early morning) does yesterday's story hold the spot.
  const ofToday = posts.filter((p) => spDay(new Date(p.date)) === today);
  const recent = posts.filter((p) => now - new Date(p.date).getTime() <= 30 * 60 * 60 * 1000);
  const pool = ofToday.length ? ofToday : recent.length ? recent : posts.slice(0, 10);
  return bestOf(pool, now);
}

// "Ontem em destaque": the most important story of the previous calendar day (Brasília),
// never the one already shown as the news of the day.
export function pickYesterdayPost(posts: Post[], excludeSlug?: string): Post | null {
  const now = Date.now();
  const yesterday = spDay(new Date(now - DAY_MS));
  const pool = posts.filter((p) => spDay(new Date(p.date)) === yesterday && p.slug !== excludeSlug);
  return bestOf(pool, now);
}

function bestOf(pool: Post[], now: number): Post | null {
  let best: Post | null = null;
  let bestScore = -Infinity;
  for (const p of pool) {
    // a photo makes the section; the newest wins a tie (pool is sorted newest first)
    // and fresher news weighs a little more
    const hoursAgo = (now - new Date(p.date).getTime()) / 3_600_000;
    const score = importanceOf(p) + (p.imageUrl ? 0.3 : 0) - hoursAgo / 24;
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return best;
}
