"use client";

import { useState } from "react";
import TextRoll from "@/components/ui/text-roll";
import { NAV_TABS } from "@/lib/categories";
import { cn } from "@/lib/utils";

export default function NavTabs({ className }: { className?: string }) {
  const [active, setActive] = useState(0);

  return (
    <nav className={cn("flex gap-4 overflow-x-auto px-6 md:gap-5 lg:px-12", className)}>
      {NAV_TABS.map((tab, i) => {
        const isActive = active === i;
        return (
          <button
            key={tab.category}
            onClick={() => setActive(i)}
            className={`shrink-0 border-b-2 pb-[10px] pt-3 text-[10px] uppercase tracking-[1.8px] transition-colors ${
              isActive ? "border-red text-text-hero" : "border-transparent text-text-muted"
            }`}
          >
            <TextRoll>{tab.label}</TextRoll>
          </button>
        );
      })}
    </nav>
  );
}
