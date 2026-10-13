// Match pages: everything the site knows about one game of the Vasco, from public data and from the site's
// own articles and estimates. Nothing here is written by a model: every sentence on the page is built from
// these fields, and a block with no data simply does not exist.

import { getAllPosts, type Lineup } from "@/lib/posts";
import {
  SITE,
  VASCO_ID,
  brtDay,
  espn,
  getCompetitions,
  sp,
  type CompetitionInfo,
  type CompetitionsData,
  type MatchInfo,
  type TableRow,
} from "@/lib/competitions";
import { getChances, getMatchStakes, type ChancesData, type MatchStakes } from "@/lib/chances";

// ---------- the list of games ----------

export type MatchRef = {
  slug: string;
  leagueSlug: string;
  competition: string; // "Copa Sul-Americana"
  competitionShort: string;
  match: MatchInfo;
};

/** Every game of the Vasco this season that the competitions data knows about (played, live and to come). */
export async function getMatchRefs(loaded?: CompetitionsData | null): Promise<MatchRef[]> {
  const data = loaded === undefined ? await getCompetitions() : loaded;
  if (!data) return [];
  const out: MatchRef[] = [];
  const seen = new Set<string>();
  for (const c of data.competitions) {
    for (const m of [...c.fixtures, ...c.results]) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      out.push({ slug: m.slug, leagueSlug: c.slug, competition: c.name, competitionShort: c.short, match: m });
    }
  }
  return out.sort((a, b) => a.match.iso.localeCompare(b.match.iso));
}

// ---------- reading the public summary ----------

type Json = unknown;
const dig = (o: Json, ...path: (string | number)[]): Json => {
  let cur: Json = o;
  for (const k of path) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string | number, Json>)[k];
  }
  return cur;
};
const str = (v: Json): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const num = (v: Json): number | null => {
  const n = Number(v);
  return v !== null && v !== "" && v !== undefined && Number.isFinite(n) ? n : null;
};
const arr = (v: Json): Json[] => (Array.isArray(v) ? v : []);

/** "dd/mm/aaaa" in Brasília */
function fullDate(iso: string): string {
  const [y, m, d] = brtDay(iso).split("-");
  return `${d}/${m}/${y}`;
}

function competitionPt(raw: string): string {
  const s = raw.replace(/^\d{4}\s*/, "");
  if (/sudamericana/i.test(s)) return "Sul-Americana";
  if (/libertadores/i.test(s)) return "Libertadores";
  if (/copa do bra/i.test(s)) return "Copa do Brasil";
  if (/carioca/i.test(s)) return "Carioca";
  if (/serie a|brasileir/i.test(s)) return "Brasileirão";
  return s;
}

export type FormGame = {
  result: "V" | "E" | "D";
  opponent: string;
  own: number | null;
  other: number | null;
  home: boolean;
  dayLabel: string;
  competition: string;
};

function parseForm(sm: Json, teamId: string): FormGame[] {
  const entry = arr(dig(sm, "lastFiveGames")).find((x) => str(dig(x, "team", "id")) === teamId);
  const out: FormGame[] = [];
  for (const e of arr(dig(entry, "events"))) {
    const home = str(dig(e, "homeTeamId")) === teamId;
    const r = str(dig(e, "gameResult"));
    const result = r === "W" ? "V" : r === "L" ? "D" : r === "D" ? "E" : null;
    if (!result) continue;
    out.push({
      result,
      opponent: str(dig(e, "opponent", "displayName")),
      own: num(dig(e, home ? "homeTeamScore" : "awayTeamScore")),
      other: num(dig(e, home ? "awayTeamScore" : "homeTeamScore")),
      home,
      dayLabel: sp(str(dig(e, "gameDate"))).dayLabel,
      competition: competitionPt(str(dig(e, "competitionName"))),
    });
  }
  return out;
}

