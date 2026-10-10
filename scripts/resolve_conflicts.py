"""Resolve um conflito de rebase entre duas rodadas do robô, sem perder notícia.

Chamado pelo scripts/commit-news.sh quando o `git pull --rebase` para num conflito
(outra rodada enviou commits depois que esta baixou o código). Junta os arquivos de controle:
- .news_cache.json: a união das notícias já vistas pelas duas rodadas;
- .x_state.json: o ponto mais novo de cada perfil no X e a maior contagem do mês;
- matéria em conflito (as duas rodadas atualizaram a mesma): fica a versão já publicada.
Qualquer outro arquivo em conflito é erro: o script sai com 1 e o rebase é abortado.
"""

import json
import subprocess
import sys


def git(*args: str) -> str:
    return subprocess.run(["git", *args], check=True, capture_output=True, text=True, encoding="utf-8").stdout


def side(path: str, stage: int):
    # durante o rebase, o estágio 2 é o que já está no GitHub e o 3 é o commit desta rodada
    try:
        return json.loads(git("show", f":{stage}:{path}"))
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        return None


def merge_cache(path: str) -> None:
    merged = set(side(path, 2) or []) | set(side(path, 3) or [])
    with open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps(sorted(merged)))


def merge_x_state(path: str) -> None:
    a, b = side(path, 2) or {}, side(path, 3) or {}
    if a.get("month") != b.get("month"):
        merged = a if (a.get("month") or "") > (b.get("month") or "") else b
    else:
        merged = dict(b)
        merged["reads"] = max(a.get("reads", 0), b.get("reads", 0))
        merged["users"] = {**a.get("users", {}), **b.get("users", {})}
        since = {}
        for handle in set(a.get("since", {})) | set(b.get("since", {})):
            ids = [s.get("since", {}).get(handle) for s in (a, b)]
            since[handle] = max((i for i in ids if i), key=int)
        merged["since"] = since
    with open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps(merged, ensure_ascii=False, indent=1, sort_keys=True) + "\n")


def main() -> int:
    conflicted = [p for p in git("diff", "--name-only", "--diff-filter=U").splitlines() if p]
    for path in conflicted:
        if path == ".news_cache.json":
            merge_cache(path)
        elif path == ".x_state.json":
            merge_x_state(path)
        elif path.startswith("content/noticias/"):
            git("checkout", "--ours", "--", path)
            print(f"  conflito em {path}: mantida a versão já publicada")
        else:
            print(f"  conflito que o robô não resolve sozinho: {path}")
            return 1
        git("add", "--", path)
        print(f"  conflito resolvido: {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
