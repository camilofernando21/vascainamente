import type { Metadata } from "next";
import Link from "next/link";
import SiteTopBar from "@/components/SiteTopBar";
import SiteFooter from "@/components/home/SiteFooter";
import HistoryTimeline from "@/components/history/HistoryTimeline";
import { CruzMalta } from "@/components/ui/cruz-malta";
import { HISTORY_DATES, TITLES, dayLabel, factsForToday, nextFact } from "@/lib/historia";
import { IDOLS } from "@/lib/idols";
import { OG_DEFAULTS } from "@/lib/site";
import { HISTORY_HREF } from "@/lib/categories";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";

// "Hoje na história" depends on the date: re-render every hour.
export const revalidate = 3600;

const DESCRIPTION = "Datas, títulos e ídolos do Club de Regatas Vasco da Gama.";

export const metadata: Metadata = {
  title: "Histórico",
  description: DESCRIPTION,
  alternates: { canonical: HISTORY_HREF },
  openGraph: { ...OG_DEFAULTS, type: "website", url: HISTORY_HREF, title: "Histórico · Vascainamente", description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: "Histórico · Vascainamente", description: DESCRIPTION },
};

function inDays(days: number) {
  return days === 1 ? "Amanhã" : `Daqui a ${days} dias`;
}

export default function HistoryPage() {
  const today = factsForToday();
  const upcoming = today.length === 0 ? nextFact() : null;

  return (
    <main className="relative min-h-screen">
      <JsonLd data={breadcrumbSchema([{ name: "Histórico", path: HISTORY_HREF }])} />
      <SiteTopBar />

      {/* today in history, or the next date in the calendar */}
      <section className="vm-hist-today" aria-label="Hoje na história do Vasco">
        <p className="vm-label vm-hist-eyebrow">Hoje na história do Vasco</p>
        {today.length > 0 ? (
          today.map((fact) => (
            <div key={fact.ano} className="vm-hist-fact">
              <span className="vm-hist-year">{fact.ano}</span>
              <div className="vm-hist-fact-body">
                <p className="vm-label vm-hist-when">Hoje, {dayLabel(fact.dia)}</p>
                <h1 className="vm-hist-title">{fact.titulo}</h1>
                <p className="vm-hist-text">{fact.texto}</p>
              </div>
            </div>
          ))
        ) : upcoming ? (
          <div className="vm-hist-fact">
            <span className="vm-hist-year">{upcoming.fact.ano}</span>
            <div className="vm-hist-fact-body">
              <p className="vm-label vm-hist-when">
                {inDays(upcoming.days)} · {dayLabel(upcoming.fact.dia)}
              </p>
              <h1 className="vm-hist-title">{upcoming.fact.titulo}</h1>
              <p className="vm-hist-text">{upcoming.fact.texto}</p>
            </div>
          </div>
        ) : null}
      </section>

      <HistoryTimeline dates={HISTORY_DATES} />

      <section className="vm-hist-block" aria-label="Títulos">
        <header className="vm-hist-block-head">
          <p className="vm-label vm-hist-eyebrow">Títulos</p>
          <h2 className="vm-hist-block-title">
            Os grandes <em>títulos</em>
          </h2>
        </header>
        <ul className="vm-titles">
          {TITLES.map((t) => (
            <li key={t.nome} className="vm-title-row">
              <span className="vm-title-count">{t.anos.length}</span>
              <span className="vm-title-name">{t.nome}</span>
              <span className="vm-title-years">{t.anos.join(" · ")}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="vm-hist-block" aria-label="Ídolos">
        <header className="vm-hist-block-head">
          <p className="vm-label vm-hist-eyebrow">Ídolos</p>
          <h2 className="vm-hist-block-title">
            Quem fez a <em>história</em>
          </h2>
        </header>
        <ul className="vm-hist-idols">
          {IDOLS.map((idol) => (
            <li key={idol.name} className="vm-hist-idol">
              <span className="vm-label vm-hist-idol-rank">
                <CruzMalta size={10} />
                {idol.rank}
              </span>
              <span className="vm-hist-idol-name">{idol.name}</span>
              <span className="vm-hist-idol-value">
                {idol.value} <span>{idol.unit}</span>
              </span>
              <span className="vm-hist-idol-lines">
                {idol.lines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <Link href="/#idolos" className="vm-button vm-hist-cta">
          Ver os ídolos com vídeos na home
        </Link>
      </section>

      <SiteFooter />
    </main>
  );
}
