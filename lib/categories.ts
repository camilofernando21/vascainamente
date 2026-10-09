import type { Category } from "@/lib/posts";

export const CATEGORY_LABELS: Record<Category, string> = {
  transferencia: "TRANSFERÊNCIA",
  resultado: "RESULTADO",
  elenco: "ELENCO",
  base: "BASE",
  feminino: "FEMININO",
  urgente: "URGENTE",
  clube: "CLUBE",
  historico: "HISTÓRICO",
};

export const NAV_TABS: { label: string; category: Category | "todos" }[] = [
  { label: "Tudo", category: "todos" },
  { label: "Transferências", category: "transferencia" },
  { label: "Resultados", category: "resultado" },
  { label: "Elenco", category: "elenco" },
  { label: "Base", category: "base" },
  { label: "Feminino", category: "feminino" },
  { label: "Histórico", category: "historico" },
];

// Display names for headings (title case, with accents).
export const CATEGORY_NAMES: Record<Category, string> = {
  transferencia: "Transferências",
  resultado: "Resultados",
  elenco: "Elenco",
  base: "Base",
  feminino: "Feminino",
  urgente: "Urgente",
  clube: "Clube",
  historico: "Histórico",
};

// Categories that always get a page (even when empty); urgente and clube only when they have news.
export const MAIN_CATEGORIES: Category[] = [
  "transferencia",
  "resultado",
  "elenco",
  "base",
  "feminino",
];
export const OPTIONAL_CATEGORIES: Category[] = ["urgente", "clube"];

export function isCategory(value: string): value is Category {
  return value in CATEGORY_NAMES;
}

// "Histórico" is a special page built from content/historia.json, not a news list.
export const HISTORY_HREF = "/historia";

export function categoryHref(category: Category, page = 1): string {
  if (category === "historico") return HISTORY_HREF;
  return page > 1 ? `/categoria/${category}/${page}` : `/categoria/${category}`;
}