export type H2HGame = { date: string; competition: string; home: string; away: string; homeScore: number; awayScore: number };
export type H2H = { games: H2HGame[]; wins: number; draws: number; losses: number };

function parseH2H(sm: Json): H2H | null {
  const series = arr(dig(sm, "seasonseries"));
  const s = series.find((x) => str(dig(x, "type")) === "head-to-head") ?? series[0];
  const games: H2HGame[] = [];
  let wins = 0;
  let draws = 0;
  let losses = 0;
  for (const e of arr(dig(s, "events"))) {
    if (dig(e, "statusType", "completed") !== true) continue;
    const comps = arr(dig(e, "competitors"));
    const h = comps.find((c) => str(dig(c, "homeAway")) === "home");
    const a = comps.find((c) => str(dig(c, "homeAway")) === "away");
    const hs = num(dig(h, "score"));
    const as = num(dig(a, "score"));
    if (!h || !a || hs === null || as === null) continue;
    const vascoHome = str(dig(h, "team", "id")) === VASCO_ID;
    const mine = vascoHome ? hs : as;
    const theirs = vascoHome ? as : hs;
    if (mine > theirs) wins++;
    else if (mine === theirs) draws++;
    else losses++;
    games.push({
      date: fullDate(str(dig(e, "date"))),
      competition: competitionPt(str(dig(e, "competitionName"))),
      home: str(dig(h, "team", "displayName")),
      away: str(dig(a, "team", "displayName")),
      homeScore: hs,
      awayScore: as,
    });
  }
  return games.length ? { games, wins, draws, losses } : null;
}

export type KeyPlay = {
  minute: string;
  kind: "goal" | "pen" | "own" | "yellow" | "red" | "sub";
  team: string;
  isVasco: boolean;
  player: string; // the scorer, the one booked, or the one coming on
  other: string; // the assist, or the one going off
};

function parsePlays(sm: Json): KeyPlay[] {
  const out: KeyPlay[] = [];
  for (const k of arr(dig(sm, "keyEvents"))) {
    const t = str(dig(k, "type", "type"));
    const kind: KeyPlay["kind"] | null =
      t === "own-goal" ? "own" : t === "penalty---scored" ? "pen" : t.startsWith("goal") ? "goal" : t === "yellow-card" ? "yellow" : t === "red-card" ? "red" : t === "substitution" ? "sub" : null;
    if (!kind) continue;
    const people = arr(dig(k, "participants")).map((p) => str(dig(p, "athlete", "displayName")));
    if (!people[0]) continue;
    out.push({
      minute: str(dig(k, "clock", "displayValue")),
      kind,
      team: str(dig(k, "team", "displayName")),
      isVasco: str(dig(k, "team", "id")) === VASCO_ID,
      player: people[0],
      other: people[1] ?? "",
    });
  }
  return out;
}

export type RosterPlayer = { name: string; jersey: string; position: string };
export type RosterSide = { teamName: string; isVasco: boolean; formation: string | null; starters: RosterPlayer[]; bench: RosterPlayer[] };

// only a complete lineup (11 starters) is shown: never a partial or provisional one
function parseRosters(sm: Json): RosterSide[] {
  const out: RosterSide[] = [];
  for (const r of arr(dig(sm, "rosters"))) {
    const players = arr(dig(r, "roster")).map((p) => ({
      starter: dig(p, "starter") === true,
      name: str(dig(p, "athlete", "displayName")),
      jersey: str(dig(p, "jersey")),
      position: str(dig(p, "position", "abbreviation")),
    }));
    const starters = players.filter((p) => p.starter);
    if (starters.length !== 11) continue;
    const pick = ({ name, jersey, position }: { name: string; jersey: string; position: string }) => ({ name, jersey, position });
    out.push({
      teamName: str(dig(r, "team", "displayName")),
      isVasco: str(dig(r, "team", "id")) === VASCO_ID,
      formation: str(dig(r, "formation")) || null,
      starters: starters.map(pick),
      bench: players.filter((p) => !p.starter && p.name).map(pick),
    });
  }
  return out;
}

