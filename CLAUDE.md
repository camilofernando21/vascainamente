# Vascainamente

Site de notícias do Vasco da Gama, publicado na Vercel a partir do ramo `master` do GitHub.

## Antes de qualquer coisa

- Rode `git pull` no início de toda sessão, antes de ler ou editar arquivos. O robô de notícias envia commits a cada 15 minutos e o projeto também é editado pelo Claude na web, então a cópia local fica desatualizada rápido.
- Se houver alterações locais não enviadas, avise antes de puxar.

## Regras do projeto

- Responda e escreva em português do Brasil.
- Nunca use travessão (—) nem meia-risca (–) em textos do site.
- A Cruz de Malta vem sempre de `public/images/escudo-1-cruz.png`. Nunca redesenhe a cruz.
- `.env.local` guarda a chave da API: nunca mostre o conteúdo nem envie para o GitHub.
- Matéria removida ou juntada com outra ganha redirecionamento em `content/redirects.json`, para os links compartilhados não quebrarem.
- Nenhuma chave, ID ou segredo vai escrito no código: tudo por variável de ambiente.
- Só envie (push) com autorização do usuário: o push publica o site na Vercel.
- O estado atual do projeto, as decisões e as pendências estão em `docs/CONTEXTO-CLAUDE-CODE.md`. Atualize esse arquivo ao terminar uma tarefa grande.
