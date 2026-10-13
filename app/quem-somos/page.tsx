import type { Metadata } from "next";
import Link from "next/link";
import SiteTopBar from "@/components/SiteTopBar";
import SiteFooter from "@/components/home/SiteFooter";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import {
  BYLINE,
  CONTACT_EMAIL,
  EDITOR,
  FACEBOOK,
  INSTAGRAM,
  OG_DEFAULTS,
  OG_IMAGE_DEFAULT,
  PUBLISHER,
  SITE_NAME,
  X_PROFILE,
  absoluteUrl,
} from "@/lib/site";

const DESCRIPTION = `Quem faz o ${SITE_NAME}: um portal independente de notícias sobre o Vasco da Gama, com responsável editorial e contato abertos.`;

export const metadata: Metadata = {
  title: "Quem somos",
  description: DESCRIPTION,
  alternates: { canonical: "/quem-somos" },
  openGraph: { ...OG_DEFAULTS, type: "website", url: "/quem-somos", title: `Quem somos · ${SITE_NAME}`, description: DESCRIPTION, images: [OG_IMAGE_DEFAULT] },
};

const UPDATED = "13 de outubro de 2026";

export default function AboutPage() {
  return (
    <main className="relative min-h-screen">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: `Quem somos · ${SITE_NAME}`,
            url: absoluteUrl("/quem-somos"),
            inLanguage: "pt-BR",
            about: { "@id": absoluteUrl("/#organization") },
          },
          breadcrumbSchema([{ name: "Quem somos", path: "/quem-somos" }]),
        ]}
      />
      <SiteTopBar />
      <article className="vm-legal">
        <h1 className="vm-legal-title">Quem somos</h1>
        <p className="vm-label vm-legal-updated">Atualizado em {UPDATED}</p>

        <div className="vm-legal-body">
          <p>
            O {SITE_NAME} é um portal de notícias sobre o Club de Regatas Vasco da Gama. Reunimos em um só lugar o que
            sai sobre o clube, com atualização a cada 15 minutos, e acompanhamos a tabela, os jogos e a história do
            Vasco.
          </p>

          <h2>Somos independentes</h2>
          <p>
            O site não tem vínculo oficial com o clube. O nome, o escudo e os símbolos do Vasco da Gama pertencem ao
            clube e aparecem aqui apenas para identificar o assunto.
          </p>

          <h2>Quem responde pelo site</h2>
          <p>
            O responsável editorial é {EDITOR}. O site é mantido por {PUBLISHER.legalName} ({PUBLISHER.name}), CNPJ{" "}
            {PUBLISHER.cnpj}. As matérias são assinadas pela {BYLINE}.
          </p>
          <p>
            Para sugerir pauta, pedir correção ou falar de qualquer outro assunto, escreva para{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>

          <h2>O que você encontra aqui</h2>
          <ul>
            <li>
              <strong>Notícias</strong> sobre transferências, resultados, elenco, base, time feminino e o clube.
            </li>
            <li>
              <strong>Competições:</strong> a tabela do Brasileirão com a posição do Vasco, o próximo jogo e a campanha
              nas copas.
            </li>
            <li>
              <strong>Chances do Vasco:</strong> um cálculo próprio das chances de Libertadores, Sul-Americana e
              rebaixamento, atualizado a cada rodada.
            </li>
            <li>
              <strong>Histórico:</strong> datas, títulos e ídolos do clube.
            </li>
            <li>
              <strong>Vasco TV:</strong> os vídeos mais recentes do canal oficial do clube.
            </li>
          </ul>

          <h2>Como trabalhamos</h2>
          <p>
            As matérias são escritas com apoio de inteligência artificial a partir de fontes que sempre citamos, com
            link para o texto original. Contamos o processo inteiro, sem rodeios, em{" "}
            <Link href="/como-produzimos">Como produzimos as notícias</Link>. Se você achar um erro, veja a página{" "}
            <Link href="/correcoes">Correções</Link>.
          </p>

          <h2>Onde nos encontrar</h2>
          <p>
            Instagram:{" "}
            <a href={INSTAGRAM.url} target="_blank" rel="noopener noreferrer">
              {INSTAGRAM.handle}
            </a>
            . X:{" "}
            <a href={X_PROFILE.url} target="_blank" rel="noopener noreferrer">
              {X_PROFILE.handle}
            </a>
            . Facebook:{" "}
            <a href={FACEBOOK.url} target="_blank" rel="noopener noreferrer">
              Página {FACEBOOK.nome}
            </a>
            .
          </p>
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
