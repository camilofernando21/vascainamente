"use client";

import { useState } from "react";
import TextRoll from "@/components/ui/text-roll";
import { NAV_TABS } from "@/lib/categories";
import { cn } from "@/lib/utils";

export default function NavTabs({ className }: { className?: string }) {
  const [active, setActive] = useState(0);

  return (
    <nav className={cn("w-[240px] md:w-[280px]", className)}>
      <p className="mb-3 border-b border-border pb-3 text-[10px] uppercase tracking-[1.8px] text-text-muted">
        Vascainamente · Navegação
      </p>
      <ol>
        {NAV_TABS.map((tab, i) => {
          const isActive = active === i;
          return (
            <li key={tab.category} className="border-b border-border last:border-b-0">
              <button
                onClick={() => setActive(i)}
                className={cn(
                  "block w-full py-[10px] text-left text-[15px] uppercase tracking-[1px] transition-colors",
                  isActive ? "text-text-hero" : "text-text-muted"
                )}
              >
                <TextRoll>{tab.label}</TextRoll>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
