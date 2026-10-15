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
- Google Search Console: propriedade de Domínio vascainamente.com.br, verificada por TXT no DNS, e continua verificada depois da troca de DNS. A página inicial já está indexada. Sitemap enviado: https://www.vascainamente.com.br/sitemap.xml (em propriedade de Domínio é preciso a URL completa). O sitemap abre normalmente, mas o status ainda mostra "Não foi possível buscar" enquanto o Google não o lê. Conferir de novo em 1 ou 2 dias.

### E-mail profissional (ativo em 11/10/2026)
- contato@vascainamente.com.br recebe pelo ImprovMX (plano grátis, só para receber) e encaminha para o Gmail do responsável. Registros (agora na Cloudflare): MX com prioridade 10 e 20 e um TXT de SPF na raiz.
- Teste de recebimento feito depois da troca de DNS: chegou (inclusive a confirmação do Google).
- Mensagens encaminhadas podem cair no spam do Gmail. Foi criado no Gmail um filtro "nunca enviar para spam" para contato@vascainamente.com.br.
- A resposta sai pelo Gmail com "Enviar como" contato@, usando o SMTP do Gmail com uma senha de app. Nenhuma senha fica guardada em arquivo do projeto.
- Atenção: alguns provedores, como o Outlook, podem mandar essas respostas para o spam. Se isso virar problema, a alternativa é o ImprovMX Premium.
- `CONTACT_EMAIL` em `lib/site.ts` já aponta para contato@vascainamente.com.br. Ele aparece só nas páginas de privacidade e de termos, que leem a constante (nenhum endereço escrito direto no código). `PUBLISHER.email` (contato@catetoaocubo.com.br) continua sendo o e-mail da empresa e hoje não é exibido no site.

### Analytics, Google Notícias e Instagram (conferido em 12/10/2026)
- GA4 conferido em aba anônima: aparece 1 usuário e as páginas visitadas em tempo real. Funcionando.
- Google Notícias (Publisher Center): publicação "Vascainamente" criada, URL vascainamente.com.br verificada, contato contato@vascainamente.com.br verificado e logo quadrado de 1000x1000 enviado. O Google decide a inclusão sozinho, então só acompanhar.
- Instagram @_vascainamente_ renovado: foto, nome, bio, link e 4 destaques novos (Notícias, Jogo, Elenco, Histórico) no padrão do site, e um post de relançamento publicado.

### Credibilidade e conteúdo original (13/10/2026)
Motivo: a política do AdSense trata texto reescrito com pouca mudança como cópia, e o Google Notícias pede autoria, responsável e política editorial. Plano em camadas: transparência, dados próprios e, depois, voz humana.
- Páginas `/quem-somos` (responsável editorial Camilo Fernando Bomfim, contato@vascainamente.com.br), `/como-produzimos` (declara o uso de inteligência artificial sem citar o nome do modelo nem da empresa, as fontes e as regras do sistema, e diz "Ainda não temos repórteres em campo") e `/correcoes`. Links no rodapé, no sitemap e no `llms.txt`.
- Todas as matérias são assinadas "Redação Vascainamente" (`BYLINE` e `EDITOR` em `lib/site.ts`), com a nota "Matéria escrita com apoio de inteligência artificial a partir da fonte citada" no fim e link para Como produzimos e Correções. O autor do NewsArticle no schema é a Redação Vascainamente.
- A organização no schema virou `NewsMediaOrganization`, com `masthead` (Quem somos), `publishingPrinciples` (Como produzimos) e `correctionsPolicy` (Correções).
- `/chances` ("Chances do Vasco", `lib/chances.ts`): simula o resto do Brasileirão 20 mil vezes. Cada jogo que falta tem o placar sorteado por Poisson, com ataque e defesa de cada time (gols da temporada com 8 jogos de prior) e fator de mando de 1,14. A tabela é ordenada por pontos, vitórias, saldo e gols pró. Mostra Libertadores (até o 6º), Sul-Americana (7º ao 12º), rebaixamento (Z4), posição mais provável, a distribuição da posição final, o que muda no próximo jogo (simulação forçando vitória, empate e derrota) e a tabela de todos os times. Dados da ESPN; a página recalcula a cada 10 minutos e some o conteúdo (mostra aviso) se a ESPN falhar ou os jogos vierem incompletos. A semente do sorteio vem da tabela, então o resultado não oscila entre atualizações. A página diz que os números são estimativas feitas pelo Vascainamente e não dados oficiais da CBF, da Conmebol nem do clube. Link na aba do Brasileirão em Competições.
- Limites do modelo, ditos na própria página: é probabilidade e não previsão, não conhece lesões, suspensões e escalações, e usa a temporada inteira e não só a fase recente.
- Próximos passos do plano: páginas de jogo (antes e depois) com dados próprios, uma coluna ou enquete semanal (precisa de uma pessoa) e a Central do Jogo, se o API-Football Pro for assinado. Monetização na ordem: afiliados agora, AdSense só depois de uns 3 meses com conteúdo original e audiência, patrocínio direto com audiência, e nada de apostas.

