import Link from "next/link";
import type { Post } from "@/lib/posts";
import HeroPlayerImage from "@/components/HeroPlayerImage";
import CrestShowcase from "@/components/CrestShowcase";

export default function HeroSection({ post }: { post: Post }) {
  return (
    <Link
      href={`/${post.slug}`}
      className="relative block min-h-screen w-full overflow-hidden bg-bg hover:opacity-95"
    >
      {/* site logo lockup, top-left — identifies the site regardless of what article is featured */}
      <div className="pointer-events-none absolute left-6 top-6 z-20 flex items-center gap-3 lg:left-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-vasco.png" alt="" className="h-9 w-auto lg:h-11" />
        <span className="text-[13px] uppercase tracking-[2.5px] text-text-hero lg:text-[15px]">
          Vascainamente
        </span>
      </div>

      {/* giant background number, split 18/98, concentrated behind the fan photos like Bam83's giant score watermark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-0 flex w-[65%] flex-col items-center justify-center text-center font-serif leading-[0.8] text-text-hero opacity-[0.06]"
      >
        <span className="text-[26vw]">18</span>
        <span className="text-[26vw]">98</span>
      </div>

      {/* historic crests, flipping in the empty space below the logo and above the menu */}
      <CrestShowcase
        intervalMs={5000}
        className="absolute left-[20%] top-[16%] z-10 hidden h-[190px] w-[190px] md:block lg:h-[230px] lg:w-[230px]"
      />

      {/* site tagline — one line ending near the right edge, above the fans' heads */}
      <p className="pointer-events-none absolute left-[36%] top-[15%] z-10 hidden whitespace-nowrap font-serif text-[4.2vw] italic leading-none text-text-hero md:block">
        <span className="text-red">&ldquo;</span>Vascaíno não se escolhe. Se nasce.
      </p>

      {/* fan photo + founding-year stat, side by side bottom-right — same composition as the Bam83 reference */}
      <div className="pointer-events-none absolute inset-y-0 right-6 z-[1] hidden items-end gap-6 md:flex lg:right-12">
        <HeroPlayerImage
          intervalMs={6000}
          className="animate-float h-[92%] w-[340px] lg:w-[420px]"
        />
        <div className="mb-[18vh] text-right">
          <div className="font-serif text-[clamp(24px,3.2vw,40px)] font-normal leading-none text-text-hero">
            1898
          </div>
          <p className="mt-2 text-[9px] uppercase leading-[1.4] tracking-[1.8px] text-text-muted">
            Fundado em · São Cristóvão
          </p>
        </div>
      </div>
    </Link>
  );
}
