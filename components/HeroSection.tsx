import Link from "next/link";
import type { Post } from "@/lib/posts";
import { CATEGORY_LABELS } from "@/lib/categories";
import { timeAgoWords } from "@/lib/time";
import { CruzMalta } from "@/components/ui/cruz-malta";
import { DiagonalStripes } from "@/components/ui/diagonal-stripes";

export default function HeroSection({ post }: { post: Post }) {
  const isUrgent = post.category === "urgente";

  return (
    <Link href={`/${post.slug}`} className="block hover:opacity-70">
      <div className="relative h-[200px] w-full overflow-hidden bg-bg">
        <DiagonalStripes className="absolute inset-0" />
        <div className="absolute inset-0 flex items-center justify-center">
          <CruzMalta size={120} color="#FFFFFF" opacity={0.05} />
        </div>
      </div>
      <div className="px-6 py-5">
        <p className="mb-3 text-[11px] tracking-[2px] text-text-label">
          <span className={isUrgent ? "text-red" : ""}>
            {CATEGORY_LABELS[post.category]}
          </span>
        </p>
        <h1 className="text-[38px] font-semibold leading-[1.15] tracking-[-0.5px] text-text-hero">
          {post.title}
        </h1>
        <p className="mt-3 text-[11px] text-text-meta">
          {post.source} · {timeAgoWords(post.date)}
        </p>
      </div>
    </Link>
  );
}
