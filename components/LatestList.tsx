import Link from "next/link";
import { VariableFontCursorProximity } from "@/components/ui/variable-font-cursor-proximity";
import type { Post } from "@/lib/posts";
import { CATEGORY_LABELS } from "@/lib/categories";
import { timeAgoCompact } from "@/lib/time";

export default function LatestList({ posts }: { posts: Post[] }) {
  return (
    <section className="px-6 py-6">
      <VariableFontCursorProximity
        radius={80}
        fromFontVariationSettings="'wght' 400"
        toFontVariationSettings="'wght' 800"
        className="mb-4 block text-[10px] tracking-[2px] text-text-muted"
      >
        ÚLTIMAS
      </VariableFontCursorProximity>

      <ol>
        {posts.map((post, i) => (
          <li key={post.slug} className="border-b border-border last:border-b-0">
            <Link
              href={`/${post.slug}`}
              className="grid grid-cols-[26px_1fr_auto_38px] items-baseline gap-x-[10px] py-3 hover:opacity-65"
            >
              <span className="text-[11px] font-medium text-text-muted">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[14px] font-medium leading-[1.35] text-text-primary">
                {post.title}
              </span>
              <span className="whitespace-nowrap text-right text-[11px] tracking-[2px] text-text-label">
                {CATEGORY_LABELS[post.category]}
              </span>
              <span className="whitespace-nowrap text-[11px] text-text-muted">
                {timeAgoCompact(post.date)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
