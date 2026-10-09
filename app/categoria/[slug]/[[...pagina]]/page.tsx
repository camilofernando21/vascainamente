import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteTopBar from "@/components/SiteTopBar";
import NewsList from "@/components/NewsList";
import SiteFooter from "@/components/home/SiteFooter";
import {
  CATEGORY_NAMES,
  MAIN_CATEGORIES,
  OPTIONAL_CATEGORIES,
  categoryHref,
  isCategory,
} from "@/lib/categories";
import { getPostsByCategory, type Category } from "@/lib/posts";
import { toHomeItem } from "@/lib/home";
import { OG_DEFAULTS } from "@/lib/site";

export const revalidate = 60;
export const dynamicParams = false;

const PER_PAGE = 20;

type Params = { slug: string; pagina?: string[] };

function categoriesWithPages(): Category[] {
  return [
    ...MAIN_CATEGORIES,
    ...OPTIONAL_CATEGORIES.filter((c) => getPostsByCategory(c).length > 0),
  ];
}

export function generateStaticParams(): Params[] {
  return categoriesWithPages().flatMap((slug) => {
    const pages = Math.max(1, Math.ceil(getPostsByCategory(slug).length / PER_PAGE));
    return Array.from({ length: pages }, (_, i) => ({
      slug,
      pagina: i === 0 ? [] : [String(i + 1)],
    }));
  });
}

function resolve(params: Params) {
  if (!isCategory(params.slug) || !categoriesWithPages().includes(params.slug)) return null;
  if (params.pagina && params.pagina.length > 1) return null;
  const page = params.pagina?.[0] ? Number(params.pagina[0]) : 1;
  if (!Number.isInteger(page) || page < 1) return null;
  const posts = getPostsByCategory(params.slug);
  const totalPages = Math.max(1, Math.ceil(posts.length / PER_PAGE));
  if (page > totalPages) return null;
  return { category: params.slug, page, posts, totalPages };
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const data = resolve(params);
  if (!data) return {};
  const name = CATEGORY_NAMES[data.category];
  const title = data.page > 1 ? `${name}, página ${data.page}` : name;
  const description = `Notícias do Vasco da Gama na categoria ${name}.`;
  const url = categoryHref(data.category, data.page);
  const image = { url: `/og/categoria/${data.category}`, width: 1200, height: 630, alt: `${name} · Vascainamente` };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { ...OG_DEFAULTS, type: "website", url, title: `${title} · Vascainamente`, description, images: [image] },
    twitter: { card: "summary_large_image", title: `${title} · Vascainamente`, description, images: [image.url] },
  };
}

export default function CategoryPage({ params }: { params: Params }) {
  const data = resolve(params);
  if (!data) notFound();
  const { category, page, posts, totalPages } = data;
  const items = posts.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(toHomeItem);

  return (
    <main className="relative min-h-screen">
      <SiteTopBar />

      <header className="vm-cat-hero">
        <span className="vm-cat-ghost" aria-hidden="true">
          {String(posts.length).padStart(2, "0")}
        </span>
        <p className="vm-label vm-cat-eyebrow">
          Categoria · {posts.length} {posts.length === 1 ? "notícia" : "notícias"}
        </p>
        <h1 className="vm-cat-title">{CATEGORY_NAMES[category]}</h1>
      </header>

      {items.length > 0 ? (
        <section className="vm-cat-list" aria-label={`Notícias de ${CATEGORY_NAMES[category]}`}>
          <NewsList items={items} startIndex={(page - 1) * PER_PAGE} showCategory={false} />
        </section>
      ) : (
        <p className="vm-cat-empty">Ainda não há notícias nesta categoria.</p>
      )}

      {totalPages > 1 && (
        <nav className="vm-pagination" aria-label="Páginas">
          {page > 1 ? (
            <Link href={categoryHref(category, page - 1)} className="vm-page-step">
              Anterior
            </Link>
          ) : (
            <span className="vm-page-step is-disabled">Anterior</span>
          )}
          <ol>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <li key={n}>
                <Link
                  href={categoryHref(category, n)}
                  className="vm-page-num"
                  aria-current={n === page ? "page" : undefined}
                >
                  {String(n).padStart(2, "0")}
                </Link>
              </li>
            ))}
          </ol>
          {page < totalPages ? (
            <Link href={categoryHref(category, page + 1)} className="vm-page-step">
              Próxima
            </Link>
          ) : (
            <span className="vm-page-step is-disabled">Próxima</span>
          )}
        </nav>
      )}

      <SiteFooter />
    </main>
  );
}
