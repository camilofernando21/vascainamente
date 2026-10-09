import Link from "next/link";
import { NAV_TABS, categoryHref } from "@/lib/categories";
import type { Category } from "@/lib/posts";
import LegalLinks from "@/components/consent/LegalLinks";
import { PUBLISHER } from "@/lib/site";

const CATEGORIES = NAV_TABS.filter(
  (tab): tab is { label: string; category: Category } => tab.category !== "todos"
);

export default function SiteFooter() {
  return (
    <footer id="vm-footer">
      <Link href="/" className="vm-footer-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-vasco.png" alt="" className="h-9 w-auto" />
        <span className="vm-label text-text-hero">Vascainamente</span>
      </Link>
      <ul className="vm-footer-cats">
        {CATEGORIES.map((tab) => (
          <li key={tab.category} className="vm-label">
            <Link href={categoryHref(tab.category)}>{tab.label}</Link>
          </li>
        ))}
      </ul>
      <p className="vm-footer-note">Notícias atualizadas automaticamente a cada 15 minutos.</p>
      <LegalLinks />
      <p className="vm-footer-credit">
        Site feito e mantido pela{" "}
        <a href={PUBLISHER.url} target="_blank" rel="noopener">
          {PUBLISHER.name}
        </a>
      </p>
    </footer>
  );
}
