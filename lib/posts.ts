import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const postsDirectory = path.join(process.cwd(), "content/noticias");

export type Category =
  | "transferencia"
  | "resultado"
  | "elenco"
  | "base"
  | "feminino"
  | "urgente"
  | "clube"
  | "historico";

export interface PostMeta {
  title: string;
  slug: string;
  date: string;
  category: Category;
  source: string;
  sourceUrl: string;
  imageUrl: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  competition?: string;
  homeTeam?: string;
  awayTeam?: string;
  homeScore?: number;
  awayScore?: number;
  venue?: string;
  // YouTube video picked by the news robot (official channel only)
  videoId?: string;
  videoSource?: string;
  // set by the news robot when a later source added important information to this article
  updated?: string;
  // 1 to 5, how much the news matters to the fan (set by the news robot)
  importance?: number;
  // "escalacao", "gol" or "resultado" when the article is about a match event (set by the news robot)
  matchEvent?: string;
  // the official lineup, only on lineup articles taken from the Vasco's official X profile
  lineup?: Lineup;
}

export interface Lineup {
  formation: string | null;
  starters: string[];
  bench: string[];
  coach: string | null;
}

// the robot writes it as one JSON line; anything that is not exactly 11 names is ignored
function parseLineup(raw: unknown): Lineup | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const names = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : []);
  const starters = names(r.starters);
  if (starters.length !== 11) return undefined;
  return {
    formation: typeof r.formation === "string" ? r.formation : null,
    starters,
    bench: names(r.bench),
    coach: typeof r.coach === "string" ? r.coach : null,
  };
}

export interface Post extends PostMeta {
  content: string;
}

function readSlugs(): string[] {
  if (!fs.existsSync(postsDirectory)) return [];
  return fs
    .readdirSync(postsDirectory)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

function readPostFile(slug: string): Post {
  const fullPath = path.join(postsDirectory, `${slug}.md`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    title: data.title ?? "",
    slug: data.slug ?? slug,
    date: data.date ?? new Date().toISOString(),
    category: (data.category ?? "clube") as Category,
    source: data.source ?? "",
    sourceUrl: data.sourceUrl ?? "",
    imageUrl: data.imageUrl ?? "",
    excerpt: data.excerpt ?? "",
    seoTitle: data.seoTitle ?? data.title ?? "",
    seoDescription: data.seoDescription ?? data.excerpt ?? "",
    competition: data.competition,
    homeTeam: data.homeTeam,
    awayTeam: data.awayTeam,
    homeScore: data.homeScore,
    awayScore: data.awayScore,
    venue: data.venue,
    videoId: typeof data.videoId === "string" && data.videoId ? data.videoId : undefined,
    videoSource: typeof data.videoSource === "string" && data.videoSource ? data.videoSource : undefined,
    updated: typeof data.updated === "string" && data.updated ? data.updated : undefined,
    importance: typeof data.importance === "number" ? data.importance : undefined,
    matchEvent: typeof data.matchEvent === "string" && data.matchEvent ? data.matchEvent : undefined,
    lineup: parseLineup(data.lineup),
    content,
  };
}

export function getAllPosts(): Post[] {
  return readSlugs()
    .map(readPostFile)
    .sort((a, b) => (new Date(a.date) < new Date(b.date) ? 1 : -1));
}

export function getPostBySlug(slug: string): Post | null {
  const slugs = readSlugs();
  if (!slugs.includes(slug)) return null;
  return readPostFile(slug);
}

export function getPostsByCategory(category: Category | "todos"): Post[] {
  const all = getAllPosts();
  if (category === "todos") return all;
  return all.filter((p) => p.category === category);
}

export function getLatestPosts(n: number): Post[] {
  return getAllPosts().slice(0, n);
}

export function getFeaturedPost(): Post | null {
  const all = getAllPosts();
  return all[0] ?? null;
}

export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await remark().use(html).process(markdown);
  return result.toString();
}
