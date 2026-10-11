"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { CompetitionInfo, CompetitionsData, MatchInfo, TableRow, TeamInfo } from "@/lib/competitions";
import { cn } from "@/lib/utils";

// Every competition the Vasco is playing, with the league table. The data is read on the server and
// arrives formatted; only the tabs and the countdown run in the browser.

function Logo({ team, size = 28 }: { team: TeamInfo; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={team.logo}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="vm-comp-logo"
      style={{ width: size, height: size }}
      onError={(e) => {
        e.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}

function countdownOf(iso: string, now: number): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "Começando";
  const min = Math.floor(ms / 60000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}min`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min`;
  return `${m}min`;
}

const legLabel = (leg: number | null) => (leg === 1 ? "Jogo de ida" : leg === 2 ? "Jogo de volta" : "");

// ---------- next match ----------

function NextMatch({ match, competition }: { match: MatchInfo; competition: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const live = match.state === "in";
  const sub = [competition, match.phase !== "Pontos corridos" ? match.phase : "", legLabel(match.leg)].filter(Boolean).join(" · ");

  return (
    <article className="vm-comp-next" aria-label="Próximo jogo do Vasco">
      <div className="vm-comp-next-meta">
        <p className={cn("vm-label vm-comp-next-label", live && "is-live")}>
          {live && <span className="vm-comp-dot" aria-hidden="true" />}
          {live ? "Ao vivo" : "Próximo jogo"}
        </p>
        <p className="vm-comp-next-sub">{sub}</p>
        <time className="vm-comp-next-when" dateTime={match.iso}>
          <strong>{match.dayLabel}</strong>
          <span>{match.timeLabel}</span>
        </time>
        {match.venue && <p className="vm-comp-next-venue">{match.venue}</p>}
      </div>

      <div className="vm-comp-next-teams">
        <div className={cn("vm-comp-next-team", match.home.isVasco && "is-vasco")}>
          <Logo team={match.home} size={64} />
          <span>{match.home.short}</span>
        </div>
        {live ? (
          <p className="vm-comp-next-score">
            {match.homeScore ?? 0}
            <i>x</i>
            {match.awayScore ?? 0}
          </p>
        ) : (
          <p className="vm-comp-next-x">x</p>
        )}
        <div className={cn("vm-comp-next-team", match.away.isVasco && "is-vasco")}>
          <Logo team={match.away} size={64} />
          <span>{match.away.short}</span>
        </div>
      </div>

      <div className="vm-comp-countdown">
        {live ? (
          <>
            <span className="vm-label">Tempo de jogo</span>
            <strong>{match.clock || "Em andamento"}</strong>
          </>
        ) : (
          <>
            <span className="vm-label">Faltam</span>
            <strong>{now === null ? " " : countdownOf(match.iso, now)}</strong>
          </>
        )}
      </div>
    </article>
  );
}

// ---------- the league ----------

const ZONES: { zone: TableRow["zone"]; label: string }[] = [
  { zone: "lib", label: "Libertadores (G4)" },
  { zone: "pre", label: "Pré-Libertadores (5º e 6º)" },
  { zone: "sula", label: "Sul-Americana (7º ao 12º)" },
  { zone: "z4", label: "Rebaixamento (Z4)" },
];

function LeaguePanel({ data, fixtures }: { data: NonNullable<CompetitionsData["table"]>; fixtures: MatchInfo[] }) {
  const { vasco, rows, form, insights } = data;
  return (
    <div className="vm-comp-league">
      <aside className="vm-comp-me">
        <p className="vm-label vm-comp-sub">Posição do Vasco</p>
        <p className="vm-comp-pos" aria-label={`${vasco.pos}º lugar`}>
          {vasco.pos}
          <sup>º</sup>
        </p>
        <dl className="vm-comp-mini">
          {[
            ["Pontos", vasco.pts],
            ["Jogos", vasco.j],
            ["Vitórias", vasco.v],
            ["Empates", vasco.e],
            ["Derrotas", vasco.d],
            ["Saldo", vasco.sg],
          ].map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        {form.length > 0 && (
          <div className="vm-comp-formrow">
            <span className="vm-label vm-comp-sub">Últimos 5</span>
            <span className="vm-comp-form">
              {form.map((r, i) => (
                <b key={i} className={`r${r}`} title={r === "V" ? "Vitória" : r === "E" ? "Empate" : "Derrota"}>
                  {r}
                </b>
              ))}
            </span>
          </div>
        )}

        <ul className="vm-comp-insights">
          {insights.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>

        {fixtures.length > 0 && (
          <div className="vm-comp-upnext">
            <p className="vm-label vm-comp-sub">Próximos jogos</p>
            <ul>
              {fixtures.slice(0, 3).map((m) => (
                <li key={m.id}>
                  <time dateTime={m.iso}>
                    {m.dayLabel} <span>{m.timeLabel}</span>
                  </time>
                  <span className="vm-comp-upnext-teams">
                    {m.home.short} x {m.away.short}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      <div className="vm-comp-tablewrap">
        <table className="vm-comp-table">
          <caption className="sr-only">Classificação do Campeonato Brasileiro, Série A</caption>
          <thead>
            <tr>
              <th scope="col" className="c-pos">#</th>
              <th scope="col" className="c-team">Time</th>
              <th scope="col" className="c-n c-pts">P</th>
              <th scope="col" className="c-n">J</th>
              <th scope="col" className="c-n c-opt">V</th>
              <th scope="col" className="c-n c-opt">E</th>
              <th scope="col" className="c-n c-opt">D</th>
              <th scope="col" className="c-n">SG</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.pos} data-zone={r.zone} className={r.team.isVasco ? "is-vasco" : undefined} aria-current={r.team.isVasco ? "true" : undefined}>
                <td className="c-pos">{r.pos}</td>
                <td className="c-team">
                  <Logo team={r.team} size={22} />
                  <span>{r.team.short}</span>
                </td>
                <td className="c-n c-pts">{r.pts}</td>
                <td className="c-n">{r.j}</td>
                <td className="c-n c-opt">{r.v}</td>
                <td className="c-n c-opt">{r.e}</td>
                <td className="c-n c-opt">{r.d}</td>
                <td className="c-n">{r.sg}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="vm-comp-legend">
          {ZONES.map((z) => (
            <li key={z.zone} data-zone={z.zone}>
              <i aria-hidden="true" />
              {z.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------- cups ----------

function MatchRow({ m }: { m: MatchInfo }) {
  const finished = m.state === "post";
  return (
    <li className="vm-comp-match">
      <time dateTime={m.iso} className="vm-comp-match-when">
        {m.dayLabel}
      </time>
      <span className={cn("vm-comp-match-team is-home", m.home.isVasco && "is-vasco")}>
        <span>{m.home.short}</span>
        <Logo team={m.home} size={22} />
      </span>
      <span className="vm-comp-match-score">
        {finished || m.state === "in" ? (
          <>
            {m.homeScore ?? 0}
            <i>x</i>
            {m.awayScore ?? 0}
          </>
        ) : (
          <>
            <i>x</i>
          </>
        )}
      </span>
      <span className={cn("vm-comp-match-team", m.away.isVasco && "is-vasco")}>
        <Logo team={m.away} size={22} />
        <span>{m.away.short}</span>
      </span>
      {m.result ? (
        <b className={`vm-comp-chip r${m.result}`} title={m.result === "V" ? "Vitória" : m.result === "E" ? "Empate" : "Derrota"}>
          {m.result}
        </b>
      ) : (
        <span />
      )}
      {m.note && <p className="vm-comp-match-note">{m.note}</p>}
    </li>
  );
}

function CupPanel({ c }: { c: CompetitionInfo }) {
  // campaign phases from the first game to the latest
  const chronological = [...c.results].sort((a, b) => a.iso.localeCompare(b.iso));
  const phases: { name: string; matches: MatchInfo[] }[] = [];
  for (const m of chronological) {
    const last = phases[phases.length - 1];
    if (last && last.name === m.phase) last.matches.push(m);
    else phases.push({ name: m.phase, matches: [m] });
  }
  phases.reverse(); // latest phase on top; inside a phase the games stay in order

  return (
    <div className="vm-comp-cup">
      <div className="vm-comp-cup-now">
        {c.active ? (
          <>
            <p className="vm-label vm-comp-sub">{c.fixtures[0].state === "in" ? "Em andamento" : "Próxima fase"}</p>
            <h3 className="vm-comp-phase">{c.fixtures[0].phase}</h3>
            <ul className="vm-comp-legs">
              {c.fixtures.slice(0, 3).map((m) => (
                <li key={m.id}>
                  {legLabel(m.leg) && <p className="vm-label">{legLabel(m.leg)}</p>}
                  <time dateTime={m.iso}>
                    <strong>{m.dayLabel}</strong> {m.timeLabel}
                  </time>
                  <p className="vm-comp-legs-teams">
                    <span className={cn(m.home.isVasco && "is-vasco")}>
                      <Logo team={m.home} size={24} />
                      {m.home.short}
                    </span>
                    <i>x</i>
                    <span className={cn(m.away.isVasco && "is-vasco")}>
                      <Logo team={m.away} size={24} />
                      {m.away.short}
                    </span>
                  </p>
                  {m.venue && <p className="vm-comp-legs-venue">{m.venue}</p>}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="vm-label vm-comp-sub">Campanha encerrada</p>
            <h3 className="vm-comp-phase">{c.outcome || "Encerrado"}</h3>
            {c.outcomeAt && <p className="vm-comp-phase-at">{c.outcomeAt}</p>}
          </>
        )}
      </div>

      <div className="vm-comp-path">
        <p className="vm-label vm-comp-sub">A campanha</p>
        {phases.length === 0 && <p className="vm-comp-empty">Ainda não há jogos disputados.</p>}
        <ol>
          {phases.map((p) => (
            <li key={p.name} className="vm-comp-phaseblock">
              <h4>{p.name}</h4>
              <ul>
                {p.matches.map((m) => (
                  <MatchRow key={m.id} m={m} />
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ---------- the section ----------

export default function Competitions({ data }: { data: CompetitionsData }) {
  const { competitions, table, next, season, updatedLabel } = data;
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = competitions.length;
    let to = -1;
    if (e.key === "ArrowRight") to = (active + 1) % n;
    else if (e.key === "ArrowLeft") to = (active - 1 + n) % n;
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = n - 1;
    if (to < 0) return;
    e.preventDefault();
    setActive(to);
    tabRefs.current[to]?.focus();
  };

  const liveNow = competitions.some((c) => c.fixtures.some((m) => m.state === "in"));
  const current = competitions[active];
  const activeCount = competitions.filter((c) => c.active).length;

  return (
    <section id="vm-competicoes" className="vm-comp" aria-label="Competições do Vasco">
      <div className="vm-comp-wrap">
        <header className="vm-comp-head">
          <p className="vm-label vm-comp-kicker">Competições</p>
          <h2 className="vm-comp-title">
            <span>{activeCount > 1 ? `O Vasco em ${activeCount} frentes` : "Onde o Vasco joga"}</span>
            <em>temporada {season}.</em>
          </h2>
          <p className="vm-comp-updated">
            <span className={cn("vm-comp-dot", liveNow && "is-live")} aria-hidden="true" />
            Atualizado às {updatedLabel} (Brasília). Tabela e jogos se atualizam sozinhos. Dados: ESPN.
          </p>
        </header>

        {next && <NextMatch match={next} competition={next.competition} />}

        <div className="vm-comp-tabs" role="tablist" aria-label="Competições" onKeyDown={onKey}>
          {competitions.map((c, i) => (
            <button
              key={c.slug}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`vm-comp-tab-${c.slug}`}
              aria-selected={i === active}
              aria-controls={`vm-comp-panel-${c.slug}`}
              tabIndex={i === active ? 0 : -1}
              className={cn("vm-comp-tab", !c.active && "is-over")}
              onClick={() => setActive(i)}
            >
              <span className="vm-comp-tab-name">{c.short}</span>
              <span className="vm-comp-tab-badge">{c.badge}</span>
            </button>
          ))}
        </div>

        <div
          key={current.slug}
          role="tabpanel"
          id={`vm-comp-panel-${current.slug}`}
          aria-labelledby={`vm-comp-tab-${current.slug}`}
          className="vm-comp-panel"
        >
          <h3 className="sr-only">{current.name}</h3>
          {current.slug === "bra.1" && table ? <LeaguePanel data={table} fixtures={current.fixtures} /> : <CupPanel c={current} />}
        </div>
      </div>
    </section>
  );
}
