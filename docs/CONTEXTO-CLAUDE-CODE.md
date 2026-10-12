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
- Abertura com o loader da Cruz de Malta: 4 marcos (1898, 1974, 1998 e a cruz), cerca de 4 s, só na primeira visita da sessão, com botão "Pular" e tecla Esc (`components/effects/Loader.tsx`). Depois vêm o hero, a faixa de manchetes, "A notícia do dia" (prioriza as de hoje), as 4 últimas e "Tudo o que saiu hoje".
- As fotos das matérias só aparecem na "Notícia do dia"; a página da matéria é tipográfica de propósito. Se a matéria escolhida não tem foto, a seção mostra uma capa feita pelo site (`components/NewsCover.tsx`: categoria em contorno, brilho vermelho e a Cruz de Malta). Não puxar foto de outros veículos.
- A faixa giratória "ROLE PARA VER AS NOTÍCIAS" aparece depois de 9 s parado e some de vez ao chegar na notícia do dia.
- **Competições** (`components/home/Competitions.tsx`, `lib/competitions.ts`): lê a ESPN (pública, sem chave, não oficial) com cache de 2 a 5 minutos. Mostra o próximo jogo com contagem regressiva, abas por competição detectadas sozinhas, a tabela do Brasileirão com a posição do Vasco, e a campanha por fase das copas. Se a ESPN falhar, a seção some. O placar ao vivo tem até uns 3 minutos de atraso.
- Vasco TV, **Resposta Histórica** (`HistoricResponse.tsx`, capítulo fixo em 4 momentos, só a frase final da carta é citada porque as fontes divergem), **Roberto Dinamite** (`RobertoDinamite.tsx`), ídolos e rodapé.
- A Cruz de Malta sempre vem de `public/images/escudo-1-cruz.png` (o componente `CruzMalta` usa o contorno extraído dela). Nunca redesenhar.
- 72 slugs antigos têm redirecionamento 301 em `content/redirects.json`. Toda matéria removida ou juntada precisa de redirecionamento.
- Consentimento (LGPD): GA4 e Clarity só carregam depois de "Aceitar". Verificado em 11/10.

### Auditoria de 11/10/2026
- Lighthouse no celular (site publicado): desempenho 90, acessibilidade 97, boas práticas 96, SEO 100. O LCP varia entre 3 e 5 s de uma medição para outra, então não dá para atribuir a nota ao loader.
- Sem erro de JavaScript, sem imagem quebrada e sem link interno quebrado nas páginas testadas, no computador e no celular.
- `npm audit`: o Next 14.2.35 tem avisos de negação de serviço que só se resolvem subindo para a versão 16 (atualização grande, deixar para uma tarefa própria). O restante é de ferramentas de build.

### Domínio e Search Console (concluído em 11/10/2026)
- vascainamente.com.br está conectado e funcionando. Registrado no registro.br. Em 12/10/2026 o DNS foi movido para a Cloudflare (plano grátis), com os nameservers laila.ns.cloudflare.com e todd.ns.cloudflare.com definidos no registro.br. Domínio ativo na Cloudflare, site abre com e sem www e o e-mail chega.
- Todos os registros na Cloudflare ficam em "Somente DNS" (nuvem cinza). NÃO ligar o proxy (nuvem laranja): a Vercel não recomenda. Ignorar o aviso amarelo da Cloudflare que sugere ligar o proxy.
- Registros na Cloudflare (7): A (raiz) 216.198.79.1; CNAME www d88a6868cc0019b5.vercel-dns-017.com; MX mx1.improvmx.com (10) e mx2.improvmx.com (20); TXT SPF `v=spf1 include:spf.improvmx.com include:_spf.google.com ~all`; TXT google-site-verification do Search Console; TXT _dmarc `v=DMARC1; p=none;`. A Cloudflare cria sozinha um MX nulo, um SPF `-all` e um DMARC `p=reject` ao importar a zona: esses foram removidos ou editados, porque derrubariam o e-mail.
- DNSSEC: o DS antigo do registro.br foi removido na troca. Depois, o DNSSEC foi ligado pela Cloudflare e o DS foi cadastrado no registro.br (Keytag 2371, algoritmo 13, SHA256). Conferido em 12/10/2026 pelo dns.google: `AD: true`.
- Na Vercel, os 3 domínios (vascainamente.com.br, www.vascainamente.com.br e vascainamente.vercel.app) estão com "Valid Configuration". A raiz redireciona (308) para o www.
- Variável de ambiente na Vercel (Production): NEXT_PUBLIC_SITE_URL=https://www.vascainamente.com.br. É lida em `lib/site.ts` e usada no canonical, no sitemap e nos links de compartilhamento. O redeploy já foi feito.
- Google Search Console: propriedade de Domínio vascainamente.com.br, verificada por TXT no DNS. Sitemap enviado: https://www.vascainamente.com.br/sitemap.xml (em propriedade de Domínio é preciso a URL completa). Logo após o envio o status mostrou "Não foi possível buscar o sitemap" com 0 páginas, o que é normal no início. Conferir de novo em algumas horas ou no dia seguinte.

