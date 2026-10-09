import type { MetadataRoute } from "next";
import { getAllPosts, getPostsByCategory } from "@/lib/posts";
import { MAIN_CATEGORIES, OPTIONAL_CATEGORIES, categoryHref } from "@/lib/categories";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const latest = posts[0] ? new Date(posts[0].date) : new Date();
  const categories = [
    ...MAIN_CATEGORIES,
    ...OPTIONAL_CATEGORIES.filter((c) => getPostsByCategory(c).length > 0),
  ];

  return [
    { url: absoluteUrl("/"), lastModified: latest, changeFrequency: "hourly", priority: 1 },
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
