import type { MetadataRoute } from "next";
import { getAllPosts, getPostsByCategory } from "@/lib/posts";
import { MAIN_CATEGORIES, OPTIONAL_CATEGORIES, categoryHref } from "@/lib/categories";
import { HISTORY_HREF } from "@/lib/categories";
import { getMatchRefs } from "@/lib/match";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

const DAY = 86400_000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = getAllPosts();
  // match pages: the games of the next and of the last 14 days (older ones stay open, out of the map)
  const now = Date.now();
  const matches = (await getMatchRefs()).filter((r) => {
    const t = new Date(r.match.iso).getTime();
    return t > now - 14 * DAY && t < now + 14 * DAY;
  });
  const latest = posts[0] ? new Date(posts[0].date) : new Date();
  const categories = [
    ...MAIN_CATEGORIES,
    ...OPTIONAL_CATEGORIES.filter((c) => getPostsByCategory(c).length > 0),
  ];

  return [
    { url: absoluteUrl("/"), lastModified: latest, changeFrequency: "hourly", priority: 1 },
    { url: absoluteUrl(HISTORY_HREF), lastModified: latest, changeFrequency: "daily", priority: 0.7 },
    { url: absoluteUrl("/chances"), lastModified: latest, changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/jogos"), lastModified: latest, changeFrequency: "hourly", priority: 0.8 },
    ...matches.map((r) => {
      const t = new Date(r.match.iso).getTime();
      const soon = r.match.state !== "post" && t - now < DAY;
      return {
        url: absoluteUrl(`/jogo/${r.slug}`),
        lastModified: r.match.state === "post" ? new Date(r.match.iso) : new Date(),
        changeFrequency: (soon || r.match.state === "in" ? "hourly" : r.match.state === "post" ? "weekly" : "daily") as "hourly" | "daily" | "weekly",
        priority: 0.7,
      };
    }),
    { url: absoluteUrl("/quem-somos"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/como-produzimos"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/correcoes"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/privacidade"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/termos"), changeFrequency: "yearly", priority: 0.2 },
    ...categories.map((c) => {
      const newest = getPostsByCategory(c)[0];
      return {
        url: absoluteUrl(categoryHref(c)),
        lastModified: newest ? new Date(newest.date) : latest,
        changeFrequency: "hourly" as const,
        priority: 0.6,
      };
    }),
    ...posts.map((p) => ({
      url: absoluteUrl(`/${p.slug}`),
      lastModified: new Date(p.date),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
