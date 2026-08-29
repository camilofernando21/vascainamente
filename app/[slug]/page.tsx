import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Header from "@/components/Header";
import ArticleBody from "@/components/ArticleBody";
import { getAllPosts, getPostBySlug, markdownToHtml } from "@/lib/posts";

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

  return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-[760px]">
        <ArticleBody post={post} contentHtml={contentHtml} />
      </div>
    </main>
  );
}
