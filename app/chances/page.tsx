import type { Metadata } from "next";
import Link from "next/link";
import SiteTopBar from "@/components/SiteTopBar";
import SiteFooter from "@/components/home/SiteFooter";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { getChances, type Scenario, type TeamChance } from "@/lib/chances";
import { zoneOf } from "@/lib/competitions";
import { OG_DEFAULTS, OG_IMAGE_DEFAULT, SITE_NAME, absoluteUrl } from "@/lib/site";

// recomputed at most every 10 minutes (the data under it is cached for 10 minutes to an hour)
export const revalidate = 600;

const DESCRIPTION =
  "Estimativas do Vascainamente para o Brasileirão: as chances de Libertadores, Sul-Americana e rebaixamento do Vasco, calculadas com 20 mil simulações do resto do campeonato e atualizadas a cada rodada.";

export const metadata: Metadata = {
  title: "Chances do Vasco no Brasileirão",
  description: DESCRIPTION,
  alternates: { canonical: "/chances" },
  openGraph: { ...OG_DEFAULTS, type: "website", url: "/chances", title: `Chances do Vasco no Brasileirão · ${SITE_NAME}`, description: DESCRIPTION, images: [OG_IMAGE_DEFAULT] },
  twitter: { card: "summary_large_image", title: `Chances do Vasco no Brasileirão · ${SITE_NAME}`, description: DESCRIPTION, images: [OG_IMAGE_DEFAULT.url] },
};

// 0.4% reads as "<1%" and 99.7% as ">99%": a simulation is never exactly sure
const pc = (p: number) => (p === 0 ? "0%" : p < 0.005 ? "<1%" : p >= 0.995 ? ">99%" : `${Math.round(p * 100)}%`);
const delta = (value: number, base: number) => {
  const d = Math.round(value * 100) - Math.round(base * 100);
  return d === 0 ? "igual" : `${d > 0 ? "+" : "−"}${Math.abs(d)}`;
};
const dec = (n: number) => n.toFixed(1).replace(".", ",");

const SCENARIO_LABEL: Record<Scenario["key"], string> = { V: "Se vencer", E: "Se empatar", D: "Se perder" };

function Bar({ t, kind }: { t: TeamChance; kind: "g6" | "sula" | "z4" }) {
  const p = kind === "g6" ? t.pG6 : kind === "sula" ? t.pSula : t.pZ4;
  return (
    <span className={`vm-ch-cell is-${kind}`} style={{ ["--p" as string]: p }}>
      {pc(p)}
    </span>
  );
}

