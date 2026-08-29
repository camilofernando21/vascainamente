import HeroSection from "@/components/HeroSection";
import NavTabs from "@/components/NavTabs";
import { getAllPosts } from "@/lib/posts";

export const revalidate = 60;

export default function Home() {
  const posts = getAllPosts();
  const featured = posts[0] ?? null;

  return (
    <main className="relative min-h-screen">
      <NavTabs className="absolute inset-x-0 top-20 z-30" />
      {featured && <HeroSection post={featured} />}
    </main>
  );
}
