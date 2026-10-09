import type { Metadata } from "next";
import Link from "next/link";
import SiteTopBar from "@/components/SiteTopBar";
import SiteFooter from "@/components/home/SiteFooter";
import { CONTACT_EMAIL, OG_DEFAULTS, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: `Termos de uso do ${SITE_NAME}.`,
  alternates: { canonical: "/termos" },
  openGraph: { ...OG_DEFAULTS, type: "website", url: "/termos", title: `Termos de uso · ${SITE_NAME}` },
};

const UPDATED = "9 de outubro de 2026";

export default function TermsPage() {
  return (
    <main className="relative min-h-screen">
      <SiteTopBar />
      <article className="vm-legal">
        <h1 className="vm-legal-title">Termos de uso</h1>
        <p className="vm-label vm-legal-updated">Atualizado em {UPDATED}</p>

        <div className="vm-legal-body">
          <h2>O site</h2>
          <p>
            O {SITE_NAME} é um site independente de notícias sobre o Club de Regatas Vasco da Gama. Não é um canal
            oficial do clube e não fala em nome dele. O nome, o escudo e as marcas do Vasco pertencem ao clube.
          </p>

          <h2>De onde vêm as notícias</h2>
          <p>
            As notícias são reescritas de forma automatizada a partir de reportagens publicadas por veículos de
            imprensa. Toda matéria cita a fonte, com link para o texto original. Para informação completa ou
            atualizada, consulte sempre a fonte.
          </p>
          <p>
            Fazemos o possível para publicar informação correta, mas erros podem acontecer. Se encontrar algum, avise
            em <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>

          <h2>Vídeos</h2>
          <p>
            Os vídeos são incorporados do YouTube, dos canais oficiais que os publicaram (como a Vasco TV e o ge tv),
            com crédito e link para o vídeo original. Os direitos são de quem os publicou.
          </p>

          <h2>Pedidos de correção ou remoção</h2>
          <p>
            Para pedir correção ou remoção de conteúdo, envie o link da matéria e o motivo para{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Respondemos o quanto antes.
          </p>

          <h2>Privacidade</h2>
          <p>
            O tratamento de dados e de cookies está descrito na página de <Link href="/privacidade">Privacidade</Link>.
          </p>

          <h2>Mudanças nestes termos</h2>
          <p>Estes termos podem ser atualizados. A data da última versão fica no topo desta página.</p>
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
