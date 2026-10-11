# Contexto para continuar no Claude Code (VS Code)

Projeto: Vascainamente, site de notícias do Vasco da Gama (Next.js 14, publicado na Vercel a partir do `master`).

Antes de começar: rode `git pull` e leia o `CLAUDE.md`. Responda em português do Brasil e não use travessão (—) nem meia-risca (–) em textos do site.

## Estado em 11/10/2026

### Robô de notícias
- `scripts/fetch-news.py` roda no GitHub Actions a cada 15 minutos (disparo externo pelo cron-job.org; o agendamento do GitHub fica só como reserva).
- Usa a API do Anthropic para reescrever, classificar, dar importância (1 a 5) e decidir se a notícia é repetida.
- Categorias: transferencia, resultado, elenco (só Vasco), base, feminino, clube, urgente.
- Fontes RSS: GE (geral e do Vasco), ESPN, UOL, Trivela e Gazeta. UOL, ESPN e Gazeta não trazem imagem no feed, então essas matérias ficam sem foto.
- Mesmo fato, regra atual: a notícia repetida é descartada ou vira um parágrafo "Atualização em DD/MM às HH:MM" na matéria antiga. Exceções que viram matéria nova: um desdobramento com manchete própria (decisão nova ou revertida, recurso, lesão confirmada, marca de ingressos, negociação que avançou; campo `development`), a escalação oficial e o primeiro gol de um jogo (campo `matchEvent` no frontmatter). Gols seguintes atualizam a matéria do primeiro gol.
- O envio dos commits passa por `scripts/commit-news.sh`, que, se outra rodada enviou antes, junta o cache, o estado do X e as matérias (`scripts/resolve_conflicts.py`) em vez de falhar. O workflow baixa o `master` mais novo ao começar.

### X (Twitter) como fonte
- `scripts/x_source.py` lê o perfil oficial @VascodaGama (conta como fato confirmado, com leitura das imagens da escalação e do placar) e 4 setoristas: pabloramadas, gustavotutinha, pedrosa, leolacerdantv.
- Cobrança por uso: cerca de US$ 0,005 por post lido. O token é o secret `X_BEARER_TOKEN` no GitHub: nunca mostrar o valor nem commitar.
- Teto mensal de leitura: 2.000 posts (`X_MONTHLY_POST_LIMIT`). O estado fica em `.x_state.json`. Limite de gasto no console do X: US$ 10 por ciclo, recarga automática desligada.

### Site (home, de cima para baixo)
- Abertura com o loader da Cruz de Malta (cerca de 3,3 s na primeira visita da sessão), hero, faixa de manchetes, "A notícia do dia" (prioriza as de hoje), as 4 últimas, "Tudo o que saiu hoje".
- **Competições** (`components/home/Competitions.tsx`, `lib/competitions.ts`): lê a ESPN (pública, sem chave, não oficial) com cache de 2 a 5 minutos. Mostra o próximo jogo com contagem regressiva, abas por competição detectadas sozinhas, a tabela do Brasileirão com a posição do Vasco, e a campanha por fase das copas. Se a ESPN falhar, a seção some. O placar ao vivo tem até uns 3 minutos de atraso.
- Vasco TV, **Resposta Histórica** (`HistoricResponse.tsx`, capítulo fixo em 4 momentos, só a frase final da carta é citada porque as fontes divergem), **Roberto Dinamite** (`RobertoDinamite.tsx`), ídolos e rodapé.
- A Cruz de Malta sempre vem de `public/images/escudo-1-cruz.png` (o componente `CruzMalta` usa o contorno extraído dela). Nunca redesenhar.
- 72 slugs antigos têm redirecionamento 301 em `content/redirects.json`. Toda matéria removida ou juntada precisa de redirecionamento.
- Consentimento (LGPD): GA4 e Clarity só carregam depois de "Aceitar". Verificado em 11/10.

### Auditoria de 11/10/2026
- Lighthouse no celular (site publicado): desempenho 90, acessibilidade 97, boas práticas 96, SEO 100. A nota de desempenho é puxada pelo loader inicial (LCP de 3,6 s).
- Sem erro de JavaScript, sem imagem quebrada e sem link interno quebrado nas páginas testadas, no computador e no celular.
- `npm audit`: o Next 14.2.35 tem avisos de negação de serviço que só se resolvem subindo para a versão 16 (atualização grande, deixar para uma tarefa própria). O restante é de ferramentas de build.

### Pendências
- Domínio vascainamente.com.br: registrado no registro.br, mas o DNS ainda não aponta para a Vercel. Depois: adicionar o domínio na Vercel, definir `NEXT_PUBLIC_SITE_URL`, e-mail profissional, Google Search Console e Google News Publisher Center.
- Quando o e-mail do domínio funcionar, trocar `CONTACT_EMAIL` em `lib/site.ts` para contato@vascainamente.com.br.
- Central do Jogo (placar ao vivo, escalações e eventos): precisa do API-Football Pro (cerca de US$ 19 por mês). Decisão adiada. A chave do plano grátis está na Vercel e no `.env.local` como `API_FOOTBALL_KEY` (o plano grátis só libera temporadas de 2022 a 2024).
- Conferir no GA4, em aba anônima, se aparece 1 usuário.
- A Vercel Hobby é para uso não comercial. Se o site tiver anúncios ou for da empresa, considerar o plano Pro.

### Arquivos de prompt
- Os antigos `PROMPT-*.md` estão em `_prompts/`, fora do git (ignorados por `.git/info/exclude`).
