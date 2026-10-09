import { getPostBySlug } from "@/lib/posts";
import { CATEGORY_NAMES } from "@/lib/categories";
import { formatDateShort } from "@/lib/time";
import { articleImage } from "@/lib/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Vascainamente";

export default async function Image({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  return articleImage(
    post
      ? {
          title: post.title,
          category: CATEGORY_NAMES[post.category],
          date: formatDateShort(post.date),
          urgent: post.category === "urgente",
        }
      : { title: "Vascainamente", category: "Notícias do Vasco" },
    size.width,
    size.height
  );
}
