import HeroSection from "@/components/HeroSection";
import NavTabs from "@/components/NavTabs";
import ScrollBadge from "@/components/effects/ScrollBadge";
import HeadlineMarquee from "@/components/home/HeadlineMarquee";
import GoalSection from "@/components/home/GoalSection";
import LatestHorizontal from "@/components/home/LatestHorizontal";
import TodayCards from "@/components/home/TodayCards";
import HistoricQuote from "@/components/home/HistoricQuote";
import Idols from "@/components/home/Idols";
import SiteFooter from "@/components/home/SiteFooter";
import { getAllPosts } from "@/lib/posts";
import { pickTodayPosts, toHomeItem } from "@/lib/home";
import { OG_DEFAULTS, SITE_DESCRIPTION } from "@/lib/site";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    ...OG_DEFAULTS,
    type: "website",
    url: "/",
    title: "Vascainamente · Notícias do Vasco da Gama",
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: "Vascainamente", description: SITE_DESCRIPTION },
};

export default function Home() {
  const posts = getAllPosts();
  const featured = posts[0] ?? null;
  const today = pickTodayPosts(posts);

  return (
    <main className="relative min-h-screen">
      {/* hero keeps its own box so the menu stays pinned to the hero, not to the bottom of the page */}
      <div className="relative">
        <NavTabs className="absolute bottom-10 left-6 z-30 hidden md:block lg:bottom-14 lg:left-12" />
        {/* the whole hero is one big link: keep the cursor as a plain dot over it */}
        {featured && (
          <div data-cursor="plain">
            <HeroSection post={featured} />
          </div>
        )}
      </div>

      <HeadlineMarquee items={posts.slice(0, 12).map(toHomeItem)} />
      <GoalSection item={featured ? toHomeItem(featured) : null} />
      <LatestHorizontal items={posts.slice(1, 5).map(toHomeItem)} />
      <TodayCards items={today.items.map(toHomeItem)} isToday={today.isToday} />
      <HistoricQuote />
      <Idols />
      <SiteFooter />

      <ScrollBadge stopAtId="idolos" />
    </main>
  );
}