### E-mail profissional (ativo em 11/10/2026)
- contato@vascainamente.com.br recebe pelo ImprovMX (plano grátis, só para receber) e encaminha para o Gmail do responsável. Registros (agora na Cloudflare): MX com prioridade 10 e 20 e um TXT de SPF na raiz.
- Mensagens encaminhadas podem cair no spam do Gmail. Foi criado no Gmail um filtro "nunca enviar para spam" para contato@vascainamente.com.br.
- A resposta sai pelo Gmail com "Enviar como" contato@, usando o SMTP do Gmail com uma senha de app. Nenhuma senha fica guardada em arquivo do projeto.
- Atenção: alguns provedores, como o Outlook, podem mandar essas respostas para o spam. Se isso virar problema, a alternativa é o ImprovMX Premium.
- `CONTACT_EMAIL` em `lib/site.ts` já aponta para contato@vascainamente.com.br. Ele aparece só nas páginas de privacidade e de termos, que leem a constante (nenhum endereço escrito direto no código). `PUBLISHER.email` (contato@catetoaocubo.com.br) continua sendo o e-mail da empresa e hoje não é exibido no site.

### Outros itens concluídos em 11/10/2026
- Limite de gasto do X: US$ 10 por ciclo, recarga automática desligada.
- `.claude/settings.json` com modelo padrão sonnet e `CLAUDE_CODE_SUBAGENT_MODEL=sonnet`, para gastar menos tokens.
- Os 5 branches antigos do GitHub foram apagados (já estavam 100% no master). Só existe o `master`.

### Monetização (achados de 11/10/2026)
- Publicidade de apostas está proibida pela MP 1.394/2026 (aguarda votação no Congresso, prazo por volta de 23/11/2026).
- Risco de o conteúdo reescrito automaticamente ser tratado como "scaled content" pelo Google/AdSense: o site precisa de mais conteúdo original.
- Afiliado do Mercado Livre (até 16% em esportes e vestuário na venda direta, segundo a imprensa) é uma rota possível. Canais do WhatsApp ainda não monetizam diretamente.
- Google News: a elegibilidade é automática e exige domínio próprio e conteúdo original.

### Redes sociais e canal (ideias de 11 e 12/10/2026)
- Plano: reativar o Instagram @_vascainamente_ (postagem diária), usar a conta nova do X (usuário ainda a informar) e criar o TikTok. Cobalt criará os posts e artes com a identidade do site. Tudo só vai ao ar com aprovação do proprietário no Slack.
- Kit de marca para o Cobalt (cores, fontes, Cruz de Malta, grão, layout do card 1080x1350, voz e regras) foi gerado fora do repositório. A Cruz de Malta vem sempre de `public/images/escudo-1-cruz.png`.
- Canal do WhatsApp (modelo Lance! Vasco) é a opção recomendada para distribuir notícia, no lugar de um grupo. Decisão de criar ainda pendente.
- Afiliados de produtos do Vasco: Mercado Livre, Shopee, Amazon Associados, Netshoes (Awin) e Nike (Lomadee, programa aparecia como inativo). Em 2026 a Nike é a fornecedora do Vasco (distribuidora Fisia); onde os produtos serão vendidos ainda precisa ser confirmado. Obrigatório avisar "link de afiliado" nas ofertas, e só divulgar produto original.

### Pendências
- Google News Publisher Center.
- Confirmar que o Search Console continua verificado depois da troca de DNS (o TXT foi copiado para a Cloudflare).
- Entregar o kit de marca ao Cobalt e obter o usuário do X.
- Decidir sobre o canal do WhatsApp e sobre os programas de afiliados.
- Opcional: ImprovMX Premium ou SMTP gratuito com DKIM do domínio, se o Outlook mandar as respostas do contato@ para o spam.
- Conferir o status do sitemap no Search Console (algumas horas ou no dia seguinte ao envio).
- Conferir no GA4, em aba anônima, se aparece 1 usuário.
- Central do Jogo (placar ao vivo, escalações e eventos): precisa do API-Football Pro (cerca de US$ 19 por mês). Decisão adiada. A chave do plano grátis está na Vercel e no `.env.local` como `API_FOOTBALL_KEY` (o plano grátis só libera temporadas de 2022 a 2024).
- A Vercel Hobby é para uso não comercial. Se o site tiver anúncios, considerar o plano Pro.
- Conferir as primeiras matérias vindas do X (crédito do setorista e categoria).
- Decidir a rota de monetização (ver os achados acima).
- Atualizar o Next 14 para o 16, como tarefa própria (os avisos de segurança do 14.2.35 só se resolvem assim).

### Arquivos de prompt
- Os antigos `PROMPT-*.md` estão em `_prompts/`, fora do git (ignorados por `.git/info/exclude`).