export default async function ChancesPage() {
  const data = await getChances();
  const year = new Date().getFullYear();

  const head = (
    <JsonLd
      data={[
        {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `Chances do Vasco no Brasileirão · ${SITE_NAME}`,
          url: absoluteUrl("/chances"),
          inLanguage: "pt-BR",
          isPartOf: { "@id": absoluteUrl("/#website") },
        },
        breadcrumbSchema([{ name: "Chances do Vasco", path: "/chances" }]),
      ]}
    />
  );

  if (!data) {
    return (
      <main className="relative min-h-screen">
        {head}
        <SiteTopBar />
        <article className="vm-legal">
          <h1 className="vm-legal-title">Chances do Vasco</h1>
          <div className="vm-legal-body">
            <p>Estamos atualizando os números. Volte em alguns minutos.</p>
            <p>
              Enquanto isso, veja a <Link href="/#vm-competicoes">tabela do Brasileirão</Link>.
            </p>
          </div>
        </article>
        <SiteFooter />
      </main>
    );
  }

  const { vasco, teams, games, scenarios, roundsLeft, sims } = data;
  const likely = vasco.dist.indexOf(Math.max(...vasco.dist)) + 1;
  const likelyP = vasco.dist[likely - 1];
  const maxP = Math.max(...vasco.dist);
  const next = games[0];
  const base = { pG6: vasco.pG6, pSula: vasco.pSula, pZ4: vasco.pZ4 };

  return (
    <main className="relative min-h-screen">
      {head}
      <SiteTopBar />
      <article className="vm-ch">
        <header className="vm-ch-head">
          <p className="vm-label vm-ch-kicker">
            Brasileirão {year}
            {roundsLeft > 0 ? ` · ${roundsLeft} ${roundsLeft === 1 ? "rodada" : "rodadas"} para o fim` : " · temporada encerrada"}
          </p>
          <h1 className="vm-ch-title">
            <span>Chances</span>
            <em>do Vasco.</em>
          </h1>
          <p className="vm-ch-lede">
            O Vasco está em {vasco.pos}º, com {vasco.pts} pontos. Simulamos o resto do campeonato {sims.toLocaleString("pt-BR")} vezes
            para ver onde ele termina.
          </p>
          <p className="vm-ch-updated">
            Atualizado em {data.updatedDay} às {data.updatedTime} (Brasília). Estimativas do {SITE_NAME}, não são dados
            oficiais. <Link href="#como-calculamos">Como calculamos</Link>
          </p>
        </header>

        <section className="vm-ch-cards" aria-label="Resumo das chances do Vasco">
          <div className="vm-ch-card">
            <p className="vm-label">Libertadores 2027</p>
            <p className="vm-ch-big">{pc(vasco.pG6)}</p>
            <p className="vm-ch-sub">Até o 6º lugar. Vaga direta (G4): {pc(vasco.pG4)}.</p>
          </div>
          <div className="vm-ch-card">
            <p className="vm-label">Sul-Americana 2027</p>
            <p className="vm-ch-big">{pc(vasco.pSula)}</p>
            <p className="vm-ch-sub">Terminar do 7º ao 12º lugar.</p>
          </div>
          <div className="vm-ch-card is-red">
            <p className="vm-label">Rebaixamento</p>
            <p className="vm-ch-big">{pc(vasco.pZ4)}</p>
            <p className="vm-ch-sub">Terminar do 17º ao 20º lugar.</p>
          </div>
          <div className="vm-ch-card">
            <p className="vm-label">Posição mais provável</p>
            <p className="vm-ch-big">
              {likely}
              <sup>º</sup>
            </p>
            <p className="vm-ch-sub">
              Em {pc(likelyP)} das simulações. Projeção de {dec(vasco.projPts)} pontos.
            </p>
          </div>
        </section>

        <section className="vm-ch-section" aria-labelledby="ch-dist">
          <h2 id="ch-dist" className="vm-ch-h2">Onde o Vasco termina</h2>
          <figure className="vm-ch-dist">
            <div className="vm-ch-bars" role="img" aria-label={`Chance de o Vasco terminar em cada posição. A mais provável é o ${likely}º lugar, com ${pc(likelyP)}.`}>
              {vasco.dist.map((p, i) => (
                <div key={i} className="vm-ch-bar" data-zone={zoneOf(i + 1)}>
                  <span className="vm-ch-bar-pct">{p >= 0.04 ? pc(p) : ""}</span>
                  <i style={{ height: `${maxP > 0 ? Math.max(2, (p / maxP) * 100) : 2}%` }} />
                  <span className="vm-ch-bar-pos">{i + 1}</span>
                </div>
              ))}
            </div>
            <figcaption>
              <ul className="vm-ch-legend">
                <li data-zone="lib"><i aria-hidden="true" />Libertadores (G4)</li>
                <li data-zone="pre"><i aria-hidden="true" />Pré-Libertadores (5º e 6º)</li>
                <li data-zone="sula"><i aria-hidden="true" />Sul-Americana (7º ao 12º)</li>
                <li data-zone="z4"><i aria-hidden="true" />Rebaixamento (Z4)</li>
              </ul>
            </figcaption>
          </figure>
        </section>

        {next && scenarios.length > 0 && (
          <section className="vm-ch-section" aria-labelledby="ch-next">
            <h2 id="ch-next" className="vm-ch-h2">O que muda no próximo jogo</h2>
            <p className="vm-ch-note">
              {next.home ? "Vasco x " : ""}
              {next.opponent.short}
              {next.home ? "" : " x Vasco"}, {next.dayLabel} às {next.timeLabel}. Refizemos a simulação forçando cada resultado.
            </p>
            <div className="vm-ch-tablewrap">
              <table className="vm-ch-scen">
                <caption className="sr-only">Chances do Vasco depois de cada resultado do próximo jogo</caption>
                <thead>
                  <tr>
                    <th scope="col">Resultado</th>
                    <th scope="col" className="n">Chance dele</th>
                    <th scope="col" className="n">Libertadores 2027</th>
                    <th scope="col" className="n">Sul-Americana 2027</th>
                    <th scope="col" className="n">Rebaixamento</th>
                    <th scope="col" className="n opt">Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((s) => (
                    <tr key={s.key}>
                      <th scope="row">{SCENARIO_LABEL[s.key]}</th>
                      <td className="n">{pc(s.prob)}</td>
                      <td className="n">{pc(s.pG6)} <small>({delta(s.pG6, base.pG6)})</small></td>
                      <td className="n">{pc(s.pSula)} <small>({delta(s.pSula, base.pSula)})</small></td>
                      <td className="n is-z4">{pc(s.pZ4)} <small>({delta(s.pZ4, base.pZ4)})</small></td>
                      <td className="n opt">{dec(s.projPts)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="vm-ch-foot">Entre parênteses, a diferença em pontos percentuais em relação à chance de hoje.</p>

            <h3 className="vm-ch-h3">Os próximos jogos</h3>
            <ul className="vm-ch-games">
              {games.map((g) => (
                <li key={g.id}>
                  <span className="vm-ch-game-when">
                    {g.dayLabel} <b>{g.timeLabel}</b>
                  </span>
                  <span className="vm-ch-game-vs">
                    {g.home ? "Vasco x " : ""}
                    {g.opponent.short}
                    {g.home ? "" : " x Vasco"}
                  </span>
                  <span className="vm-ch-wdl" aria-label={`Vitória ${pc(g.pW)}, empate ${pc(g.pE)}, derrota ${pc(g.pD)}`}>
                    <i className="w" style={{ width: `${g.pW * 100}%` }} />
                    <i className="e" style={{ width: `${g.pE * 100}%` }} />
                    <i className="d" style={{ width: `${g.pD * 100}%` }} />
                  </span>
                  <span className="vm-ch-wdl-txt">
                    V {pc(g.pW)} · E {pc(g.pE)} · D {pc(g.pD)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="vm-ch-section" aria-labelledby="ch-all">
          <h2 id="ch-all" className="vm-ch-h2">As chances de todos os times</h2>
          <div className="vm-ch-tablewrap">
            <table className="vm-ch-table">
              <caption className="sr-only">Chances de cada time no Brasileirão</caption>
              <thead>
                <tr>
                  <th scope="col" className="pos">#</th>
                  <th scope="col" className="team">Time</th>
                  <th scope="col" className="n">P</th>
                  <th scope="col" className="n opt">Proj.</th>
                  <th scope="col" className="n">Liberta.</th>
                  <th scope="col" className="n opt">Sul-Am.</th>
                  <th scope="col" className="n">Rebaix.</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <tr key={t.team.name} data-zone={zoneOf(t.pos)} className={t.team.isVasco ? "is-vasco" : undefined} aria-current={t.team.isVasco ? "true" : undefined}>
                    <td className="pos">{t.pos}</td>
                    <td className="team">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={t.team.logo} alt="" width={22} height={22} loading="lazy" decoding="async" className="vm-ch-logo" />
                      <span>{t.team.short}</span>
                    </td>
                    <td className="n">{t.pts}</td>
                    <td className="n opt">{dec(t.projPts)}</td>
                    <td className="n"><Bar t={t} kind="g6" /></td>
                    <td className="n opt"><Bar t={t} kind="sula" /></td>
                    <td className="n"><Bar t={t} kind="z4" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="vm-ch-foot">
            P é a pontuação de hoje e Proj. é a média de pontos no fim do campeonato nas simulações. Liberta. soma G4 e pré-Libertadores (até o 6º).
          </p>
        </section>

        <section id="como-calculamos" className="vm-ch-method" aria-labelledby="ch-method">
          <h2 id="ch-method" className="vm-ch-h2">Como calculamos</h2>
          <div className="vm-legal-body">
            <p>
              Simulamos o resto do Brasileirão {sims.toLocaleString("pt-BR")} vezes. Em cada simulação, cada jogo que
              falta tem o placar sorteado a partir da força de ataque e de defesa dos dois times (gols marcados e
              sofridos na temporada, com um ajuste para o mando de campo). No fim, ordenamos a tabela pelos critérios de
              desempate (pontos, vitórias, saldo de gols e gols pró) e contamos em quantas simulações cada time termina
              em cada posição.
            </p>
            <p>
              Estes números são estimativas feitas pelo {SITE_NAME}. Não são dados oficiais da CBF, da Conmebol nem do
              clube.
            </p>
            <p>
              O resultado é uma probabilidade, não uma previsão. O cálculo não sabe de lesões, suspensões ou escalações,
              e mistura o desempenho de toda a temporada, não só o das últimas rodadas. Por isso os números mudam a cada
              jogo. Uma chance de 16% não quer dizer que vai acontecer: quer dizer que, em cada 100 campeonatos iguais a
              este, acontece em torno de 16.
            </p>
            <p>
              As zonas seguem o padrão do campeonato: G4 e G6 para a Libertadores, 7º ao 12º para a Sul-Americana e 17º
              ao 20º para o rebaixamento, sujeitas à definição final da CBF e da Conmebol. A tabela, os jogos e os placares
              vêm de dados esportivos públicos da ESPN. A conta é nossa e roda a cada atualização da página. Veja também
              como produzimos o resto do site em <Link href="/como-produzimos">Como produzimos as notícias</Link>.
            </p>
          </div>
        </section>
      </article>
      <SiteFooter />
    </main>
  );
}
