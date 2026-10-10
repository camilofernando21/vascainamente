# Contexto para continuar no Claude Code (VS Code)

Projeto: Vascainamente, site de notícias do Vasco da Gama (Next.js, publicado na Vercel a partir do `master`).

Antes de começar: rode `git pull` e leia o `CLAUDE.md`. Responda em português do Brasil e não use travessão (—) nem meia-risca (–) em textos do site.

## Estado em 10/10/2026

### Robô de notícias
- `scripts/fetch-news.py` roda no GitHub Actions a cada 15 minutos (disparo externo pelo cron-job.org).
- Usa a API do Anthropic para reescrever, classificar e dar importância (1 a 5).
- Notícias do mesmo fato são unificadas. Atualizações viram parágrafo "Atualização em DD/MM às HH:MM".
- Categorias: transferencia, resultado, elenco (só Vasco), base, feminino, clube, urgente, historico.

### X (Twitter) como fonte
- `scripts/x_source.py` lê posts de 4 setoristas: pabloramadas, gustavotutinha, pedrosa, leolacerdantv.
- Cobrança por uso: cerca de US$ 0,005 por post lido. Posts com link custam mais.
- O token está salvo como secret `X_BEARER_TOKEN` no GitHub. Nunca mostrar o valor nem commitar.
- Teto mensal de leitura: 2.000 posts (`X_MONTHLY_POST_LIMIT`). O estado fica em `.x_state.json`.
- Primeira rodada com token (18:45 UTC, 10/10): os 4 perfis foram marcados, 20 posts lidos no mês.
- Limite de gasto no console do X: FEITO em 10/10. Ciclo de 9/10 a 9/11, teto de US$ 10,00, recarga automática desligada. Saldo de US$ 24,86 (US$ 19,86 gratuitos, vencem em 8/1/2027). Gasto em 10/10: US$ 0,14.

### Site
- Tempo relativo calculado no navegador (`components/TimeAgo.tsx`).
- "A notícia do dia" com a janela da Cruz de Malta (`components/home/NewsOfTheDay.tsx`), com versão para celular.
- Escudos no hero, no desktop e no celular.
- 72 slugs antigos têm redirecionamento 301 em `content/redirects.json`. Toda matéria removida ou juntada precisa de redirecionamento.
- A Cruz de Malta sempre vem de `public/images/escudo-1-cruz.png`. Nunca redesenhar.
- `.env.local` nunca deve ser mostrado nem commitado.

### Pendências
- Comprar o domínio vascainamente.com.br (registro.br, cerca de R$ 40 por ano). Depois: Cloudflare DNS, e-mail profissional, Google Search Console e Google News Publisher Center.
- Quando o e-mail do domínio funcionar, trocar `CONTACT_EMAIL` em `lib/site.ts` para contato@vascainamente.com.br.
- Conferir no GA4, em aba anônima, se aparece 1 usuário.
- Apagar branches antigas no GitHub, se quiser: fix/tempo-relativo, feat/faixa, feat/cruz-janela, feat/cruz-celular, feat/escudos-celular.
- Opcional: postar no X cada matéria nova. Custa por post, então precisaria de seleção por importância.

### Arquivos de prompt
- Os antigos `PROMPT-*.md` estão em `_prompts/`, fora do git (ignorados por `.git/info/exclude`).
