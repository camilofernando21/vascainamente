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
