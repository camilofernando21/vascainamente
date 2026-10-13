import type { Metadata } from "next";
import Link from "next/link";
import SiteTopBar from "@/components/SiteTopBar";
import SiteFooter from "@/components/home/SiteFooter";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { CONTACT_EMAIL, EDITOR, OG_DEFAULTS, OG_IMAGE_DEFAULT, SITE_NAME, absoluteUrl } from "@/lib/site";

const DESCRIPTION = `Como cada notícia do ${SITE_NAME} é feita: de onde vêm as informações, o que é escrito com inteligência artificial e quais regras o sistema segue.`;

export const metadata: Metadata = {
  title: "Como produzimos as notícias",
  description: DESCRIPTION,
  alternates: { canonical: "/como-produzimos" },
  openGraph: { ...OG_DEFAULTS, type: "website", url: "/como-produzimos", title: `Como produzimos as notícias · ${SITE_NAME}`, description: DESCRIPTION, images: [OG_IMAGE_DEFAULT] },
};

const UPDATED = "13 de outubro de 2026";

export default function HowWeWorkPage() {
  return (
    <main className="relative min-h-screen">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `Como produzimos as notícias · ${SITE_NAME}`,
            url: absoluteUrl("/como-produzimos"),
            inLanguage: "pt-BR",
            isPartOf: { "@id": absoluteUrl("/#website") },
          },
          breadcrumbSchema([{ name: "Como produzimos as notícias", path: "/como-produzimos" }]),
        ]}
      />
      <SiteTopBar />
      <article className="vm-legal">
        <h1 className="vm-legal-title">Como produzimos as notícias</h1>
        <p className="vm-label vm-legal-updated">Atualizado em {UPDATED}</p>

        <div className="vm-legal-body">
          <p>
            Aqui está, sem rodeios, como cada notícia do {SITE_NAME} é feita. Preferimos que você saiba exatamente o que
            está lendo.
          </p>

          <h2>De onde vêm as informações</h2>
          <p>
            O site acompanha, o dia todo, as matérias de portais esportivos (GE, ESPN, UOL, Trivela e Gazeta Esportiva),
            o perfil oficial do Vasco no X e os posts de setoristas que cobrem o clube no X. Os vídeos vêm dos canais
            oficiais da Vasco TV e do ge tv no YouTube. As tabelas e os resultados dos jogos vêm de dados esportivos
            públicos da ESPN.
          </p>

          <h2>Quem escreve</h2>
          <p>
            A cada 15 minutos, um sistema automático lê essas fontes. Um sistema de inteligência artificial escreve o
            texto com as nossas palavras, define a categoria e a importância da notícia e verifica se aquele fato já foi
            publicado. Escrevemos um texto novo a partir dos fatos e citamos sempre a fonte.
          </p>
          <p>
            O responsável editorial, {EDITOR}, define as regras desse sistema, acompanha o que é publicado e corrige o
            que estiver errado.
          </p>

          <h2>O que somos, e o que ainda não somos</h2>
          <p>
            Ainda não temos repórteres em campo. Nosso trabalho é reunir, reescrever e organizar o que o clube, os
            veículos e os setoristas apuram. Por isso toda matéria cita a fonte e leva o link para o texto original.
          </p>
          <p>
            O que é nosso de verdade: a organização da tabela e do calendário, o cálculo das{" "}
            <Link href="/chances">Chances do Vasco</Link> e a curadoria do Histórico.
          </p>

          <h2>As regras que o sistema segue</h2>
          <ul>
            <li>Toda matéria cita a fonte e leva o link para o texto original.</li>
            <li>
              Só o que o próprio Vasco publica no perfil oficial é tratado como oficial. O que um setorista apura é
              apresentado como apuração dele (&ldquo;segundo o setorista&rdquo;), nunca como fato confirmado pelo clube.
            </li>
            <li>
              Um fato, uma matéria. Quando outro veículo repete a mesma informação, ela vira uma atualização na matéria
              original, com data e hora. Quando há um desdobramento importante, como uma decisão revertida, ele ganha
              uma matéria própria.
            </li>
            <li>O sistema só usa o que está na fonte. Não pode inventar nomes, números nem placares.</li>
            <li>Posts sem informação concreta, como opinião, piada e divulgação, são descartados.</li>
          </ul>

          <h2>Fotos e vídeos</h2>
          <p>
            As fotos exibidas na home pertencem às fontes originais e aparecem com a indicação da fonte. Os vídeos são
            incorporados do YouTube e só carregam quando você aperta o play. Se você é dono de uma imagem e quer pedir a
            remoção, escreva para <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>

          <h2>Quando erramos</h2>
          <p>
            Sistemas automáticos erram, e nós também. Veja na página <Link href="/correcoes">Correções</Link> como
            pedir uma correção e como ela é feita.
          </p>
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
