import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteTopBar from "@/components/SiteTopBar";
import SiteFooter from "@/components/home/SiteFooter";
import JsonLd from "@/components/JsonLd";
import MatchCountdown from "@/components/match/MatchCountdown";
import { breadcrumbSchema } from "@/lib/schema";
import { getMatchPage, getMatchRefs, type FormGame, type KeyPlay, type MatchPage, type RosterPlayer } from "@/lib/match";
import type { Scenario } from "@/lib/chances";
import type { MatchInfo, TeamInfo } from "@/lib/competitions";
import { formatDateShort } from "@/lib/time";
import { OG_DEFAULTS, OG_IMAGE_DEFAULT, SITE_NAME, absoluteUrl } from "@/lib/site";

// the same address goes from "before" to "live" to "after": refreshed every minute, rendered on demand
export const revalidate = 60;
export const dynamicParams = true;

// No page is built at deploy time: dozens of simultaneous requests make the data source fail and a thin
// page would be saved. Each one is rendered on its first visit and then refreshed every minute. If the source
// is down, the page is just the header and a notice, and it is cached like any other for at most a minute,
// so a spike of visits never becomes a spike of queries.
export async function generateStaticParams() {
  return [];
}

const DAY = (iso: string) => {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso)).split("-");
  return `${d}/${m}/${y}`;
};

function title(m: MatchInfo, comp: string): string {
  if (m.state === "post") return `${m.home.short} ${m.homeScore} x ${m.awayScore} ${m.away.short}: ${comp}, ${DAY(m.iso).slice(0, 5)}`;
  return `${m.home.short} x ${m.away.short}: ${comp}, ${DAY(m.iso).slice(0, 5)}`;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const refs = await getMatchRefs();
  const ref = refs.find((r) => r.slug === params.slug);
  if (!ref) return { title: "Jogo", robots: { index: false } };
  const m = ref.match;
  const t = title(m, ref.competitionShort);
  const where = m.venue ? `, ${m.venue}` : "";
  const description =
    m.state === "post"
      ? `${m.home.name} ${m.homeScore} x ${m.awayScore} ${m.away.name}, ${ref.competition}${m.phase && m.phase !== "Pontos corridos" ? `, ${m.phase.toLowerCase()}` : ""}. Lances, estatísticas e escalações, com dados públicos e o que o resultado significa para o Vasco.`
      : `${m.home.name} x ${m.away.name}, ${ref.competition}, ${m.dayLabel} às ${m.timeLabel}${where}. O que está em jogo, histórico de confrontos e o momento dos dois times, com dados públicos e estimativas do ${SITE_NAME}.`;
  return {
    title: t,
    description,
    alternates: { canonical: `/jogo/${ref.slug}` },
    openGraph: { ...OG_DEFAULTS, type: "article", url: `/jogo/${ref.slug}`, title: `${t} · ${SITE_NAME}`, description, images: [OG_IMAGE_DEFAULT] },
    twitter: { card: "summary_large_image", title: `${t} · ${SITE_NAME}`, description, images: [OG_IMAGE_DEFAULT.url] },
  };
}

// ---------- small helpers ----------

const pc = (p: number) => (p === 0 ? "0%" : p < 0.005 ? "<1%" : p >= 0.995 ? ">99%" : `${Math.round(p * 100)}%`);
const delta = (value: number, base: number) => {
  const d = Math.round(value * 100) - Math.round(base * 100);
  return d === 0 ? "igual" : `${d > 0 ? "+" : "−"}${Math.abs(d)}`;
};

function Crest({ team, size }: { team: TeamInfo; size: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={team.logo} alt="" width={size} height={size} className="vm-mj-crest" style={{ width: size, height: size }} />
  );
}

function Seal({ children }: { children: React.ReactNode }) {
  return <span className="vm-mj-seal">{children}</span>;
}

