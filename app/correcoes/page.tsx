import type { Metadata } from "next";
import Link from "next/link";
import SiteTopBar from "@/components/SiteTopBar";
import SiteFooter from "@/components/home/SiteFooter";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { CONTACT_EMAIL, OG_DEFAULTS, OG_IMAGE_DEFAULT, SITE_NAME, absoluteUrl } from "@/lib/site";

const DESCRIPTION = `Como pedir uma correção no ${SITE_NAME}, como ela é feita e o registro das correções.`;

export const metadata: Metadata = {
  title: "Correções",
  description: DESCRIPTION,
  alternates: { canonical: "/correcoes" },
  openGraph: { ...OG_DEFAULTS, type: "website", url: "/correcoes", title: `Correções · ${SITE_NAME}`, description: DESCRIPTION, images: [OG_IMAGE_DEFAULT] },
};

const UPDATED = "13 de outubro de 2026";

export default function CorrectionsPage() {
  return (
    <main className="relative min-h-screen">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `Correções · ${SITE_NAME}`,
            url: absoluteUrl("/correcoes"),
            inLanguage: "pt-BR",
            isPartOf: { "@id": absoluteUrl("/#website") },
          },
          breadcrumbSchema([{ name: "Correções", path: "/correcoes" }]),
        ]}
      />
      <SiteTopBar />
      <article className="vm-legal">
        <h1 className="vm-legal-title">Correções</h1>
        <p className="vm-label vm-legal-updated">Atualizado em {UPDATED}</p>

        <div className="vm-legal-body">
          <p>
            Errar faz parte de qualquer redação, e uma redação automatizada erra do seu jeito. O que importa é corrigir
            rápido e deixar claro o que mudou.
          </p>

          <h2>Como pedir uma correção</h2>
          <p>
            Escreva para <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> com o link da matéria e o que está
            errado. Se puder, indique onde está o dado correto. Respondemos o quanto antes.
          </p>

          <h2>Como corrigimos</h2>
          <ul>
            <li>
              Erros de fato, como nome, placar, data ou valor, são corrigidos na própria matéria, e a página passa a
              mostrar &ldquo;Atualizado em&rdquo; com a nova data.
            </li>
            <li>
              Quando a correção muda o sentido da matéria, acrescentamos no fim do texto uma nota começando por
              &ldquo;Correção:&rdquo;, explicando o que foi alterado.
            </li>
            <li>
              Uma matéria que não se sustenta, porque a informação foi desmentida, sai do ar. O endereço antigo passa a
              levar para a matéria que trata do assunto, para os links compartilhados não quebrarem.
            </li>
          </ul>

          <h2>Atualização não é correção</h2>
          <p>
            Quando surge um fato novo sobre o mesmo assunto, acrescentamos um parágrafo &ldquo;Atualização em&rdquo; com
            dia e hora. Isso é diferente de uma correção, e as duas coisas aparecem separadas nas matérias.
          </p>

          <h2>Registro de correções</h2>
          <p>
            Esta página lista as correções relevantes feitas depois da publicação. Ainda não há correções registradas.
          </p>

          <h2>Remoção de conteúdo</h2>
          <p>
            Para pedir a remoção de um conteúdo, veja a página de <Link href="/privacidade">Privacidade</Link>. Para
            saber como as notícias são feitas, veja <Link href="/como-produzimos">Como produzimos as notícias</Link>.
          </p>
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