### Páginas de jogo e lista de jogos (13/10/2026)
- `/jogo/[slug]` (por exemplo `/jogo/sao-paulo-x-vasco-2026-10-17`, mandante primeiro e data de Brasília) existe para cada jogo do Vasco que a seção Competições conhece (Brasileirão, Sul-Americana, Copa do Brasil). É a mesma página antes, durante e depois do jogo. Código em `app/jogo/[slug]/page.tsx` e `lib/match.ts`; o endereço (`slug`) é montado em `lib/competitions.ts`.
- Nada é escrito por IA: toda frase sai de modelos fixos preenchidos com dados, e um bloco sem dado não aparece. Cada bloco leva o selo "Dados públicos da ESPN", "Estimativa do Vascainamente" ou "Perfil oficial do Vasco no X". Só escudos dos times, nenhuma foto de outro veículo. Apostas (odds), público e árbitro da fonte não são usados.
- Antes do jogo: cabeçalho com contagem regressiva; logo depois, em destaque, "O que está em jogo" (no Brasileirão, as chances do Vasco depois de vitória, empate e derrota, calculadas por `getMatchStakes` em `lib/chances.ts`, mais a probabilidade do resultado; nas copas, a fase e o outro jogo do confronto); como chegam (posição na tabela e últimos 5 jogos de cada time); histórico de confrontos (últimos 5, quando a fonte tem; a Sul-Americana contra o Boca não tem); escalações; matérias do Vascainamente sobre o adversário.
- Depois do jogo: placar, "Na tabela hoje" com as chances de agora, lances (gols com autor e assistência, cartões, trocas), estatísticas, escalações e matérias. A tabela e as chances são sempre as de hoje, não as do dia do jogo.
- Escalação: primeiro a oficial do perfil do Vasco no X, lida da matéria do robô (campo `lineup` no cabeçalho da matéria, ao lado de `matchEvent: "escalacao"`), com a hora e o selo "Perfil oficial do Vasco no X". A ESPN é reserva (Vasco e adversário), só com 11 titulares, e nunca se mostra escalação incompleta ou provisória. A lista do X não tem número de camisa, então aparece um marcador e não um número inventado.
- Robô (`scripts/fetch-news.py`): para posts do perfil oficial, a IA devolve `lineup` (formação, 11 titulares, banco, técnico). `clean_lineup` só aceita exatamente 11 nomes diferentes; senão grava nada. Testado com IA em 3 casos (completa, com 10 nomes e marketing). Matérias de escalação anteriores a 13/10 não têm o campo e a página usa a ESPN para elas.
- Consultas à ESPN: o `espn()` de `lib/competitions.ts` usa o cache do Next por tempo (resumo do jogo 45 s ao vivo, 5 min antes e 1 h depois; calendários 2 min; tabela 5 a 10 min; jogos dos 20 times 1 h), lembra uma falha por 30 s e junta pedidos iguais e simultâneos em um só. Assim um pico de visitas, ou uma fonte fora do ar, não vira uma consulta por visita.
- Atualização: `revalidate = 60`, `dynamicParams = true` e `generateStaticParams` vazio. As páginas não são geradas no deploy porque dezenas de consultas simultâneas fazem a ESPN falhar e uma página incompleta seria guardada. Cada uma nasce na primeira visita. Se a ESPN estiver fora, a página mostra só o cabeçalho e um aviso (sem nenhum número, e sem fazer as consultas pesadas do cálculo) e fica em cache por até 1 minuto como qualquer outra. Não usar `noStore()` nem outras funções dinâmicas nessa página: com `revalidate` elas dão erro 500 (`DYNAMIC_SERVER_USAGE`), o que foi descoberto em teste.
- Sitemap: jogos dos 14 dias anteriores e dos 14 seguintes, mais `/jogos`. Os mais antigos continuam abertos, fora do sitemap. `/jogos` lista próximos jogos e resultados. Links de entrada: card do próximo jogo, jogos futuros e campanhas da seção Competições, rodapé e `llms.txt`.
- Ideias para depois: comparar as chances "antes" e "depois" do jogo (precisa guardar uma foto das chances antes da partida), imagem de prévia própria por jogo e página ao vivo com atualização mais curta.