function FormList({ games, name }: { games: FormGame[]; name: string }) {
  if (games.length === 0) return <p className="vm-mj-empty">Sem jogos recentes nos dados.</p>;
  return (
    <>
      <span className="vm-comp-form" aria-label={`Últimos ${games.length} jogos do ${name}`}>
        {[...games].reverse().map((g, i) => (
          <b key={i} className={`r${g.result}`}>
            {g.result}
          </b>
        ))}
      </span>
      <ul className="vm-mj-form">
        {games.map((g, i) => (
          <li key={i}>
            <span className={`vm-mj-r r${g.result}`}>{g.result}</span>
            <span className="vm-mj-form-vs">
              {g.home ? "" : "em "}
              {g.opponent}
            </span>
            <span className="vm-mj-form-score">
              {g.own ?? "?"} x {g.other ?? "?"}
            </span>
            <span className="vm-mj-form-meta">
              {g.competition}, {g.dayLabel}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

const PLAY_LABEL: Record<KeyPlay["kind"], string> = {
  goal: "Gol",
  pen: "Gol de pênalti",
  own: "Gol contra",
  yellow: "Amarelo",
  red: "Vermelho",
  sub: "Troca",
};

function playText(p: KeyPlay): string {
  if (p.kind === "sub") return `Entra ${p.player}, sai ${p.other} (${p.team})`;
  if (p.kind === "yellow" || p.kind === "red") return `${p.player} (${p.team})`;
  return `${p.player} (${p.team})${p.other ? `, assistência de ${p.other}` : ""}`;
}

function LineupCard({
  heading,
  seal,
  formation,
  coach,
  starters,
  bench,
}: {
  heading: string;
  seal: React.ReactNode;
  formation: string | null;
  coach?: string | null;
  starters: { name: string; jersey?: string; position?: string }[];
  bench: { name: string; jersey?: string }[];
}) {
  return (
    <div className="vm-mj-lineup">
      <h3 className="vm-ch-h3">
        {heading}
        {formation ? ` · ${formation}` : ""}
      </h3>
      <p className="vm-mj-seals">{seal}</p>
      <ol className="vm-mj-xi">
        {starters.map((p, i) => (
          <li key={i}>
            <span className="n">{p.jersey ?? ""}</span>
            <span>{p.name}</span>
            {p.position && <small>{p.position}</small>}
          </li>
        ))}
      </ol>
      {bench.length > 0 && (
        <p className="vm-mj-bench">
          <b>Banco:</b> {bench.map((p) => p.name).join(", ")}.
        </p>
      )}
      {coach && (
        <p className="vm-mj-bench">
          <b>Técnico:</b> {coach}.
        </p>
      )}
    </div>
  );
}

function ScenarioTable({ scenarios, now }: { scenarios: Scenario[]; now: { pG6: number; pSula: number; pZ4: number } }) {
  const label = { V: "Se vencer", E: "Se empatar", D: "Se perder" } as const;
  return (
    <div className="vm-ch-tablewrap">
      <table className="vm-ch-scen">
        <caption className="sr-only">Chances do Vasco depois de cada resultado deste jogo</caption>
        <thead>
          <tr>
            <th scope="col">Resultado</th>
            <th scope="col" className="n">Chance dele</th>
            <th scope="col" className="n">Libertadores</th>
            <th scope="col" className="n">Sul-Americana</th>
            <th scope="col" className="n">Rebaixamento</th>
          </tr>
        </thead>
        <tbody>
          {scenarios.map((s) => (
            <tr key={s.key}>
              <th scope="row">{label[s.key]}</th>
              <td className="n">{pc(s.prob)}</td>
              <td className="n">{pc(s.pG6)} <small>({delta(s.pG6, now.pG6)})</small></td>
              <td className="n">{pc(s.pSula)} <small>({delta(s.pSula, now.pSula)})</small></td>
              <td className="n is-z4">{pc(s.pZ4)} <small>({delta(s.pZ4, now.pZ4)})</small></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// the metric the game moves the most becomes the headline
function headline(scenarios: Scenario[], now: { pG6: number; pSula: number; pZ4: number }) {
  const v = scenarios.find((s) => s.key === "V");
  const d = scenarios.find((s) => s.key === "D");
  if (!v || !d) return null;
  const options = [
    { label: "Rebaixamento", now: now.pZ4, v: v.pZ4, d: d.pZ4 },
    { label: "Sul-Americana", now: now.pSula, v: v.pSula, d: d.pSula },
    { label: "Libertadores", now: now.pG6, v: v.pG6, d: d.pG6 },
  ];
  return options.sort((a, b) => Math.abs(b.v - b.d) - Math.abs(a.v - a.d))[0];
}

// ---------- the page ----------

export default async function MatchPageRoute({ params }: { params: { slug: string } }) {
  const page = await getMatchPage(params.slug);
  if (!page) notFound();
  const { ref, stakes, tie, h2h, form, plays, stats, rosters, rows, related, officialLineup, chancesNow } = page;
  const m = ref.match;
  const live = m.state === "in";
  const done = m.state === "post";
  const vascoHome = m.home.isVasco;
  const opp = vascoHome ? m.away : m.home;
  const phase = m.phase && m.phase !== "Pontos corridos" ? m.phase : "";
  const leg = m.leg === 1 ? "Jogo de ida" : m.leg === 2 ? "Jogo de volta" : "";
  const kicker = [ref.competition, phase, leg].filter(Boolean).join(" · ");

  const espnVasco = rosters.find((r) => r.isVasco);
  const espnOpp = rosters.find((r) => !r.isVasco);
  const hasLineups = !!officialLineup || !!espnVasco || !!espnOpp;
  const head = stakes ? headline(stakes.scenarios, stakes.now) : null;
  const vScen = stakes?.scenarios.find((s) => s.key === "V");
  const dScen = stakes?.scenarios.find((s) => s.key === "D");

  // the other leg of a tie, for the "what is at stake" block of the cups
  let tieText = "";
  if (tie) {
    const o = tie.other;
    if (m.leg === 1 && o) tieText = `Jogo de ida da fase "${tie.phase}". A volta será em ${o.dayLabel} às ${o.timeLabel}${o.venue ? `, ${o.venue}` : ""}.`;
    else if (m.leg === 2 && o && o.state === "post" && o.homeScore !== null && o.awayScore !== null)
      tieText = `Jogo de volta da fase "${tie.phase}". Na ida, ${o.home.short} ${o.homeScore} x ${o.awayScore} ${o.away.short}.`;
    else if (phase) tieText = `Fase: ${phase.toLowerCase()}.`;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${m.home.name} x ${m.away.name}`,
    sport: "Soccer",
    startDate: m.iso,
    eventStatus: "https://schema.org/EventScheduled",
    url: absoluteUrl(`/jogo/${ref.slug}`),
    inLanguage: "pt-BR",
    ...(m.venue ? { location: { "@type": "Place", name: m.venue } } : {}),
    homeTeam: { "@type": "SportsTeam", name: m.home.name },
    awayTeam: { "@type": "SportsTeam", name: m.away.name },
  };

  const headerEl = (
        <header className="vm-mj-head">
          <p className="vm-label vm-mj-kicker">{kicker}</p>
          <h1 className="vm-mj-teams">
            <span className={`vm-mj-team${m.home.isVasco ? " is-vasco" : ""}`}>
              <Crest team={m.home} size={72} />
              <span>{m.home.short}</span>
            </span>
            <span className="vm-mj-mid">
              {done || live ? (
                <span className="vm-mj-score">
                  {m.homeScore ?? 0}
                  <i>x</i>
                  {m.awayScore ?? 0}
                </span>
              ) : (
                <i className="vm-mj-x">x</i>
              )}
            </span>
            <span className={`vm-mj-team${m.away.isVasco ? " is-vasco" : ""}`}>
              <Crest team={m.away} size={72} />
              <span>{m.away.short}</span>
            </span>
          </h1>
          <div className="vm-mj-meta">
            <p className={live ? "is-live" : undefined}>
              {live ? `Ao vivo${m.clock ? `, ${m.clock}` : ""}` : done ? "Encerrado" : "Próximo jogo"}
            </p>
            <time dateTime={m.iso}>
              {m.dayLabel}, {m.timeLabel} (Brasília)
            </time>
            {m.venue && <p>{m.venue}</p>}
            {!done && !live && <MatchCountdown iso={m.iso} />}
            {done && m.note && <p className="vm-mj-note">{m.note}</p>}
          </div>
        </header>
  );

  const side = (t: TeamInfo, row: MatchPage["rows"]["home"], games: FormGame[]) => (
    <div className="vm-mj-side">
      <div className="vm-mj-side-head">
        <Crest team={t} size={34} />
        <span>{t.short}</span>
      </div>
      {row && (
        <p className="vm-mj-table">
          {row.pos}º na tabela, {row.pts} pontos em {row.j} jogos, saldo {row.sg}.
        </p>
      )}
      <FormList games={games} name={t.short} />
    </div>
  );

  if (!page.hasSummary) {
    return (
      <main className="relative min-h-screen">
        <JsonLd data={[jsonLd, breadcrumbSchema([{ name: "Jogos", path: "/jogos" }, { name: `${m.home.short} x ${m.away.short}`, path: `/jogo/${ref.slug}` }])]} />
        <SiteTopBar />
        <article className="vm-mj">
          {headerEl}
          <p className="vm-mj-empty vm-mj-warn">
            Os dados deste jogo não chegaram da fonte agora. Para não mostrar números errados, a página completa volta em instantes. <Link href="/jogos">Ver todos os jogos</Link>.
          </p>
        </article>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen">
      <JsonLd data={[jsonLd, breadcrumbSchema([{ name: "Jogos", path: "/jogos" }, { name: `${m.home.short} x ${m.away.short}`, path: `/jogo/${ref.slug}` }])]} />
      <SiteTopBar />
      <article className="vm-mj">
        {headerEl}

        {/* what is at stake: the content only this site has */}
        {stakes && head && vScen && dScen && !done && (
          <section className="vm-mj-stakes" aria-labelledby="mj-stakes">
            <p className="vm-label vm-mj-stakes-label">
              O que está em jogo <Seal>Estimativa do {SITE_NAME}</Seal>
            </p>
            <h2 id="mj-stakes" className="vm-mj-stakes-title">
              {head.label}: {pc(head.now)} hoje. Com vitória, {pc(head.v)}. Com derrota, {pc(head.d)}.
            </h2>
            <p className="vm-mj-stakes-sub">
              O Vasco está em {stakes.now.pos}º, com {stakes.now.pts} pontos. Jogando {stakes.home ? "em casa" : "fora de casa"}, a chance de vitória neste jogo é de{" "}
              {pc(stakes.pW)}, a de empate é de {pc(stakes.pE)} e a de derrota é de {pc(stakes.pD)}.
            </p>
            <span className="vm-ch-wdl vm-mj-wdl" aria-label={`Vitória ${pc(stakes.pW)}, empate ${pc(stakes.pE)}, derrota ${pc(stakes.pD)}`}>
              <i className="w" style={{ width: `${stakes.pW * 100}%` }} />
              <i className="e" style={{ width: `${stakes.pE * 100}%` }} />
              <i className="d" style={{ width: `${stakes.pD * 100}%` }} />
            </span>
            <ScenarioTable scenarios={stakes.scenarios} now={stakes.now} />
            <p className="vm-ch-foot">
              Entre parênteses, a diferença em pontos percentuais em relação à chance de hoje. Estimativas do {SITE_NAME} com base na tabela e nos gols da temporada,
              não são dados oficiais. <Link href="/chances#como-calculamos">Como calculamos</Link>.
            </p>
          </section>
        )}

        {tieText && !done && (
          <section className="vm-mj-stakes" aria-labelledby="mj-tie">
            <p className="vm-label vm-mj-stakes-label">
              O que está em jogo <Seal>Dados públicos da ESPN</Seal>
            </p>
            <h2 id="mj-tie" className="vm-mj-stakes-title">{tieText}</h2>
          </section>
        )}

        {done && (chancesNow || (tie && tie.other)) && (
          <section className="vm-mj-stakes" aria-labelledby="mj-after">
            <p className="vm-label vm-mj-stakes-label">
              {chancesNow ? "Na tabela hoje" : "Depois do jogo"} <Seal>{chancesNow ? `Estimativa do ${SITE_NAME}` : "Dados públicos da ESPN"}</Seal>
            </p>
            {chancesNow && (
              <>
                <h2 id="mj-after" className="vm-mj-stakes-title">
                  Hoje, o Vasco está em {chancesNow.vasco.pos}º, com {chancesNow.vasco.pts} pontos.
                </h2>
                <p className="vm-mj-stakes-sub">
                  As chances de hoje: Sul-Americana {pc(chancesNow.vasco.pSula)}, rebaixamento {pc(chancesNow.vasco.pZ4)}. Estimativas do {SITE_NAME}, não são dados oficiais.{" "}
                  <Link href="/chances">Ver todas as chances do Vasco</Link>.
                </p>
              </>
            )}
            {!chancesNow && tie?.other && (
              <h2 id="mj-after" className="vm-mj-stakes-title">
                {tie.leg === 2 ? "Jogo de volta" : "Jogo de ida"}: {m.home.short} {m.homeScore} x {m.awayScore} {m.away.short}.
              </h2>
            )}
          </section>
        )}

        {(done || live) && plays.length > 0 && (
          <section className="vm-mj-section" aria-labelledby="mj-plays">
            <h2 id="mj-plays" className="vm-ch-h2">Lances do jogo</h2>
            <p className="vm-ch-foot"><Seal>Dados públicos da ESPN</Seal></p>
            <ol className="vm-mj-timeline">
              {plays.map((p, i) => (
                <li key={i} className={p.isVasco ? "is-vasco" : undefined}>
                  <span className="min">{p.minute}</span>
                  <span className={`kind k-${p.kind}`}>{PLAY_LABEL[p.kind]}</span>
                  <span className="txt">{playText(p)}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="vm-mj-section" aria-labelledby="mj-form">
          <h2 id="mj-form" className="vm-ch-h2">{done ? "Como chegaram" : "Como chegam"}</h2>
          <p className="vm-ch-foot"><Seal>Dados públicos da ESPN</Seal></p>
          <div className="vm-mj-grid2">
            {side(m.home, rows.home, form.home)}
            {side(m.away, rows.away, form.away)}
          </div>
        </section>

        {h2h && (
          <section className="vm-mj-section" aria-labelledby="mj-h2h">
            <h2 id="mj-h2h" className="vm-ch-h2">Histórico de confrontos</h2>
            <p className="vm-ch-foot"><Seal>Dados públicos da ESPN</Seal></p>
            <p className="vm-mj-h2h-sum">
              Nos últimos {h2h.games.length} jogos entre os dois, o Vasco venceu {h2h.wins}, empatou {h2h.draws} e perdeu {h2h.losses}.
            </p>
            <ul className="vm-mj-h2h">
              {h2h.games.map((g, i) => (
                <li key={i}>
                  <span className="d">{g.date}</span>
                  <span className="c">{g.competition}</span>
                  <span className="s">
                    {g.home} {g.homeScore} x {g.awayScore} {g.away}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(done || live) && stats.length > 0 && (
          <section className="vm-mj-section" aria-labelledby="mj-stats">
            <h2 id="mj-stats" className="vm-ch-h2">Estatísticas</h2>
            <p className="vm-ch-foot"><Seal>Dados públicos da ESPN</Seal></p>
            <ul className="vm-mj-stats">
              {stats.map((s) => {
                const total = s.homeValue + s.awayValue;
                const hp = total > 0 ? (s.homeValue / total) * 100 : 50;
                return (
                  <li key={s.label}>
                    <span className="v">{s.home}</span>
                    <span className="l">{s.label}</span>
                    <span className="v">{s.away}</span>
                    <span className="bar" aria-hidden="true">
                      <i style={{ width: `${hp}%` }} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="vm-mj-section" aria-labelledby="mj-lineups">
          <h2 id="mj-lineups" className="vm-ch-h2">Escalações</h2>
          {hasLineups ? (
            <div className="vm-mj-grid2">
              {(() => {
                const v = officialLineup ? (
                  <LineupCard
                    key="v"
                    heading="Vasco"
                    formation={officialLineup.lineup.formation}
                    coach={officialLineup.lineup.coach}
                    seal={
                      <>
                        <Seal>Perfil oficial do Vasco no X, {officialLineup.dayLabel} às {officialLineup.timeLabel}</Seal>{" "}
                        <Link href={`/${officialLineup.slug}`}>Ver a matéria</Link>
                        {officialLineup.sourceUrl && (
                          <>
                            {" · "}
                            <a href={officialLineup.sourceUrl} target="_blank" rel="noopener noreferrer">Ver o post</a>
                          </>
                        )}
                      </>
                    }
                    starters={officialLineup.lineup.starters.map((name) => ({ name }))}
                    bench={officialLineup.lineup.bench.map((name) => ({ name }))}
                  />
                ) : espnVasco ? (
                  <LineupCard key="v" heading="Vasco" formation={espnVasco.formation} seal={<Seal>Dados públicos da ESPN</Seal>} starters={espnVasco.starters as RosterPlayer[]} bench={espnVasco.bench} />
                ) : null;
                const o = espnOpp ? (
                  <LineupCard key="o" heading={opp.short} formation={espnOpp.formation} seal={<Seal>Dados públicos da ESPN</Seal>} starters={espnOpp.starters} bench={espnOpp.bench} />
                ) : null;
                return vascoHome ? [v, o] : [o, v];
              })()}
            </div>
          ) : (
            !done && <p className="vm-mj-empty">A escalação oficial aparece aqui quando for divulgada.</p>
          )}
        </section>

        {related.length > 0 && (
          <section className="vm-mj-section" aria-labelledby="mj-related">
            <h2 id="mj-related" className="vm-ch-h2">No Vascainamente</h2>
            <ul className="vm-mj-related">
              {related.map((p) => (
                <li key={p.slug}>
                  <Link href={`/${p.slug}`}>{p.title}</Link>
                  <span>
                    {p.source}, {formatDateShort(p.date)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="vm-mj-foot">
          Fontes: dados públicos da ESPN e, onde indicado, o perfil oficial do Vasco no X e estimativas do {SITE_NAME}. Se algo estiver errado, veja{" "}
          <Link href="/correcoes">Correções</Link>. <Link href="/jogos">Todos os jogos</Link> · <Link href="/chances">Chances do Vasco</Link>
        </p>
      </article>
      <SiteFooter />
    </main>
  );
}
