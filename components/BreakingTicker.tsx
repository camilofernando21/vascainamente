import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { isSameDay } from "@/lib/time";

export default function BreakingTicker() {
  const breaking = getAllPosts().find(
    (p) => p.category === "urgente" && isSameDay(p.date)
  );

  if (!breaking) return null;

  return (
    <Link
      href={`/${breaking.slug}`}
      className="flex h-10 items-center gap-3 bg-red px-6 hover:opacity-90"
    >
      <span className="shrink-0 text-[10px] font-bold tracking-[1.2px] text-white">
        AGORA
      </span>
      <span className="truncate text-[12px] text-white">{breaking.title}</span>
    </Link>
  );
}
