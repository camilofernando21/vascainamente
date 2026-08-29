"use client";

import { useState } from "react";
import TextRoll from "@/components/ui/text-roll";
import { NAV_TABS } from "@/lib/categories";

export default function NavTabs() {
  const [active, setActive] = useState(0);

  return (
    <nav className="flex gap-6 overflow-x-auto border-b border-border px-6">
      {NAV_TABS.map((tab, i) => {
        const isActive = active === i;
        return (
          <button
            key={tab.category}
            onClick={() => setActive(i)}
            className={`shrink-0 border-b-2 pb-[11px] pt-3 text-[11px] tracking-[0.3px] transition-colors ${
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
