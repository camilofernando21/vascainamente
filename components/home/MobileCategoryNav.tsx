"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CruzMalta } from "@/components/ui/cruz-malta";
import InstagramLink from "@/components/InstagramLink";
import { NAV_TABS, categoryHref } from "@/lib/categories";
import type { Category } from "@/lib/posts";
import { cn } from "@/lib/utils";

const TABS = NAV_TABS.filter((tab): tab is { label: string; category: Category } => tab.category !== "todos");

function Links({ tabIndex }: { tabIndex?: number }) {
  return (
    <ul className="vm-mnav-list">
      {TABS.map((tab) => (
        <li key={tab.category}>
          <Link href={categoryHref(tab.category)} className="vm-mnav-link" tabIndex={tabIndex}>
            {tab.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Phone-only categories: a strip under the logo in the hero, and a compact bar pinned to the top
// once the hero has scrolled away, so the categories are one tap away anywhere on the home.
export default function MobileCategoryNav() {
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const hero = document.querySelector(".vm-hero-wrap");
    if (!hero) return;
    const io = new IntersectionObserver(([entry]) => setPinned(!entry.isIntersecting), { threshold: 0 });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <nav className="vm-mnav" aria-label="Categorias">
        <Links />
      </nav>
      <nav className={cn("vm-mnav-bar", pinned && "is-pinned")} aria-label="Categorias" aria-hidden={!pinned}>
        <CruzMalta size={14} className="vm-mnav-cross" />
        <Links tabIndex={pinned ? undefined : -1} />
        <InstagramLink size={18} className="vm-insta-bar" />
      </nav>
    </>
  );
}
