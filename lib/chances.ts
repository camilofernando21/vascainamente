// "Chances do Vasco": the rest of the Brasileirão simulated 20,000 times.
// Each game that is left gets a score drawn from Poisson distributions built from the attack and defense
// of both teams (goals scored and conceded this season, with a prior and a home-field factor). The table is
// then sorted with the real tie-breakers and the position of every team is counted. It is a probability,
// not a forecast: it knows nothing about injuries, suspensions or line-ups.

import { SITE, STANDINGS, VASCO_ID, espn, sp, team, type TeamInfo } from "@/lib/competitions";

const SIMS = 20000;
const PRIOR_GAMES = 8; // games of league-average form mixed into every team's attack and defense
const HOME_FACTOR = 1.14; // home goals are about 1.3 times away goals (1.14 squared)
const TABLE_TTL = 600;
const FIXTURES_TTL = 3600;
const MAX_GOALS = 12;

export type ScenarioKey = "V" | "E" | "D";

export type TeamChance = {
  team: TeamInfo;
  pos: number;
  pts: number;
  j: number;
  projPts: number;
  projPos: number;
  pTitle: number;
  pG4: number;
  pG6: number; // Libertadores: top 6
  pSula: number; // 7th to 12th
  pZ4: number;
  dist: number[]; // probability of each final position, index 0 = 1st
};

export type VascoGame = {
  id: string;
  dayLabel: string;
  timeLabel: string;
  opponent: TeamInfo;
  home: boolean;
  pW: number;
  pE: number;
  pD: number;
};

export type Scenario = { key: ScenarioKey; prob: number; pG6: number; pSula: number; pZ4: number; projPts: number };

export type ChancesData = {
  updatedDay: string;
  updatedTime: string;
  sims: number;
  roundsLeft: number;
  teams: TeamChance[]; // by current position
  vasco: TeamChance;
  games: VascoGame[]; // next games, soonest first
  scenarios: Scenario[]; // outcomes of the very next game
};

type Entry = { id: string; info: TeamInfo; j: number; pts: number; w: number; gf: number; ga: number };
type Fixture = { id: string; iso: string; home: number; away: number };

// ---------- random numbers and Poisson ----------

function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(limit: number, rnd: () => number): number {
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rnd();
  } while (p > limit);
  return k - 1;
}

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

// win / draw / loss of the home side, summing the exact Poisson probabilities
function outcome(lh: number, la: number) {
  const pm = (l: number) => {
    const out = [Math.exp(-l)];
    for (let k = 1; k <= MAX_GOALS; k++) out.push((out[k - 1] * l) / k);
    return out;
  };
  const h = pm(lh);
  const a = pm(la);
  let w = 0;
  let d = 0;
  let l = 0;
  for (let i = 0; i <= MAX_GOALS; i++)
    for (let j = 0; j <= MAX_GOALS; j++) {
      const p = h[i] * a[j];
      if (i > j) w += p;
      else if (i === j) d += p;
      else l += p;
    }
  const t = w + d + l;
  return { w: w / t, d: d / t, l: l / t };
}

// ---------- the simulation ----------

type Forced = { index: number; result: ScenarioKey } | null;

function simulate(entries: Entry[], fixtures: Fixture[], lam: { h: number; a: number }[], seed: number, forced: Forced) {
  const n = entries.length;
  const rnd = mulberry32(seed);
  const counts = new Uint32Array(n * n);
  const sumPts = new Float64Array(n);
  const pts = new Int32Array(n);
  const wins = new Int32Array(n);
  const gd = new Int32Array(n);
  const gf = new Int32Array(n);
  const tb = new Float64Array(n);
  const order = Array.from({ length: n }, (_, i) => i);
  const limits = lam.map((l) => ({ h: Math.exp(-l.h), a: Math.exp(-l.a) }));

  for (let s = 0; s < SIMS; s++) {
    for (let i = 0; i < n; i++) {
      pts[i] = entries[i].pts;
      wins[i] = entries[i].w;
      gd[i] = entries[i].gf - entries[i].ga;
      gf[i] = entries[i].gf;
      tb[i] = rnd();
    }
    for (let f = 0; f < fixtures.length; f++) {
      let hg = 0;
      let ag = 0;
      const fx = fixtures[f];
      if (forced && forced.index === f) {
        // draw until the game ends the way the scenario says (from the Vasco's side)
        const vascoHome = entries[fx.home].id === VASCO_ID;
        for (let tries = 0; tries < 400; tries++) {
          hg = poisson(limits[f].h, rnd);
          ag = poisson(limits[f].a, rnd);
          const mine = vascoHome ? hg - ag : ag - hg;
          const r: ScenarioKey = mine > 0 ? "V" : mine === 0 ? "E" : "D";
          if (r === forced.result) break;
        }
      } else {
        hg = poisson(limits[f].h, rnd);
        ag = poisson(limits[f].a, rnd);
      }
      gf[fx.home] += hg;
      gf[fx.away] += ag;
      gd[fx.home] += hg - ag;
      gd[fx.away] += ag - hg;
      if (hg > ag) {
        pts[fx.home] += 3;
        wins[fx.home]++;
      } else if (hg < ag) {
        pts[fx.away] += 3;
        wins[fx.away]++;
      } else {
        pts[fx.home]++;
        pts[fx.away]++;
      }
    }
    order.sort((x, y) => pts[y] - pts[x] || wins[y] - wins[x] || gd[y] - gd[x] || gf[y] - gf[x] || tb[y] - tb[x]);
    for (let p = 0; p < n; p++) counts[order[p] * n + p]++;
    for (let i = 0; i < n; i++) sumPts[i] += pts[i];
  }
  return { counts, sumPts, n };
}

