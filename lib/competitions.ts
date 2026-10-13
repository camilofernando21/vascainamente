// Competitions the Vasco plays, read live from ESPN's public endpoints (free, no key, unofficial).
// Everything is shaped here on the server into plain, already-formatted values, so the client
// section never renders a date or a number differently from the server. The source is cached for a
// couple of minutes by Next's fetch cache; if ESPN fails, the section simply hides until it answers.

export const SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
export const STANDINGS = "https://site.api.espn.com/apis/v2/sports/soccer";
export const VASCO_ID = "3454";
const TZ = "America/Sao_Paulo";
const FIXTURES_TTL = 120; // seconds
const TABLE_TTL = 300;

// every league the club can be in during a year: the ones with games this season show up by themselves
const LEAGUES: { slug: string; name: string; short: string }[] = [
  { slug: "bra.1", name: "Brasileirão Série A", short: "Brasileirão" },
  { slug: "conmebol.libertadores", name: "Copa Libertadores", short: "Libertadores" },
  { slug: "conmebol.sudamericana", name: "Copa Sul-Americana", short: "Sul-Americana" },
  { slug: "bra.copa_do_brazil", name: "Copa do Brasil", short: "Copa do Brasil" },
  { slug: "bra.camp.carioca", name: "Campeonato Carioca", short: "Carioca" },
  { slug: "conmebol.recopa", name: "Recopa Sul-Americana", short: "Recopa" },
  { slug: "bra.supercopa_do_brazil", name: "Supercopa do Brasil", short: "Supercopa" },
];

export type TeamInfo = { name: string; short: string; abbr: string; logo: string; isVasco: boolean };

export type MatchInfo = {
  id: string;
  slug: string; // the address of its page: "sao-paulo-x-vasco-2026-10-17"
  iso: string;
  dayLabel: string; // "ter, 13/10"
  timeLabel: string; // "21:30"
  home: TeamInfo;
  away: TeamInfo;
  homeScore: number | null;
  awayScore: number | null;
  state: "pre" | "in" | "post";
  clock: string; // live minute, e.g. "63'"
  phase: string;
  leg: number | null;
  venue: string;
  result: "V" | "E" | "D" | null; // from the Vasco's side, finished games only
  note: string; // "Agregado: 2 a 0" and the like
};

export type CompetitionInfo = {
  slug: string;
  name: string;
  short: string;
  active: boolean;
  /** what to show on the tab: the next phase for knockouts, the position for the league */
  badge: string;
  outcome: string; // finished ones: "Campeão" or "Eliminado"
  outcomeAt: string; // and where: "Semifinal"
  results: MatchInfo[]; // newest first
  fixtures: MatchInfo[]; // soonest first
};

export type TableRow = {
  pos: number;
  team: TeamInfo;
  pts: number;
  j: number;
  v: number;
  e: number;
  d: number;
  sg: string;
  zone: "lib" | "pre" | "sula" | "mid" | "z4";
};

export type LeagueTable = {
  rows: TableRow[];
  vasco: TableRow;
  form: ("V" | "E" | "D")[]; // oldest to newest
  roundsLeft: number;
  insights: string[];
};

export type CompetitionsData = {
  season: number;
  updatedLabel: string;
  competitions: CompetitionInfo[];
  table: LeagueTable | null;
  next: (MatchInfo & { competition: string }) | null;
};

// ---------- helpers ----------

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Calendar day in Brasília, "2026-10-17", the same one the match is announced with. */
export function brtDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export function matchSlug(homeShort: string, awayShort: string, iso: string): string {
  return `${slugify(homeShort)}-x-${slugify(awayShort)}-${brtDay(iso)}`;
}

type Json = Awaited<ReturnType<Response["json"]>>;
const FAIL_MEMORY = 30_000; // ms: after a failure the source is not asked again for this address
const failedUntil = new Map<string, number>();
const inFlight = new Map<string, Promise<Json | null>>();