### Modo dia de jogo para a escalação oficial (13/10/2026)
- Objetivo: a escalação oficial do perfil @VascodaGama aparecer em 3 a 6 minutos (antes, até 16), sem mexer no ciclo de 15 minutos.
- `.github/workflows/lineup-watch.yml` (só `workflow_dispatch`) é chamado a cada 5 minutos pelo cron-job.org, das 9h às 23h59 de Brasília. Usa o mesmo grupo de fila (`fetch-news`) do ciclo de 15 minutos, então nunca rodam juntos. O GitHub guarda só uma execução pendente por grupo: se uma rodada demorar mais de 5 minutos, uma pendente pode ser substituída por outra.
- O primeiro passo é `scripts/lineup_gate.py` (só biblioteca padrão, cerca de 2 s): lê a agenda da ESPN (as mesmas 7 competições do site) e responde se um jogo do Vasco começa nas próximas 3 horas e a escalação estruturada (matéria com `matchEvent: "escalacao"` e `lineup`, com data depois do início da janela) ainda não foi gravada. Em dúvida, ou com a agenda fora do ar, responde "pular". Para testar uma hora qualquer: `GATE_NOW=2026-10-13T22:00:00+00:00 python scripts/lineup_gate.py`. Fora da janela o workflow termina aí, sem instalar nada e sem consultar o X.
- Dentro da janela: `python scripts/fetch-news.py --only-x vascodagama` lê só esse perfil (nenhum RSS, nenhum outro setorista) e publica pelo `commit-news.sh`. `fetch_x_items(only=[...])` em `scripts/x_source.py` faz o filtro. O estado (`.x_state.json`: `since` e leituras do mês) e o cache de matérias são os mesmos do ciclo normal.
- Parada: quando há uma matéria de escalação com os 11 titulares gravada na janela, ou quando o jogo começa. Se a IA não conseguir ler os 11 nomes, a matéria sai sem `lineup` e o vigia continua olhando até o início do jogo, sem custo (sem post novo, sem cobrança).
- Custo no X: cobra-se por post devolvido (US$ 0,005), e a mesma leitura no mesmo dia (UTC) conta uma vez. O vigia lê os mesmos posts que o ciclo de 15 minutos já leria, só mais cedo. Em 10/10 o robô fez dezenas de consultas, a maioria vazia, e o gasto foi US$ 0,14 (28 posts), o que indica que consulta vazia não custa. A confirmar no painel de uso do X depois do primeiro jogo. Consumo do ciclo normal: cerca de 36 posts por dia (uns 1.100 por mês, perto de US$ 5,50) para um teto de 2.000.
- Repositório público: Actions não consome minutos. Fora da janela cada disparo é um registro curto no histórico.
- Job do cron-job.org (criado pelo responsável, depois do push): POST em `https://api.github.com/repos/camilofernando21/vascainamente/actions/workflows/lineup-watch.yml/dispatches`, cabeçalhos `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`, `Content-Type: application/json` e `Authorization: Bearer` com o mesmo token do job atual (nunca escrito em arquivo), corpo `{"ref":"master"}`, fuso America/Sao_Paulo, minutos 0, 5, 10 e assim até 55, horas 9 a 23, todos os dias. Resposta esperada: HTTP 204.

