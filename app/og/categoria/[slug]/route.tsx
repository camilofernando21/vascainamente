import { notFound } from "next/navigation";
import { CATEGORY_NAMES, isCategory } from "@/lib/categories";
import { getPostsByCategory } from "@/lib/posts";
import { categoryImage } from "@/lib/og";

export const runtime = "nodejs";

// Preview image for a category page (linked from that page's metadata).
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  if (!isCategory(params.slug)) notFound();
  return categoryImage(CATEGORY_NAMES[params.slug], getPostsByCategory(params.slug).length, 1200, 630);
}
