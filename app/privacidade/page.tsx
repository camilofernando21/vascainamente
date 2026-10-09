import type { Metadata } from "next";
import SiteTopBar from "@/components/SiteTopBar";
import SiteFooter from "@/components/home/SiteFooter";
import ReopenConsentButton from "@/components/consent/ReopenConsentButton";
import { CONTACT_EMAIL, OG_DEFAULTS, SITE_NAME } from "@/lib/site";
import { ACTIVE_TRACKERS, GA_ID, CLARITY_ID, META_PIXEL_ID, listPt } from "@/lib/trackers";

export const metadata: Metadata = {
  title: "Privacidade",
  description: `Como o ${SITE_NAME} trata dados e cookies.`,
  alternates: { canonical: "/privacidade" },
  openGraph: { ...OG_DEFAULTS, type: "website", url: "/privacidade", title: `Privacidade · ${SITE_NAME}` },
};

const UPDATED = "9 de outubro de 2026";

export default function PrivacyPage() {
  const tools = ACTIVE_TRACKERS;
  const stats = [GA_ID && "Google Analytics", CLARITY_ID && "Microsoft Clarity"].filter(Boolean) as string[];

  return (
    <main className="relative min-h-screen">
      <SiteTopBar />
      <article className="vm-legal">
        <h1 className="vm-legal-title">Privacidade</h1>
        <p className="vm-label vm-legal-updated">Atualizado em {UPDATED}</p>

        <div className="vm-legal-body">
          <h2>Quem mantém o site</h2>
          <p>
            O {SITE_NAME} é um site independente de notícias sobre o Club de Regatas Vasco da Gama, sem vínculo
            oficial com o clube. Para qualquer assunto sobre dados ou conteúdo, escreva para{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>

          <h2>Que dados coletamos</h2>
          <p>
            Não pedimos cadastro, nome, e-mail ou qualquer dado pessoal para você ler o site.
          </p>
          {tools.length > 0 ? (
            <>
              {stats.length > 0 && (
                <p>
                  Se você aceitar os cookies, usamos {listPt(stats)} para estatísticas de uso: páginas vistas, tempo
                  de leitura, tipo de aparelho, cliques e rolagem, de forma agregada. Isso nos ajuda a saber o que
                  funciona no site.
                </p>
              )}
              {META_PIXEL_ID && (
                <p>
                  Se você aceitar, também usamos o pixel da Meta para medir anúncios que o site faz no Facebook e no
                  Instagram.
                </p>
              )}
              <p>Se você recusar, nenhuma dessas ferramentas é carregada e o site funciona igual.</p>
            </>
          ) : (
            <p>
              Hoje o site não usa nenhuma ferramenta de estatística ou de anúncios. Se isso mudar, elas só serão
              carregadas depois do seu aceite, e esta página será atualizada.
            </p>
          )}
          <p>
            Guardamos no seu navegador apenas preferências de uso do próprio site, como a sua escolha sobre cookies e
            se a animação de abertura já foi exibida.
          </p>
          {tools.length > 0 && <ReopenConsentButton />}

          <h2>Vídeos do YouTube</h2>
          <p>
            Os vídeos são incorporados do YouTube, em modo de privacidade reforçada (youtube-nocookie.com). Nas
            matérias e na seção Vasco TV, o vídeo só é carregado quando você aperta o play. Os vídeos de fundo da home
            são carregados quando você chega perto da seção. Ao assistir, valem também as regras de privacidade do
            Google.
          </p>

          <h2>Seus direitos</h2>
          <p>
            Pela Lei Geral de Proteção de Dados (Lei 13.709/2018), você pode pedir informações sobre dados tratados,
            correção ou exclusão. Escreva para <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>

          <h2>Remoção de conteúdo</h2>
          <p>
            Se você é citado em uma notícia ou é dono de um conteúdo publicado aqui e quer pedir correção ou remoção,
            envie o link da matéria e o motivo para <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
