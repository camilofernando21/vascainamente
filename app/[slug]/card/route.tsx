import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/posts";
import { CATEGORY_NAMES } from "@/lib/categories";
import { formatDateShort } from "@/lib/time";
import { articleImage } from "@/lib/og";

export const runtime = "nodejs";

// Instagram card (1080x1350) for @_vascainamente_. Not linked anywhere on the site, and kept out of search.
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();
  const image = await articleImage(
    {
      title: post.title,
      category: CATEGORY_NAMES[post.category],
      date: formatDateShort(post.date),
      urgent: post.category === "urgente",
    },
    1080,
    1350
  );
  image.headers.set("Content-Disposition", `inline; filename="vascainamente-${post.slug}.jpg"`);
  image.headers.set("X-Robots-Tag", "noindex");
  return image;
}
