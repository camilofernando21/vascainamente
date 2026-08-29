import Link from "next/link";
import type { Post } from "@/lib/posts";
import HeroPlayerImage from "@/components/HeroPlayerImage";

export default function HeroSection({ post }: { post: Post }) {
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

      {/* founding-year stat, bottom-left — opposite side from the fan photo */}
      <div className="absolute bottom-6 left-6 z-10 hidden text-left md:block lg:left-12">
        <div className="font-serif text-[clamp(24px,3.2vw,40px)] font-normal leading-none text-text-hero">
          1898
        </div>
        <p className="mt-2 text-[9px] uppercase leading-[1.4] tracking-[1.8px] text-text-muted">
          Fundado em · São Cristóvão
        </p>
      </div>

      {/* fan photo, bottom-right */}
      <HeroPlayerImage
        intervalMs={6000}
        className="animate-float pointer-events-none absolute bottom-0 right-6 z-[1] hidden h-[92%] w-[340px] md:block lg:right-12 lg:w-[420px]"
      />
    </Link>
  );
}