### Ajustes de 14 e 15/10/2026
- Card "O que está em jogo" e página `/chances`: os rótulos agora dizem "Vaga na Sul-Americana 2027 pelo Brasileiro" (e Libertadores 2027), porque os percentuais são a chance de terminar o Brasileirão do 7º ao 12º (ou até o 6º), e não a chance na Sul-Americana em disputa. Os números não mudaram.
- Capa própria de matéria sem foto (`.vm-cover-word`): a palavra da categoria saiu de trás do título e foi para a metade de baixo, à direita, com contorno mais fraco (24%).
- Notícia do dia (`pickFeaturedPost` em `lib/home.ts`): sempre a melhor matéria de hoje (dia de Brasília), mesmo de nota baixa. Só cai para as últimas 30 horas se hoje ainda não tiver matéria. Nova faixa "Ontem em destaque" (`components/home/YesterdayStrip.tsx`) logo abaixo, com a melhor matéria do dia anterior (`pickYesterdayPost`), sem repetir a do destaque.
- Instalação como app (`components/pwa/InstallPrompt.tsx`, montado no layout): só em celular, depois de 20 s e de rolar a página, nunca junto do aviso de cookies, nunca dentro de navegador de aplicativo (Instagram, Facebook, X, TikTok). Android usa o diálogo nativo (`beforeinstallprompt`); iPhone mostra um guia de 3 passos. "Agora não" silencia por 14 dias; instalado, nunca mais aparece (chave `vm-install` no localStorage). O manifesto (`app/manifest.ts`) já existia; não há service worker. Foi acrescentado `appleWebApp` no layout.
- Search Console (15/10): 73 páginas indexadas e 12 não. Dessas, 2 são redirecionamentos de `redirects.json` (esperado), 1 é cópia sem canônica escolhida (matéria de 31/08 sobre Lescano, endereço correto) e 9 estão rastreadas mas não indexadas (comum em site novo). Reavaliar em 10 a 14 dias; se os 9 não diminuírem, reforçar links internos e conteúdo próprio.
- Pacote de posts da vitória sobre o Boca (13/10) feito fora do repositório (artes, legendas e zips); fluxo do Cobalt com o Composio segue pendente de conectar Instagram e X com o apelido `vascainamente`.

### Outros itens concluídos em 11/10/2026
- Limite de gasto do X: US$ 10 por ciclo, recarga automática desligada.
- `.claude/settings.json` com modelo padrão sonnet e `CLAUDE_CODE_SUBAGENT_MODEL=sonnet`, para gastar menos tokens.
- Os 5 branches antigos do GitHub foram apagados (já estavam 100% no master). Só existe o `master`.
- As primeiras matérias vindas do X foram conferidas em 13/10/2026 (4 matérias): créditos e categorias corretos. As do perfil oficial dizem "o Vasco divulgou" e as dos setoristas dizem "segundo apuração do setorista".

### Monetização (achados de 11/10/2026)
- Publicidade de apostas está proibida pela MP 1.394/2026 (aguarda votação no Congresso, prazo por volta de 23/11/2026).
- Risco de o conteúdo reescrito automaticamente ser tratado como "scaled content" pelo Google/AdSense: o site precisa de mais conteúdo original.
- Afiliado do Mercado Livre (até 16% em esportes e vestuário na venda direta, segundo a imprensa) é uma rota possível. Canais do WhatsApp ainda não monetizam diretamente.
- Google News: a elegibilidade é automática e exige domínio próprio e conteúdo original.

