import HeroSection from "@/components/HeroSection";
import NavTabs from "@/components/NavTabs";
import { getAllPosts } from "@/lib/posts";

export const revalidate = 60;

export default function Home() {
  const posts = getAllPosts();
  const featured = posts[0] ?? null;

  return (
    <main className="relative min-h-screen">
      <NavTabs className="absolute bottom-10 left-6 z-30 hidden md:block lg:bottom-14 lg:left-12" />
      {featured && <HeroSection post={featured} />}
    </main>
  );
}