// Cached by Next for `ttl` seconds. On top of that, a failure is remembered for 30 s and visitors that arrive
// together share one request, so a spike of visits (or a source that is down) never means one query per visit.
export function espn(url: string, ttl: number): Promise<Json | null> {
  const failed = failedUntil.get(url);
  if (failed && Date.now() < failed) return Promise.resolve(null);
  const running = inFlight.get(url);
  if (running) return running;
  const request = (async () => {
    try {
      const res = await fetch(url, { next: { revalidate: ttl }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        failedUntil.set(url, Date.now() + FAIL_MEMORY);
        return null;
      }
      return await res.json();
    } catch {
      failedUntil.set(url, Date.now() + FAIL_MEMORY);
      return null;
    } finally {
      inFlight.delete(url);
    }
  })();
  inFlight.set(url, request);
  return request;
}

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function sp(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return {
    dayLabel: `${WEEKDAYS[wd] ?? ""}, ${get("day")}/${get("month")}`,
    timeLabel: `${get("hour")}:${get("minute")}`,
  };
}

function logoOf(team: { logos?: { href: string }[]; logo?: string }, id: string): string {
  const raw = team.logos?.[0]?.href ?? team.logo ?? `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`;
  // ESPN's resizer: ~7 KB instead of ~65 KB per logo
  const path = raw.replace("https://a.espncdn.com", "");
  return `https://a.espncdn.com/combiner/i?img=${path}&w=96&h=96`;
}

const ORDINAL: Record<string, string> = { First: "Primeira", Second: "Segunda", Third: "Terceira", Fourth: "Quarta", Fifth: "Quinta" };

function phasePt(raw: string): string {
  const s = raw.trim();
  const map: Record<string, string> = {
    "Group Stage": "Fase de grupos",
    "Knockout Round Playoffs": "Playoffs",
    "Round of 16": "Oitavas de final",
    Quarterfinals: "Quartas de final",
    Semifinals: "Semifinal",
    Final: "Final",
    "Taça Guanabara": "Taça Guanabara",
    "Taça Guanabara - Quarterfinals": "Taça Guanabara, quartas de final",
    "Taça Guanabara - Semifinals": "Taça Guanabara, semifinal",
    "Taça Guanabara - Final": "Taça Guanabara, final",
  };
  if (map[s]) return map[s];
  const round = s.match(/^(First|Second|Third|Fourth|Fifth) Round$/);
  if (round) return `${ORDINAL[round[1]]} fase`;
  if (/serie a|série a/i.test(s)) return "Pontos corridos";
  return s;
}

function num(v: unknown): number | null {
  const n = Number(typeof v === "object" && v ? (v as { displayValue?: string }).displayValue : v);
  return Number.isFinite(n) && v !== null && v !== "" ? n : null;
}

export function team(c: { team: { id: string; displayName: string; shortDisplayName?: string; abbreviation?: string; logos?: { href: string }[]; logo?: string } }): TeamInfo {
  const t = c.team;
  return {
    name: t.displayName,
    short: (t.shortDisplayName ?? t.displayName).trim(),
    abbr: t.abbreviation ?? t.displayName.slice(0, 3).toUpperCase(),
    logo: logoOf(t, t.id),
    isVasco: t.id === VASCO_ID,
  };
}

function aggregateNote(headline: string | undefined): string {
  // "2nd Leg - Vasco da Gama win 2-0 on aggregate": the winner comes first in the score
  const m = headline?.match(/- (.+?) wins? (\d+)-(\d+) on aggregate/);
  return m ? `${m[1].trim()} avança, ${m[2]} a ${m[3]} no agregado` : "";
}

type RawEvent = {
  id: string;
  date: string;
  seasonType: { name: string };
  competitions: {
    status: { displayClock?: string; type: { state: string; description?: string; shortDetail?: string } };
    competitors: { homeAway: string; team: Parameters<typeof team>[0]["team"]; score?: unknown; winner?: boolean }[];
    venue?: { fullName?: string; address?: { city?: string } };
    leg?: { value: number };
    notes?: { headline?: string }[];
  }[];
};

function toMatch(e: RawEvent): MatchInfo | null {
  const c = e.competitions?.[0];
  if (!c) return null;
  const home = c.competitors.find((x) => x.homeAway === "home");
  const away = c.competitors.find((x) => x.homeAway === "away");
  if (!home || !away) return null;
  const state = c.status.type.state === "in" ? "in" : c.status.type.state === "post" ? "post" : "pre";
  const homeScore = state === "pre" ? null : num(home.score);
  const awayScore = state === "pre" ? null : num(away.score);
  const vascoHome = String(home.team.id) === VASCO_ID;
  let result: MatchInfo["result"] = null;
  if (state === "post" && homeScore !== null && awayScore !== null) {
    const mine = vascoHome ? homeScore : awayScore;
    const theirs = vascoHome ? awayScore : homeScore;
    const vascoComp = vascoHome ? home : away;
    result = mine > theirs ? "V" : mine < theirs ? "D" : vascoComp.winner ? "V" : (vascoHome ? away : home).winner ? "D" : "E";
  }
  const { dayLabel, timeLabel } = sp(e.date);
  const venue = [c.venue?.fullName, c.venue?.address?.city].filter(Boolean).join(", ");
  const homeTeam = team(home);
  const awayTeam = team(away);
  return {
    id: e.id,
    slug: matchSlug(homeTeam.short, awayTeam.short, e.date),
    iso: e.date,
    dayLabel,
    timeLabel,
    home: homeTeam,
    away: awayTeam,
    homeScore,
    awayScore,
    state,
    clock: state === "in" ? (c.status.displayClock ?? c.status.type.shortDetail ?? "").trim() : "",
    phase: phasePt(e.seasonType?.name ?? ""),
    leg: c.leg?.value ?? null,
    venue,
    result,
    note: state === "post" ? aggregateNote(c.notes?.[0]?.headline) || (/penalt/i.test(c.status.type.description ?? "") ? "Decidido nos pênaltis" : "") : "",
  };
}

// who went through, from the games of the last phase played against the same opponent
function outcomeOf(results: MatchInfo[]): { outcome: string; outcomeAt: string } {
  const last = results[0];
  if (!last) return { outcome: "", outcomeAt: "" };
  const rival = (m: MatchInfo) => (m.home.isVasco ? m.away.name : m.home.name);
  const tie = results.filter((m) => m.phase === last.phase && rival(m) === rival(last));
  let mine = 0;
  let theirs = 0;
  for (const m of tie) {
    mine += (m.home.isVasco ? m.homeScore : m.awayScore) ?? 0;
    theirs += (m.home.isVasco ? m.awayScore : m.homeScore) ?? 0;
  }
  const won = mine > theirs || (mine === theirs && last.result === "V");
  const isFinal = last.phase === "Final" || /, final$/.test(last.phase);
  if (isFinal && won) return { outcome: "Campeão", outcomeAt: last.phase };
  if (!won) return { outcome: "Eliminado", outcomeAt: last.phase };
  return { outcome: "", outcomeAt: "" };
}

// ---------- the league table ----------

type Res = "V" | "E" | "D";

// the run the Vasco is on right now (newest game first), in one sentence; nothing when there is no run worth saying
function streakLine(newestFirst: Res[]): string {
  const run = (ok: (r: Res) => boolean) => {
    let n = 0;
    while (n < newestFirst.length && ok(newestFirst[n])) n++;
    return n;
  };
  const wins = run((r) => r === "V");
  const unbeaten = run((r) => r !== "D");
  const losses = run((r) => r === "D");
  const winless = run((r) => r !== "V");
  const pl = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  if (wins >= 2) return `${wins} vitórias seguidas no Brasileirão.`;
  if (unbeaten >= 3) {
    const w = newestFirst.slice(0, unbeaten).filter((r) => r === "V").length;
    return `Invicto há ${unbeaten} jogos no Brasileirão (${pl(w, "vitória", "vitórias")} e ${pl(unbeaten - w, "empate", "empates")}).`;
  }
  if (losses >= 2) return `${losses} derrotas seguidas no Brasileirão.`;
  if (winless >= 4) return `${winless} jogos sem vencer no Brasileirão.`;
  return "";
}

export function zoneOf(pos: number): TableRow["zone"] {
  if (pos <= 4) return "lib";
  if (pos <= 6) return "pre";
  if (pos <= 12) return "sula";
  if (pos >= 17) return "z4";
  return "mid";
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

function buildTable(d: { children?: { standings?: { entries?: unknown[] } }[] } | null, results: MatchInfo[]): LeagueTable | null {
  const entries = d?.children?.[0]?.standings?.entries as
    | { team: Parameters<typeof team>[0]["team"]; stats: { name: string; value?: number; displayValue?: string }[] }[]
    | undefined;
  if (!entries?.length) return null;
  const stat = (e: (typeof entries)[number], name: string) => Number(e.stats.find((s) => s.name === name)?.value ?? 0);
  const rows: TableRow[] = entries
    .map((e) => ({
      pos: stat(e, "rank"),
      team: team({ team: e.team }),
      pts: stat(e, "points"),
      j: stat(e, "gamesPlayed"),
      v: stat(e, "wins"),
      e: stat(e, "ties"),
      d: stat(e, "losses"),
      sg: signed(stat(e, "pointDifferential")),
      zone: zoneOf(stat(e, "rank")),
    }))
    .sort((a, b) => a.pos - b.pos);
  const vasco = rows.find((r) => r.team.isVasco);
  if (!vasco) return null;

  const total = rows.length >= 20 ? 38 : (rows.length - 1) * 2;
  const roundsLeft = Math.max(0, total - vasco.j);
  const insights: string[] = [];
  const at = (pos: number) => rows.find((r) => r.pos === pos)?.pts;
  const pl = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  if (vasco.pos <= 6) {
    const next = at(7);
    insights.push(vasco.pos <= 4 ? "Dentro do G4, vaga direta na fase de grupos da Libertadores." : "Na zona de Libertadores, com vaga na fase preliminar.");
    if (next !== undefined) insights.push(`${pl(vasco.pts - next, "ponto", "pontos")} à frente do 7º colocado.`);
  } else {
    const g6 = at(6);
    if (g6 !== undefined) insights.push(`A ${pl(g6 - vasco.pts, "ponto", "pontos")} do G6, a zona da Libertadores.`);
  }
  const line17 = at(17);
  const line16 = at(16);
  if (vasco.pos >= 17 && line16 !== undefined) {
    insights.push(`A ${pl(line16 - vasco.pts, "ponto", "pontos")} de sair do Z4.`);
  } else if (line17 !== undefined) {
    insights.push(`${pl(vasco.pts - line17, "ponto", "pontos")} acima da zona de rebaixamento.`);
  }
  const run = streakLine(results.filter((m) => m.result).map((m) => m.result as Res));
  if (run) insights.unshift(run);
  if (roundsLeft > 0) insights.push(`Restam ${pl(roundsLeft, "rodada", "rodadas")}, até ${roundsLeft * 3} pontos em disputa.`);

  const form = results
    .filter((m) => m.state === "post" && m.result)
    .slice(0, 5)
    .map((m) => m.result as "V" | "E" | "D")
    .reverse();

  return { rows, vasco, form, roundsLeft, insights };
}

// ---------- public ----------

export async function getCompetitions(): Promise<CompetitionsData | null> {
  const year = Number(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric" }).format(new Date()));

  const [tableRaw, ...pairs] = await Promise.all([
    espn(`${STANDINGS}/bra.1/standings`, TABLE_TTL),
    ...LEAGUES.flatMap((l) => [
      espn(`${SITE}/${l.slug}/teams/${VASCO_ID}/schedule`, FIXTURES_TTL),
      espn(`${SITE}/${l.slug}/teams/${VASCO_ID}/schedule?fixture=true`, FIXTURES_TTL),
    ]),
  ]);

  const competitions: CompetitionInfo[] = [];
  LEAGUES.forEach((l, i) => {
    const played = pairs[i * 2] as { season?: { year?: number }; events?: RawEvent[] } | null;
    const upcoming = pairs[i * 2 + 1] as { events?: RawEvent[] } | null;
    if (played?.season?.year && played.season.year !== year) return; // last year's competition
    const rawPlayed = played?.events ?? [];
    const rawUp = upcoming?.events ?? [];
    const results = rawPlayed.map(toMatch).filter((m): m is MatchInfo => !!m && m.state !== "pre");
    const live = rawPlayed.map(toMatch).filter((m): m is MatchInfo => !!m && m.state === "in");
    const fixtures = [...live, ...rawUp.map(toMatch).filter((m): m is MatchInfo => !!m && m.state !== "post")]
      .filter((m, k, arr) => arr.findIndex((x) => x.id === m.id) === k)
      .sort((a, b) => a.iso.localeCompare(b.iso));
    results.sort((a, b) => b.iso.localeCompare(a.iso));
    if (!results.length && !fixtures.length) return;
    const finishedOnly = results.filter((m) => m.state === "post");
    competitions.push({
      slug: l.slug,
      name: l.name,
      short: l.short,
      active: fixtures.length > 0,
      badge: "",
      ...(fixtures.length ? { outcome: "", outcomeAt: "" } : outcomeOf(finishedOnly)),
      results: finishedOnly,
      fixtures,
    });
  });

  if (!competitions.length) return null;

  const league = competitions.find((c) => c.slug === "bra.1");
  const table = buildTable(tableRaw, league?.results ?? []);

  for (const c of competitions) {
    if (c.slug === "bra.1" && table) c.badge = `${table.vasco.pos}º`;
    else if (c.active) c.badge = c.fixtures[0].phase;
    else c.badge = "Encerrado";
  }
  // active ones first, then the finished ones, keeping the order of LEAGUES
  competitions.sort((a, b) => Number(b.active) - Number(a.active));

  let next: CompetitionsData["next"] = null;
  for (const c of competitions) {
    const m = c.fixtures[0];
    if (m && (!next || m.iso < next.iso)) next = { ...m, competition: c.name };
  }

  const now = sp(new Date().toISOString());
  return { season: year, updatedLabel: now.timeLabel, competitions, table, next };
}
