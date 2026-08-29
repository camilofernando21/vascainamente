import Header from "@/components/Header";
import BreakingTicker from "@/components/BreakingTicker";
import NavTabs from "@/components/NavTabs";
import HeroSection from "@/components/HeroSection";
import EditorialGrid from "@/components/EditorialGrid";
import LatestList from "@/components/LatestList";
import StatsBar from "@/components/StatsBar";
import SectionDivider from "@/components/SectionDivider";
import TextRoll from "@/components/ui/text-roll";
import { getAllPosts } from "@/lib/posts";
import { isSameDay } from "@/lib/time";

export const revalidate = 60;

export default function Home() {
  const posts = getAllPosts();
  const featured = posts[0] ?? null;
  const rest = posts.slice(1);

  const analysisPost = rest.find((p) => p.category === "clube") ?? rest[0] ?? null;
  const resultPost =
    rest.find((p) => p.category === "resultado" && p.homeScore != null) ??
    rest.find((p) => p.category === "resultado") ??
    null;

  const usedSlugs = new Set(
    [featured?.slug, analysisPost?.slug, resultPost?.slug].filter(Boolean)
  );
  const latest = posts.filter((p) => !usedSlugs.has(p.slug)).slice(0, 5);

  const postsToday = posts.filter((p) => isSameDay(p.date)).length;

  return (
    <main className="min-h-screen">
      <Header />
      <BreakingTicker />
      <NavTabs />

      <div className="mx-auto max-w-[1100px]">
        {featured && <HeroSection post={featured} />}

        <SectionDivider />

        <EditorialGrid analysisPost={analysisPost} resultPost={resultPost} />

        <SectionDivider />

        {latest.length > 0 && <LatestList posts={latest} />}

        <SectionDivider />

        <StatsBar totalPosts={posts.length} postsToday={postsToday} />

        <div className="flex justify-center border-t border-border px-6 py-8">
          <a href="/" className="text-[11px] tracking-[1.5px] text-text-muted">
            <TextRoll>VER MAIS NOTÍCIAS →</TextRoll>
          </a>
        </div>
      </div>
    </main>
  );
}
