import Link from "next/link";
import TextRoll from "@/components/ui/text-roll";
import { NAV_TABS, categoryHref } from "@/lib/categories";
import type { Category } from "@/lib/posts";
import { cn } from "@/lib/utils";

const TABS = NAV_TABS.filter((tab): tab is { label: string; category: Category } => tab.category !== "todos");

export default function NavTabs({ className }: { className?: string }) {
  return (
    <nav className={cn("w-[240px] md:w-[280px]", className)} aria-label="Categorias">
      <ol>
        {TABS.map((tab) => (
          <li key={tab.category} className="border-b border-border last:border-b-0">
            <Link href={categoryHref(tab.category)} className="vm-nav-link">
              <TextRoll>{tab.label}</TextRoll>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
