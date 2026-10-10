import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReadingProgress from "@/components/ReadingProgress";
import SiteTopBar from "@/components/SiteTopBar";
import NewsCards from "@/components/NewsCards";
import ShareLinks from "@/components/article/ShareLinks";
import LiteYouTube from "@/components/LiteYouTube";
import { ytWatchUrl } from "@/lib/youtube-url";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import SiteFooter from "@/components/home/SiteFooter";
import { getAllPosts, getPostBySlug, markdownToHtml } from "@/lib/posts";
import { CATEGORY_NAMES, categoryHref } from "@/lib/categories";
import { toHomeItem } from "@/lib/home";
import { OG_DEFAULTS, SITE_NAME, absoluteUrl } from "@/lib/site";
import { formatDateFull, formatDateShort, readingTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export const revalidate = 60;

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = getPostBySlug(params.slug);
  if (!post) return {};
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  const url = `/${post.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      ...OG_DEFAULTS,
      type: "article",
      url,
      title,
      description,
      publishedTime: new Date(post.date).toISOString(),
      ...(post.updated ? { modifiedTime: new Date(post.updated).toISOString() } : {}),
      section: CATEGORY_NAMES[post.category],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  const contentHtml = await markdownToHtml(post.content);
  const url = absoluteUrl(`/${post.slug}`);
  const related = getAllPosts()
    .filter((p) => p.category === post.category && p.slug !== post.slug)
    .slice(0, 3)
    .map(toHomeItem);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    datePublished: new Date(post.date).toISOString(),
    dateModified: new Date(post.updated ?? post.date).toISOString(),
    articleSection: CATEGORY_NAMES[post.category],
    inLanguage: "pt-BR",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    image: [absoluteUrl(`/${post.slug}/opengraph-image`)],
    author: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
    publisher: {
      "@type": "Organization",
      "@id": absoluteUrl("/#organization"),
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: absoluteUrl("/images/logo-vasco.png") },
    },
    ...(post.sourceUrl ? { isBasedOn: post.sourceUrl } : {}),
  };

  return (
    <main className="relative min-h-screen">
      <JsonLd
        data={[
          jsonLd,
          breadcrumbSchema([
            { name: CATEGORY_NAMES[post.category], path: categoryHref(post.category) },
            { name: post.title, path: `/${post.slug}` },
          ]),
        ]}
      />
      <ReadingProgress />
      <SiteTopBar />

      <article className="vm-article">
        <div className="vm-article-inner">
          <header className="vm-article-head">
            <p className="vm-label vm-article-kicker">
              <Link
                href={categoryHref(post.category)}
                className={cn(
                  "vm-article-cat",
                  post.category === "urgente" && "is-red",
                )}
              >
                {CATEGORY_NAMES[post.category]}
              </Link>
              <span aria-hidden="true"> · </span>
              <time dateTime={post.date}>{formatDateFull(post.date)}</time>
              {post.updated && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span>
                    Atualizado em <time dateTime={post.updated}>{formatDateShort(post.updated)}</time>
                  </span>
                </>
              )}
            </p>
            <h1 className="vm-article-title">{post.title}</h1>
            {post.excerpt && <p className="vm-article-dek">{post.excerpt}</p>}
            <p className="vm-article-meta">
              {post.source &&
                (post.sourceUrl ? (
                  <>
                    Fonte:{" "}
                    <a
                      href={post.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {post.source}
                    </a>
                  </>
                ) : (
                  <>Fonte: {post.source}</>
                ))}
              {post.source && <span aria-hidden="true"> · </span>}
              {readingTime(post.content)} min de leitura
            </p>
          </header>

          {post.videoId && (
            <figure className="vm-article-video">
              <LiteYouTube id={post.videoId} title={post.title} priority trackLocation="materia" />
              <figcaption>
                <a
                  className="vm-lite-credit"
                  href={ytWatchUrl(post.videoId)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Vídeo: {post.videoSource || "Vasco TV"}
                </a>
              </figcaption>
            </figure>
          )}

          <div
            className="vm-article-body"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />

          <ShareLinks url={url} title={post.title} variant="inline" />
        </div>
      </article>

      <ShareLinks url={url} title={post.title} variant="rail" />

      {related.length > 0 && (
        <section className="vm-related" aria-label="Leia também">
          <p className="vm-label vm-related-title">Leia também</p>
          <NewsCards items={related} />
        </section>
      )}

      <SiteFooter />
    </main>
  );
}
