import Link from "next/link";
import type { Post } from "@/lib/posts";
import { CATEGORY_LABELS } from "@/lib/categories";
import { timeAgoWords } from "@/lib/time";
import { NumberTicker } from "@/components/motion/number-ticker";

export default function EditorialGrid({
  analysisPost,
  resultPost,
}: {
  analysisPost: Post | null;
  resultPost: Post | null;
}) {
  if (!analysisPost && !resultPost) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1.35fr_1fr]">
      <div className="border-b border-border p-6 md:border-b-0 md:border-r">
        {analysisPost && <AnalysisCard post={analysisPost} />}
      </div>
      <div className="p-6">{resultPost && <ResultCard post={resultPost} />}</div>
    </div>
  );
}

function AnalysisCard({ post }: { post: Post }) {
  return (
    <Link href={`/${post.slug}`} className="block hover:opacity-70">
      <p className="mb-3 text-[11px] uppercase tracking-[2.8px] text-text-label">
        {CATEGORY_LABELS[post.category]}
      </p>
      <h2 className="text-[22px] font-normal leading-[1.3] text-text-primary">
        {post.title}
      </h2>
      <p className="mt-3 text-[13px] leading-[1.7] text-text-secondary">{post.excerpt}</p>
      <p className="mt-4 text-[12px] text-text-meta">
        {post.source} · {timeAgoWords(post.date)}
      </p>
    </Link>
  );
}

function ResultCard({ post }: { post: Post }) {
  const hasScore =
    post.homeTeam && post.awayTeam && post.homeScore != null && post.awayScore != null;
  const homeWins = (post.homeScore ?? 0) >= (post.awayScore ?? 0);

  return (
    <Link href={`/${post.slug}`} className="relative block hover:opacity-70">
      {hasScore && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center font-serif text-[280px] leading-none text-white opacity-[0.04]"
        >
          {homeWins ? post.homeScore : post.awayScore}
        </span>
      )}

      <div className="relative z-10">
        <p className="mb-3 text-[11px] uppercase tracking-[2.8px] text-text-label">
          {CATEGORY_LABELS[post.category]}
          {post.competition ? ` · ${post.competition}` : ""}
        </p>

        {hasScore ? (
          <div>
            <div className="flex items-center justify-between py-2">
              <span
                className={`text-[15px] font-medium ${
                  homeWins ? "text-text-hero" : "text-text-secondary"
                }`}
              >
                {post.homeTeam}
              </span>
              <NumberTicker
                value={post.homeScore ?? 0}
                className={`font-serif text-[64px] font-normal tracking-[-2px] ${
                  homeWins ? "text-text-hero" : "text-text-secondary"
                }`}
              />
            </div>
            <div className="border-t border-border" />
            <div className="flex items-center justify-between py-2">
              <span
                className={`text-[15px] font-medium ${
                  !homeWins ? "text-text-hero" : "text-text-secondary"
                }`}
              >
                {post.awayTeam}
              </span>
              <NumberTicker
                value={post.awayScore ?? 0}
                className={`font-serif text-[64px] font-normal tracking-[-2px] ${
                  !homeWins ? "text-text-hero" : "text-text-secondary"
                }`}
              />
            </div>
            <p className="mt-4 text-[12px] text-text-meta">
              {post.venue ? `${post.venue} · ` : ""}
              {timeAgoWords(post.date)}
            </p>
          </div>
        ) : (
          <div>
            <h2 className="text-[22px] font-normal leading-[1.3] text-text-primary">
              {post.title}
            </h2>
            <p className="mt-4 text-[12px] text-text-meta">
              {post.source} · {timeAgoWords(post.date)}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
