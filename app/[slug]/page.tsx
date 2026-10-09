import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReadingProgress from "@/components/ReadingProgress";
import SiteTopBar from "@/components/SiteTopBar";
import NewsCards from "@/components/NewsCards";
import ShareLinks from "@/components/article/ShareLinks";
import SiteFooter from "@/components/home/SiteFooter";
import { getAllPosts, getPostBySlug, markdownToHtml } from "@/lib/posts";
import { CATEGORY_NAMES, categoryHref } from "@/lib/categories";
import { toHomeItem } from "@/lib/home";
import { absoluteUrl } from "@/lib/site";
import { formatDateFull, readingTime } from "@/lib/time";
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
  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
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

  return (
    <main className="relative min-h-screen">
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