export type StatRow = { label: string; home: string; away: string; homeValue: number; awayValue: number };

const STAT_LABELS: [string, string][] = [
  ["possessionPct", "Posse de bola"],
  ["totalShots", "Finalizações"],
  ["shotsOnTarget", "Finalizações no gol"],
  ["wonCorners", "Escanteios"],
  ["foulsCommitted", "Faltas"],
  ["offsides", "Impedimentos"],
  ["saves", "Defesas"],
  ["yellowCards", "Cartões amarelos"],
  ["redCards", "Cartões vermelhos"],
];

function parseStats(sm: Json, homeId: string, awayId: string): StatRow[] {
  const teams = arr(dig(sm, "boxscore", "teams"));
  const pickSide = (id: string) => teams.find((t) => str(dig(t, "team", "id")) === id);
  const h = pickSide(homeId);
  const a = pickSide(awayId);
  if (!h || !a) return [];
  const val = (side: Json, name: string): number | null => {
    const s = arr(dig(side, "statistics")).find((x) => str(dig(x, "name")) === name);
    return s ? num(dig(s, "value")) ?? num(dig(s, "displayValue")) : null;
  };
  const rows: StatRow[] = [];
  for (const [name, label] of STAT_LABELS) {
    const hv = val(h, name);
    const av = val(a, name);
    if (hv === null || av === null) continue;
    const fmt = (v: number) => (name === "possessionPct" ? `${v.toFixed(1).replace(".", ",")}%` : String(Math.round(v)));
    rows.push({ label, home: fmt(hv), away: fmt(av), homeValue: hv, awayValue: av });
  }
  // a game that has not started comes with zeros everywhere
  return rows.some((r) => r.homeValue > 0 || r.awayValue > 0) ? rows : [];
}

// ---------- the official lineup, from the robot's article on the Vasco's X profile ----------

export type OfficialLineup = { lineup: Lineup; dayLabel: string; timeLabel: string; sourceUrl: string; slug: string };

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function findOfficialLineup(kickoffIso: string, opponent: string[]): OfficialLineup | null {
  const kick = new Date(kickoffIso).getTime();
  const names = opponent.map(norm).filter(Boolean);
  const hit = getAllPosts()
    .filter((p) => {
      if (p.matchEvent !== "escalacao" || !p.lineup) return false;
      const t = new Date(p.date).getTime();
      if (t < kick - 8 * 3600_000 || t > kick + 4 * 3600_000) return false;
      const text = norm(`${p.title} ${p.excerpt} ${p.content}`);
      return names.some((n) => text.includes(n));
    })
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!hit || !hit.lineup) return null;
  const when = sp(hit.date);
  return { lineup: hit.lineup, dayLabel: when.dayLabel, timeLabel: when.timeLabel, sourceUrl: hit.sourceUrl, slug: hit.slug };
}

export type RelatedPost = { slug: string; title: string; date: string; source: string };

function relatedPosts(kickoffIso: string, opponent: string[], state: MatchInfo["state"]): RelatedPost[] {
  const kick = new Date(kickoffIso).getTime();
  const from = kick - 10 * 86400_000;
  const to = state === "pre" ? Date.now() + 86400_000 : kick + 4 * 86400_000;
  const names = opponent.map(norm).filter(Boolean);
  return getAllPosts()
    .filter((p) => {
      const t = new Date(p.date).getTime();
      if (t < from || t > to) return false;
      const text = norm(`${p.title} ${p.excerpt}`);
      return names.some((n) => text.includes(n));
    })
    .slice(0, 4)
    .map((p) => ({ slug: p.slug, title: p.title, date: p.date, source: p.source }));
}

// ---------- cups: the other leg and what came before ----------

export type TieInfo = { phase: string; leg: number | null; other: MatchInfo | null };

