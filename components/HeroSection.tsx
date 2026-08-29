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
      {/* giant background number, split 18/98 like Bam83's giant score watermark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center text-center font-serif leading-[0.85] text-text-hero opacity-[0.05]"
      >
        <span className="text-[18vw]">18</span>
        <span className="text-[18vw]">98</span>
      </div>

      <HeroPlayerImage
        intervalMs={6000}
        className="animate-float pointer-events-none absolute bottom-0 right-6 z-[1] hidden h-[92%] w-[340px] md:block lg:right-12 lg:w-[420px]"
      />

      {/* smaller foreground number, same treatment as Bam83's stat number */}
      <div className="absolute right-6 top-6 z-10 hidden text-right md:block lg:right-12">
        <div className="font-serif text-[7vw] font-normal leading-none text-text-hero">1898</div>
        <p className="mt-2 text-[10px] uppercase tracking-[2.8px] text-text-muted">
          Fundado em · São Cristóvão
        </p>
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
