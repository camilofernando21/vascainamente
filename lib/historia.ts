import historia from "@/content/historia.json";

// Checked facts supplied by the editor (content/historia.json). Shown as they are: never completed or inferred.
export interface HistoryDate {
  dia: string; // "DD-MM"
  ano: number;
  titulo: string;
  texto: string;
}

export interface Title {
  nome: string;
  anos: number[];
}

export const HISTORY_DATES: HistoryDate[] = [...historia.datas].sort((a, b) => a.ano - b.ano);
export const TITLES: Title[] = historia.titulos;

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function dayLabel(dia: string): string {
  const [d, m] = dia.split("-").map(Number);
  return `${d} de ${MONTHS[m - 1]}`;
}

/** Today's date in São Paulo, whatever the server's time zone. */
export function todayInSaoPaulo(now = new Date()): { day: number; month: number; year: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { day: get("day"), month: get("month"), year: get("year") };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Facts for today's day and month (there can be more than one). */
export function factsForToday(now = new Date()): HistoryDate[] {
  const { day, month } = todayInSaoPaulo(now);
  return HISTORY_DATES.filter((d) => d.dia === `${pad(day)}-${pad(month)}`);
}

/** Next date in the calendar after today, with the number of days until it. */
export function nextFact(now = new Date()): { fact: HistoryDate; days: number } | null {
  if (HISTORY_DATES.length === 0) return null;
  const { day, month, year } = todayInSaoPaulo(now);
  const today = Date.UTC(year, month - 1, day);
  let best: { fact: HistoryDate; days: number } | null = null;
  for (const fact of HISTORY_DATES) {
    const [d, m] = fact.dia.split("-").map(Number);
    let when = Date.UTC(year, m - 1, d);
    if (when <= today) when = Date.UTC(year + 1, m - 1, d);
    const days = Math.round((when - today) / 86_400_000);
    if (!best || days < best.days) best = { fact, days };
  }
  return best;
}
