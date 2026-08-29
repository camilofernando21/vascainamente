import Link from "next/link";
import type { Post } from "@/lib/posts";
import { CATEGORY_LABELS } from "@/lib/categories";
import { timeAgoWords } from "@/lib/time";
import HeroPlayerImage from "@/components/HeroPlayerImage";

export default function HeroSection({ post }: { post: Post }) {
  const isUrgent = post.category === "urgente";

  return (
    <Link
      href={`/${post.slug}`}
      className="relative block min-h-[420px] w-full overflow-hidden bg-bg hover:opacity-95 md:min-h-[520px]"
    >
      {/* giant background number, split 18/98, concentrated behind the fan photos like Bam83's giant score watermark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-0 flex w-[65%] flex-col items-center justify-center text-center font-serif leading-[0.8] text-text-hero opacity-[0.06]"
      >
        <span className="text-[26vw]">18</span>
        <span className="text-[26vw]">98</span>
      </div>

      {/* fan photo + founding-year stat, bottom-aligned side by side on the right */}
      <div className="pointer-events-none absolute inset-y-0 right-6 z-[1] hidden items-end gap-3 md:flex lg:right-12 lg:gap-4">
        <div className="mb-6 max-w-[110px] text-left">
          <div className="font-serif text-[clamp(24px,3.2vw,40px)] font-normal leading-none text-text-hero">
            1898
          </div>
          <p className="mt-2 text-[9px] uppercase leading-[1.4] tracking-[1.8px] text-text-muted">
            Fundado em · São Cristóvão
          </p>
        </div>
        <HeroPlayerImage
          intervalMs={6000}
          className="animate-float h-[92%] w-[340px] lg:w-[420px]"
        />
      </div>

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
