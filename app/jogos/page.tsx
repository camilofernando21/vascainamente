import type { Metadata } from "next";
import Link from "next/link";
import SiteTopBar from "@/components/SiteTopBar";
import SiteFooter from "@/components/home/SiteFooter";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { getMatchRefs, type MatchRef } from "@/lib/match";
import { OG_DEFAULTS, OG_IMAGE_DEFAULT, SITE_NAME, absoluteUrl } from "@/lib/site";

export const revalidate = 300;

const DESCRIPTION =
  "Os próximos jogos e os resultados do Vasco em todas as competições: Brasileirão, Sul-Americana e Copa do Brasil, com a página de cada partida.";

export const metadata: Metadata = {
  title: "Jogos do Vasco: calendário e resultados",
  description: DESCRIPTION,
  alternates: { canonical: "/jogos" },
  openGraph: { ...OG_DEFAULTS, type: "website", url: "/jogos", title: `Jogos do Vasco · ${SITE_NAME}`, description: DESCRIPTION, images: [OG_IMAGE_DEFAULT] },
  twitter: { card: "summary_large_image", title: `Jogos do Vasco · ${SITE_NAME}`, description: DESCRIPTION, images: [OG_IMAGE_DEFAULT.url] },
};

function Row({ r }: { r: MatchRef }) {
  const m = r.match;
  const played = m.state === "post" || m.state === "in";
  return (
    <li>
      <Link href={`/jogo/${r.slug}`} className="vm-mjs-row">
        <span className="when">
          {m.dayLabel}
          <b>{m.timeLabel}</b>
        </span>
        <span className="comp">
          {r.competitionShort}
          {m.phase && m.phase !== "Pontos corridos" ? `, ${m.phase.toLowerCase()}` : ""}
        </span>
        <span className="vs">
          <span className={m.home.isVasco ? "is-vasco" : undefined}>{m.home.short}</span>
          <i>{played ? `${m.homeScore ?? 0} x ${m.awayScore ?? 0}` : "x"}</i>
          <span className={m.away.isVasco ? "is-vasco" : undefined}>{m.away.short}</span>
        </span>
        {m.result ? <b className={`vm-comp-chip r${m.result}`}>{m.result}</b> : m.state === "in" ? <b className="live">Ao vivo</b> : <span />}
      </Link>
    </li>
  );
}

export default async function GamesPage() {
  const refs = await getMatchRefs();
  const upcoming = refs.filter((r) => r.match.state !== "post");
  const results = refs.filter((r) => r.match.state === "post").sort((a, b) => b.match.iso.localeCompare(a.match.iso)).slice(0, 24);

  return (
    <main className="relative min-h-screen">
      <JsonLd
        data={[
          { "@context": "https://schema.org", "@type": "CollectionPage", name: `Jogos do Vasco · ${SITE_NAME}`, url: absoluteUrl("/jogos"), inLanguage: "pt-BR", isPartOf: { "@id": absoluteUrl("/#website") } },
          breadcrumbSchema([{ name: "Jogos", path: "/jogos" }]),
        ]}
      />
      <SiteTopBar />
      <article className="vm-mjs">
        <header>
          <p className="vm-label vm-ch-kicker">Todas as competições</p>
          <h1 className="vm-ch-title">
            <span>Jogos</span>
            <em>do Vasco.</em>
          </h1>
          <p className="vm-ch-lede">Cada partida tem a sua página: o que está em jogo, o histórico entre os times e, depois do apito, os lances e as estatísticas.</p>
        </header>

        {refs.length === 0 ? (
          <p className="vm-mj-empty">Estamos atualizando o calendário. Volte em alguns minutos.</p>
        ) : (
          <>
            <section className="vm-mj-section" aria-labelledby="mjs-next">
              <h2 id="mjs-next" className="vm-ch-h2">Próximos jogos</h2>
              {upcoming.length > 0 ? (
                <ul className="vm-mjs-list">{upcoming.map((r) => <Row key={r.slug} r={r} />)}</ul>
              ) : (
                <p className="vm-mj-empty">Não há jogos marcados no momento.</p>
              )}
            </section>
            <section className="vm-mj-section" aria-labelledby="mjs-res">
              <h2 id="mjs-res" className="vm-ch-h2">Resultados</h2>
              <ul className="vm-mjs-list">{results.map((r) => <Row key={r.slug} r={r} />)}</ul>
            </section>
          </>
        )}

        <p className="vm-mj-foot">
          Dados públicos da ESPN. Para a tabela do Brasileirão e as chances do Vasco, veja <Link href="/#vm-competicoes">Competições</Link> e <Link href="/chances">Chances do Vasco</Link>.
        </p>
      </article>
      <SiteFooter />
    </main>
  );
}
