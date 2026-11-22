# Padrão das artes do Vascainamente (a partir de 22/11/2026)

Este é o layout padrão das artes de informação (jogo do dia, onde assistir, escalação, Quinta Histórica) em story e feed.

## Onde NÃO se aplica
As artes de notícia (Transferências, Resultados e demais categorias do robô de notícias) continuam no modelo atual, o do cartão com a Cruz de Malta pequena e o rótulo da categoria no topo, a manchete em Instrument Serif no meio e "vascainamente" com a data no rodapé. Decisão do Camilo em 22/11/2026: não mexer nesse modelo.

O que segue vale para as artes de informação. Os modelos prontos (PNG para ver) estão em `docs/modelos/`. Para gerar uma arte nova, não desenhe na mão: use o gerador.

## Como gerar
`python scripts/social_art/arte_info.py <arquivo.json> <pasta_saida>` cria `story.png` e `feed.png` juntos. O JSON tem `rotulo`, `titulo` (duas linhas) e `blocos` (de 1 a 4, cada um com `k` e `v`). Exemplo pronto: `scripts/social_art/exemplos/hoje-tem-vasco.json`. O gerador recusa travessão e avisa se algum bloco ficar colado ou sair da tela. Testes: `python3 -m unittest scripts/test_arte_info.py`.

## Formatos
- Story: 1080x1920. Feed: 1080x1350. Renderizar com Chromium (Playwright) em escala 2.
- Story: manter o conteúdo principal entre y 200 e y 1600, longe das bordas que o Instagram cobre.

## Visual
- Fundo `#0d0d0d`, texto `#F0EBE1` (creme), vermelho `#FF4D5E` só em texto. Grão por cima (`scripts/social_art/grain.png`).
- Fontes: Anton (títulos, caixa alta), Instrument Serif (informações), DM Mono (rótulos, caixa alta, espaçamento de letras). Arquivos em `scripts/social_art/fonts/`.
- Escudo no topo, ao lado do rótulo da competição. Escudo atual: `escudo-5-atual`. A Cruz de Malta vem sempre de `public/images/escudo-1-cruz.png`, nunca redesenhar.

## Estrutura (de cima para baixo)
1. Cabeçalho: escudo + rótulo (ex.: "Brasileirão · 36ª rodada").
   Em jogo do dia, os dois escudos grandes ficam fora do painel, ao lado do título, com o do mandante por cima do outro, sobrepondo de leve (campo `escudos` do JSON, mandante primeiro). Logos de canais (Premiere, SporTV) ficam à direita do bloco Assistir; logo escura precisa de placa clara.
2. Título em duas linhas: "Hoje tem" em creme e "Vasco" em vermelho, bem grandes.
3. Painel com borda creme de 6px e sombra dura de 12px. Dentro, um bloco por informação: rótulo em vermelho (DM Mono) e o texto embaixo em letra grande (Instrument Serif, 52 a 58px).
4. Rodapé: vascainamente.com.br e @_vascainamente_.

## Regras de legibilidade (o motivo da mudança)
- Nada colado: título, painel e rodapé sempre separados por espaço visível.
- Um assunto por bloco, letra grande, no máximo 4 blocos por painel.
- Contraste alto, sem traços ou enfeites decorativos.
- Conferir os limites das caixas depois de renderizar: nenhum bloco pode encostar em outro nem sair da tela.

## Regras de texto
- Português do Brasil, sem travessão (—) nem meia-risca (–).
- Antes de ir ao Camilo, todo texto passa por revisão de português feita por outro agente que veja só os textos (ortografia, acentos, concordância, modo verbal).
- Logos de terceiros só entram se o Camilo mandar o arquivo.
