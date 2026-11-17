const WEEKDAYS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

const MONTHS_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export function timeAgoWords(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `${min} minuto${min === 1 ? "" : "s"} atrás`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} hora${hours === 1 ? "" : "s"} atrás`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} dia${days === 1 ? "" : "s"} atrás`;
  return formatDateShort(dateStr);
}

export function timeAgoCompact(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}m`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// Tudo no horário de Brasília. O servidor da Vercel roda em UTC, e uma matéria das 23h30 de
// 16/11 (02h30 de 17/11 em UTC) saía com a data do dia seguinte.
const SP_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  weekday: "short",
});

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function spParts(d: Date) {
  const parts = Object.fromEntries(SP_PARTS.formatToParts(d).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month) - 1,
    day: Number(parts.day),
    weekday: WEEKDAY_INDEX[parts.weekday] ?? 0,
  };
}

export function formatDateFull(dateStr: string): string {
  const p = spParts(new Date(dateStr));
  return `${WEEKDAYS[p.weekday]}, ${String(p.day).padStart(2, "0")} ${MONTHS_SHORT[p.month]} ${p.year}`;
}

export function formatDateShort(dateStr: string): string {
  const p = spParts(new Date(dateStr));
  return `${String(p.day).padStart(2, "0")} ${MONTHS_SHORT[p.month]} ${p.year}`;
}

export function isSameDay(dateStr: string, ref: Date = new Date()): boolean {
  const a = spParts(new Date(dateStr));
  const b = spParts(ref);
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function readingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}
