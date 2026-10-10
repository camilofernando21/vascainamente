#!/usr/bin/env bash
# Envia o que o robô publicou. Se outra rodada (ou outra pessoa) enviou commits nesse meio-tempo,
# junta as duas versões em vez de falhar: a notícia desta rodada nunca se perde num conflito.
set -u

git add content/noticias/ .news_cache.json $(ls .x_state.json 2>/dev/null)
git diff --staged --quiet && exit 0
git commit -q -m "feat(news): $(date +'%d/%m %H:%M') — novas notícias do Vasco"

for attempt in 1 2 3 4 5; do
  if ! git pull --rebase -q; then
    # conflito: junta os arquivos de controle e continua o rebase
    if ! { python scripts/resolve_conflicts.py && GIT_EDITOR=true git rebase --continue; }; then
      git rebase --abort
      echo "ERRO: conflito que o robô não resolve sozinho"
      exit 1
    fi
  fi
  git push -q && exit 0
  echo "push recusado, tentando de novo ($attempt)"
  sleep $((attempt * 3))
done
echo "ERRO: não foi possível enviar depois de 5 tentativas"
exit 1