### Redes sociais e canal (ideias de 11 e 12/10/2026)
- Perfis prontos em 12/10/2026: Instagram @_vascainamente_ (foto com o escudo do Canva, bio, link, post de relançamento) e X @Vascainamente (capa 1500x500 com a frase da marca, foto com o escudo, bio "Todas as notícias do Vasco da Gama. Vascaíno não se escolhe. Se nasce. Atualizado a cada 15 minutos.", site no perfil). O logo oficial agora é só o escudo, sem a palavra ao lado. TikTok ainda não criado.
- Página do Facebook do Vascainamente criada em 13/10/2026 (foto com o escudo, capa com a frase da marca, mesma bio e mesmo site dos outros perfis). URL na constante `FACEBOOK` de `lib/site.ts`, e o ícone aparece no rodapé, ao lado do Instagram e do X, e no `sameAs` do schema. O topo, as páginas internas e a barra do celular continuam só com Instagram e X, por falta de espaço.
- Plano: manter o Instagram com postagem diária, usar o X @Vascainamente e criar o TikTok. Cobalt criará os posts e artes com a identidade do site. Tudo só vai ao ar com aprovação do proprietário no Slack.
- Kit de marca para o Cobalt (cores, fontes, Cruz de Malta, grão, layout do card 1080x1350, voz e regras) foi gerado fora do repositório. A Cruz de Malta vem sempre de `public/images/escudo-1-cruz.png`.
- Canal do WhatsApp (modelo Lance! Vasco) é a opção recomendada para distribuir notícia, no lugar de um grupo. Decisão de criar ainda pendente.
- Afiliados de produtos do Vasco: Mercado Livre, Shopee, Amazon Associados, Netshoes (Awin) e Nike (Lomadee, programa aparecia como inativo). Em 2026 a Nike é a fornecedora do Vasco (distribuidora Fisia); onde os produtos serão vendidos ainda precisa ser confirmado. Obrigatório avisar "link de afiliado" nas ofertas, e só divulgar produto original.

### Pendências
- Escalação estruturada do X conferida no jogo contra o Boca (13/10): a página mostrou os 11 titulares com o selo do perfil oficial. Melhorias possíveis, com autorização de envio: ler o número da camisa, campo tático só com formação confiável e arte de "Escalação oficial".
- Criar o segundo job no cron-job.org para o `lineup-watch` (configuração acima) e testar com uma execução manual, que deve responder 204. Depois do primeiro jogo, olhar o painel de uso do X para confirmar que as consultas vazias não custam nada.
- Conferir o status do sitemap no Search Console em 1 ou 2 dias contados do envio, feito em 12/10/2026 (ou seja, entre 13 e 14/10/2026). Hoje mostra "Não foi possível buscar".
- Entregar o kit de marca ao Cobalt (usuário do X já definido: @Vascainamente). O kit de marca foi gerado fora do repositório e ainda será entregue ao Cobalt.
- Decidir sobre o canal do WhatsApp e sobre afiliados e monetização (ver os achados acima).
- Atualizar o Next 14 para o 16, como tarefa própria (os avisos de segurança do 14.2.35 só se resolvem assim).
- Vercel Pro, se houver anúncios (a Hobby é para uso não comercial).
- Central do Jogo (placar ao vivo, escalações e eventos): precisa do API-Football Pro (cerca de US$ 19 por mês). Decisão adiada. A chave do plano grátis está na Vercel e no `.env.local` como `API_FOOTBALL_KEY` (o plano grátis só libera temporadas de 2022 a 2024).
- Opcional: ImprovMX Premium ou SMTP gratuito com DKIM do domínio, se o Outlook mandar as respostas do contato@ para o spam.

### Arquivos de prompt
- Os antigos `PROMPT-*.md` estão em `_prompts/`, fora do git (ignorados por `.git/info/exclude`).