function summarize(counts: Uint32Array, sumPts: Float64Array, n: number, i: number) {
  const dist: number[] = [];
  for (let p = 0; p < n; p++) dist.push(counts[i * n + p] / SIMS);
  const upTo = (k: number) => dist.slice(0, k).reduce((a, b) => a + b, 0);
  const range = (a: number, b: number) => dist.slice(a - 1, b).reduce((x, y) => x + y, 0);
  return {
    dist,
    pTitle: dist[0],
    pG4: upTo(4),
    pG6: upTo(6),
    pSula: range(7, 12),
    pZ4: range(17, 20),
    projPts: sumPts[i] / SIMS,
    projPos: dist.reduce((acc, p, k) => acc + p * (k + 1), 0),
  };
}

// ---------- data and entry point ----------

type RawEntry = { team: Parameters<typeof team>[0]["team"]; stats: { name: string; value?: number }[] };
type RawEvent = {
  id: string;
  date: string;
  competitions: { status: { type: { state: string } }; competitors: { homeAway: string; team: { id: string } }[] }[];
};

type Model = {
  entries: Entry[];
  fixtures: Fixture[];
  lam: { h: number; a: number }[];
  seed: number;
  index: Map<string, number>;
  base: ReturnType<typeof simulate>;
  n: number;
  total: number;
};

// everything the page and the match pages share: the table, the games left and the base simulation
async function buildModel(): Promise<Model | null> {
  const standings = await espn(`${STANDINGS}/bra.1/standings`, TABLE_TTL);
  const raw = standings?.children?.[0]?.standings?.entries as RawEntry[] | undefined;
  if (!raw || raw.length < 4) return null;
  const stat = (e: RawEntry, name: string) => Number(e.stats.find((s) => s.name === name)?.value ?? 0);
  const entries: Entry[] = raw
    .map((e) => ({
      id: String(e.team.id),
      info: team({ team: e.team }),
      j: stat(e, "gamesPlayed"),
      pts: stat(e, "points"),
      w: stat(e, "wins"),
      gf: stat(e, "pointsFor"),
      ga: stat(e, "pointsAgainst"),
      rank: stat(e, "rank"),
    }))
    .sort((a, b) => a.rank - b.rank)
    .map((e) => ({ id: e.id, info: e.info, j: e.j, pts: e.pts, w: e.w, gf: e.gf, ga: e.ga }));
  const n = entries.length;
  const index = new Map(entries.map((e, i) => [e.id, i]));
  if (!index.has(VASCO_ID)) return null;

  // every team's games still to play (a game appears twice, once per team: deduplicated by id)
  const schedules = await Promise.all(entries.map((e) => espn(`${SITE}/bra.1/teams/${e.id}/schedule?fixture=true`, FIXTURES_TTL)));
  if (schedules.some((s) => !s)) return null;
  const found = new Map<string, Fixture>();
  for (const sc of schedules as { events?: RawEvent[] }[]) {
    for (const ev of sc.events ?? []) {
      const c = ev.competitions?.[0];
      if (!c || c.status.type.state === "post") continue;
      const h = c.competitors.find((x) => x.homeAway === "home");
      const a = c.competitors.find((x) => x.homeAway === "away");
      const hi = h ? index.get(String(h.team.id)) : undefined;
      const ai = a ? index.get(String(a.team.id)) : undefined;
      if (hi === undefined || ai === undefined || hi === ai) continue;
      found.set(ev.id, { id: ev.id, iso: ev.date, home: hi, away: ai });
    }
  }
  const total = (n - 1) * 2;
  const expected = entries.reduce((acc, e) => acc + Math.max(0, total - e.j), 0) / 2;
  const fixtures = Array.from(found.values()).sort((a, b) => a.iso.localeCompare(b.iso));
  // a hole in the data would give wrong odds: better to show nothing than something wrong
  if (expected > 0 && fixtures.length < expected * 0.9) return null;

  // attack and defense of each team, relative to the league average
  const totalGames = entries.reduce((a, e) => a + e.j, 0);
  const g = totalGames > 0 ? entries.reduce((a, e) => a + e.gf, 0) / totalGames : 1.2;
  const att = entries.map((e) => (e.gf + PRIOR_GAMES * g) / (e.j + PRIOR_GAMES) / g);
  const def = entries.map((e) => (e.ga + PRIOR_GAMES * g) / (e.j + PRIOR_GAMES) / g);
  const lam = fixtures.map((f) => ({
    h: g * HOME_FACTOR * att[f.home] * def[f.away],
    a: (g / HOME_FACTOR) * att[f.away] * def[f.home],
  }));

  const seed = hash(entries.map((e) => `${e.id}:${e.pts}:${e.j}:${e.gf}:${e.ga}`).join("|"));
  const base = simulate(entries, fixtures, lam, seed, null);
  return { entries, fixtures, lam, seed, index, base, n, total };
}

