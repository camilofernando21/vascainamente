import HeroSection from "@/components/HeroSection";
import { getAllPosts } from "@/lib/posts";

export const revalidate = 60;

export default function Home() {
  const posts = getAllPosts();
  const featured = posts[0] ?? null;

  return (
    <main className="min-h-screen">
      {featured && <HeroSection post={featured} />}
    </main>
  );
}
