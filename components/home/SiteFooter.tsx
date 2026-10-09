import { NAV_TABS } from "@/lib/categories";

const CATEGORIES = NAV_TABS.filter((tab) => tab.category !== "todos");

export default function SiteFooter() {
  return (
    <footer id="vm-footer">
      <div className="vm-footer-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-vasco.png" alt="" className="h-9 w-auto" />
        <span className="vm-label text-text-hero">Vascainamente</span>
      </div>
      <ul className="vm-footer-cats">
        {CATEGORIES.map((tab) => (
          <li key={tab.category} className="vm-label">
            {tab.label}
          </li>
        ))}
      </ul>
      <p className="vm-footer-note">Notícias atualizadas automaticamente a cada 15 minutos.</p>
    </footer>
  );
}
