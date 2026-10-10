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
