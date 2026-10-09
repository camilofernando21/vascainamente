import type { Metadata } from "next";
import Link from "next/link";
import SiteTopBar from "@/components/SiteTopBar";
import NewsCards from "@/components/NewsCards";
import SiteFooter from "@/components/home/SiteFooter";
import { getLatestPosts } from "@/lib/posts";
import { toHomeItem } from "@/lib/home";

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false },
};

export default function NotFound() {
  const latest = getLatestPosts(3).map(toHomeItem);

  return (
    <main className="relative min-h-screen">
      <SiteTopBar />

      <section className="vm-404" aria-labelledby="vm-404-title">
        <h1 id="vm-404-title" className="vm-404-number">
          404
        </h1>
        <p className="vm-404-text">Essa página não existe ou mudou de endereço.</p>
        <Link href="/" className="vm-button">
          Voltar para a home
        </Link>
      </section>

      {latest.length > 0 && (
        <section className="vm-related" aria-label="Últimas notícias">
          <p className="vm-label vm-related-title">Últimas notícias</p>
          <NewsCards items={latest} />
        </section>
      )}

      <SiteFooter />
    </main>
  );
}
