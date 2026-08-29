import Link from "next/link";
import type { Post } from "@/lib/posts";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatDateShort, readingTime } from "@/lib/time";
import TextRoll from "@/components/ui/text-roll";

export default function ArticleBody({
  post,
  contentHtml,
}: {
  post: Post;
  contentHtml: string;
}) {
  return (
    <article className="px-6 py-8">
      <p className="mb-4 text-[11px] tracking-[2px] text-text-label">
        VASCAINAMENTE · {CATEGORY_LABELS[post.category]}
      </p>

      <h1 className="text-[32px] font-medium leading-[1.15] tracking-[-0.5px] text-text-hero">
        {post.title}
      </h1>

      <p className="mt-4 text-[11px] text-text-meta">
        {post.source} · {formatDateShort(post.date)} · {readingTime(post.content)} min de leitura
      </p>

      <div className="mt-6 border-t border-border" />

      <div
        className="prose-vasca mt-6 space-y-5 text-[17px] leading-[1.9] text-text-secondary"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />

      <div className="mt-10 flex items-center justify-between border-t border-border pt-5">
        <Link href="/" className="text-[11px] tracking-[1px] text-text-muted hover:opacity-70">
          <TextRoll>← Voltar para notícias</TextRoll>
        </Link>
        {post.sourceUrl && (
          <a
            href={post.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] tracking-[1px] text-text-muted hover:opacity-70"
          >
            <TextRoll>Fonte original →</TextRoll>
          </a>
        )}
      </div>
    </article>
  );
}
