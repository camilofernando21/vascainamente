import Link from "next/link";
import type { Post } from "@/lib/posts";
import { CATEGORY_LABELS } from "@/lib/categories";
import { timeAgoWords } from "@/lib/time";
import { CruzMalta } from "@/components/ui/cruz-malta";
import { DiagonalStripes } from "@/components/ui/diagonal-stripes";

export default function HeroSection({ post }: { post: Post }) {
  const isUrgent = post.category === "urgente";

  return (
    <Link
      href={`/${post.slug}`}
      className="relative block min-h-[420px] w-full overflow-hidden bg-bg hover:opacity-95 md:min-h-[520px]"
    >
      <DiagonalStripes className="absolute inset-0" />
      <div className="absolute inset-0 flex items-center justify-center">
        <CruzMalta size={160} color="rgb(240,235,225)" opacity={0.04} />
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/jogador-vasco.png"
        alt=""
        className="pointer-events-none absolute bottom-0 right-6 hidden h-[92%] w-auto object-contain object-bottom md:block lg:right-12"
      />

      <div className="relative z-10 flex h-full flex-col justify-end gap-3 px-6 py-8 md:max-w-[58%] md:py-12">
        <p className="text-[11px] uppercase tracking-[2.8px] text-text-label">
          <span className={isUrgent ? "text-red" : ""}>
            {CATEGORY_LABELS[post.category]}
          </span>
        </p>
        <h1 className="text-[clamp(40px,7vw,72px)] font-normal leading-[1.15] tracking-[-1px] text-text-hero">
          {post.title}
        </h1>
        <p className="text-[12px] text-text-meta">
          {post.source} · {timeAgoWords(post.date)}
        </p>
      </div>
    </Link>
  );
}