function tieOf(match: MatchInfo, comp: CompetitionInfo | undefined): TieInfo | null {
  if (!comp || comp.slug === "bra.1") return null;
  const opp = match.home.isVasco ? match.away.name : match.home.name;
  const same = [...comp.results, ...comp.fixtures].filter(
    (m) => m.id !== match.id && m.phase === match.phase && (m.home.name === opp || m.away.name === opp),
  );
  return { phase: match.phase, leg: match.leg, other: same[0] ?? null };
}

// ---------- the page ----------

export type MatchPage = {
  ref: MatchRef;
  opponent: { name: string; short: string };
  form: { home: FormGame[]; away: FormGame[] };
  h2h: H2H | null;
  plays: KeyPlay[];
  rosters: RosterSide[];
  stats: StatRow[];
  rows: { home: TableRow | null; away: TableRow | null };
  tie: TieInfo | null;
  stakes: MatchStakes | null;
  chancesNow: ChancesData | null;
  officialLineup: OfficialLineup | null;
  related: RelatedPost[];
  hasSummary: boolean;
};

export async function getMatchPage(slug: string): Promise<MatchPage | null> {
  const comps: CompetitionsData | null = await getCompetitions();
  const refs = await getMatchRefs(comps);
  const ref = refs.find((r) => r.slug === slug);
  if (!ref) return null;
  const m = ref.match;
  const comp = comps?.competitions.find((c) => c.slug === ref.leagueSlug);
  const league = ref.leagueSlug === "bra.1";
  const opp = m.home.isVasco ? m.away : m.home;
  const homeId = m.home.isVasco ? VASCO_ID : "";

  const ttl = m.state === "in" ? 45 : m.state === "pre" ? 300 : 3600;
  const sm = await espn(`${SITE}/${ref.leagueSlug}/summary?event=${m.id}`, ttl);
  const empty: MatchPage = {
    ref,
    opponent: { name: opp.name, short: opp.short },
    form: { home: [], away: [] },
    h2h: null,
    plays: [],
    rosters: [],
    stats: [],
    rows: { home: null, away: null },
    tie: null,
    stakes: null,
    chancesNow: null,
    officialLineup: null,
    related: [],
    hasSummary: false,
  };
  // without the public summary the page is only the header: nothing else is asked, nothing is guessed
  if (!sm) return empty;
  const [stakes, chancesNow] = await Promise.all([
    league && m.state !== "post" ? getMatchStakes(m.id) : Promise.resolve(null),
    league && m.state === "post" ? getChances() : Promise.resolve(null),
  ]);

  // the ids of both sides, taken from the summary itself (the match data carries names only)
  const sides = arr(dig(sm, "header", "competitions", 0, "competitors"));
  const idOf = (homeAway: string) => str(dig(sides.find((c) => str(dig(c, "homeAway")) === homeAway), "id"));
  const hId = idOf("home") || (homeId ? VASCO_ID : "");
  const aId = idOf("away") || (!homeId ? VASCO_ID : "");

  const rowOf = (t: { name: string }) => comps?.table?.rows.find((r) => r.team.name === t.name) ?? null;
  const opponentNames = [opp.short, opp.name];

  return {
    ref,
    opponent: { name: opp.name, short: opp.short },
    form: { home: parseForm(sm, hId), away: parseForm(sm, aId) },
    h2h: parseH2H(sm),
    plays: m.state !== "pre" ? parsePlays(sm) : [],
    rosters: parseRosters(sm),
    stats: m.state !== "pre" ? parseStats(sm, hId, aId) : [],
    rows: league ? { home: rowOf(m.home), away: rowOf(m.away) } : { home: null, away: null },
    tie: tieOf(m, comp),
    stakes,
    chancesNow,
    officialLineup: findOfficialLineup(m.iso, opponentNames),
    related: relatedPosts(m.iso, opponentNames, m.state),
    hasSummary: true,
  };
}
