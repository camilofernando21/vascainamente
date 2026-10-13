import { getAllPosts, getPostsByCategory } from "@/lib/posts";
import { CATEGORY_NAMES, HISTORY_HREF, MAIN_CATEGORIES, OPTIONAL_CATEGORIES, categoryHref } from "@/lib/categories";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/lib/site";
import { formatDateShort } from "@/lib/time";

export const revalidate = 600;

const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

// llms.txt (https://llmstxt.org): what the site is, its sections and the latest news.
export function GET() {
  const posts = getAllPosts();
  const categories = [
    ...MAIN_CATEGORIES,
    ...OPTIONAL_CATEGORIES.filter((c) => getPostsByCategory(c).length > 0),
  ];

  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "Site independente de notícias sobre o Club de Regatas Vasco da Gama, sem vínculo oficial com o clube. " +
      "As notícias são reescritas a partir de fontes jornalísticas, sempre citadas com link para a matéria original, " +
      "e atualizadas automaticamente a cada 15 minutos. Os vídeos são incorporados do YouTube (canal oficial Vasco TV e ge tv).",
    "",
    "## Seções",
    "",
    ...categories.map((c) => `- [${CATEGORY_NAMES[c]}](${absoluteUrl(categoryHref(c))}): notícias da categoria ${CATEGORY_NAMES[c]}`),
    `- [Histórico](${absoluteUrl(HISTORY_HREF)}): datas, títulos e ídolos do clube`,
    `- [Vasco TV](${absoluteUrl("/#vm-vascotv")}): últimos vídeos do canal oficial do clube`,
    `- [Competições](${absoluteUrl("/#vm-competicoes")}): tabela do Brasileirão com a posição do Vasco, próximo jogo e a campanha na Sul-Americana e na Copa do Brasil`,
    `- [Resposta Histórica](${absoluteUrl("/#vm-resposta")}): a carta de 7 de abril de 1924, em que o Vasco recusou excluir jogadores negros e operários`,
    `- [Chances do Vasco](${absoluteUrl("/chances")}): cálculo próprio das chances de Libertadores, Sul-Americana e rebaixamento no Brasileirão`,
    `- [Quem somos](${absoluteUrl("/quem-somos")}): responsável editorial, contato e independência em relação ao clube`,
    `- [Como produzimos as notícias](${absoluteUrl("/como-produzimos")}): fontes, uso de inteligência artificial e regras do sistema`,
    `- [Correções](${absoluteUrl("/correcoes")}): como pedir e como fazemos correções`,
    `- [Roberto Dinamite](${absoluteUrl("/#vm-dinamite")}): o maior artilheiro da história do clube, com 708 gols`,
    "",
    "## Últimas notícias",
    "",
    ...posts
      .slice(0, 20)
      .map(
        (p) =>
          `- [${oneLine(p.title)}](${absoluteUrl(`/${p.slug}`)}): ${formatDateShort(p.date)}, ${CATEGORY_NAMES[p.category]}` +
          (p.excerpt ? `. ${oneLine(p.excerpt)}` : "")
      ),
    "",
    "## Opcional",
    "",
    `- [Sitemap](${absoluteUrl("/sitemap.xml")}): todas as páginas e matérias`,
    `- [Privacidade](${absoluteUrl("/privacidade")}) e [Termos](${absoluteUrl("/termos")})`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