export async function getChances(): Promise<ChancesData | null> {
  const model = await buildModel();
  if (!model) return null;
  const { entries, fixtures, lam, seed, index, base, n, total } = model;
  const vi = index.get(VASCO_ID)!;

  const teams: TeamChance[] = entries.map((e, i) => ({
    team: e.info,
    pos: i + 1,
    pts: e.pts,
    j: e.j,
    ...summarize(base.counts, base.sumPts, n, i),
  }));
  const vasco = teams[vi];

  // the Vasco's next games and what the very next result would change
  const mine = fixtures.map((f, k) => ({ f, k })).filter(({ f }) => f.home === vi || f.away === vi);
  const games: VascoGame[] = mine.slice(0, 5).map(({ f, k }) => {
    const o = outcome(lam[k].h, lam[k].a);
    const home = f.home === vi;
    const when = sp(f.iso);
    return {
      id: f.id,
      dayLabel: when.dayLabel,
      timeLabel: when.timeLabel,
      opponent: entries[home ? f.away : f.home].info,
      home,
      pW: home ? o.w : o.l,
      pE: o.d,
      pD: home ? o.l : o.w,
    };
  });
  const scenarios: Scenario[] = [];
  if (mine.length > 0) {
    const first = mine[0].k;
    for (const key of ["V", "E", "D"] as ScenarioKey[]) {
      const r = simulate(entries, fixtures, lam, seed, { index: first, result: key });
      const sm = summarize(r.counts, r.sumPts, n, vi);
      const g0 = games[0];
      scenarios.push({ key, prob: key === "V" ? g0.pW : key === "E" ? g0.pE : g0.pD, pG6: sm.pG6, pSula: sm.pSula, pZ4: sm.pZ4, projPts: sm.projPts });
    }
  }

  const now = sp(new Date().toISOString());
  const roundsLeft = Math.max(0, total - entries[vi].j);
  return { updatedDay: now.dayLabel, updatedTime: now.timeLabel, sims: SIMS, roundsLeft, teams, vasco, games, scenarios };
}

// ---------- one game: what it changes for the Vasco ----------

export type MatchStakes = {
  sims: number;
  home: boolean; // the Vasco plays at home
  opponent: TeamInfo;
  pW: number;
  pE: number;
  pD: number;
  now: { pos: number; pts: number; pG6: number; pSula: number; pZ4: number; projPts: number };
  scenarios: Scenario[]; // chances of the Vasco after each result of this game
};

/** For a Brasileirão game of the Vasco that is still to be played: its odds and what each result would change. */
export async function getMatchStakes(eventId: string): Promise<MatchStakes | null> {
  const model = await buildModel();
  if (!model) return null;
  const { entries, fixtures, lam, seed, index, base, n } = model;
  const vi = index.get(VASCO_ID)!;
  const k = fixtures.findIndex((f) => f.id === eventId);
  if (k < 0) return null;
  const f = fixtures[k];
  if (f.home !== vi && f.away !== vi) return null;

  const home = f.home === vi;
  const o = outcome(lam[k].h, lam[k].a);
  const pW = home ? o.w : o.l;
  const pE = o.d;
  const pD = home ? o.l : o.w;
  const now = summarize(base.counts, base.sumPts, n, vi);

  const scenarios: Scenario[] = [];
  for (const key of ["V", "E", "D"] as ScenarioKey[]) {
    const r = simulate(entries, fixtures, lam, seed, { index: k, result: key });
    const sm = summarize(r.counts, r.sumPts, n, vi);
    scenarios.push({ key, prob: key === "V" ? pW : key === "E" ? pE : pD, pG6: sm.pG6, pSula: sm.pSula, pZ4: sm.pZ4, projPts: sm.projPts });
  }
  return {
    sims: SIMS,
    home,
    opponent: entries[home ? f.away : f.home].info,
    pW,
    pE,
    pD,
    now: { pos: vi + 1, pts: entries[vi].pts, pG6: now.pG6, pSula: now.pSula, pZ4: now.pZ4, projPts: now.projPts },
    scenarios,
  };
}
