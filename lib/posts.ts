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
