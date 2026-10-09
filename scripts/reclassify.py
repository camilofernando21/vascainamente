#!/usr/bin/env python3
"""Reclassifica as notícias já publicadas: corrige só o `category` do frontmatter, sem tocar no texto.

Usa as mesmas categorias e definições do robô (fetch-news.py). Envia apenas título e resumo,
em lotes, para a chamada sair barata.

    python scripts/reclassify.py            # aplica
    python scripts/reclassify.py --dry-run  # só mostra o que mudaria
"""

import argparse
import importlib.util
import json
import re
import sys
from collections import Counter
from pathlib import Path

import anthropic

ROOT = Path(__file__).resolve().parent.parent
POSTS = ROOT / "content" / "noticias"
BATCH = 25

# fetch-news.py has a hyphen in its name, so load it by path to reuse its definitions
_spec = importlib.util.spec_from_file_location("fetch_news", ROOT / "scripts" / "fetch-news.py")
robot = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(robot)

FIELD = re.compile(r'^(title|excerpt|category):\s*"(.*)"\s*$', re.MULTILINE)
CATEGORY_LINE = re.compile(r'^category:\s*"[^"]*"\s*$', re.MULTILINE)


def read_post(path: Path) -> dict | None:
    text = path.read_text(encoding="utf-8")
    end = text.find("\n---", 4)
    if not text.startswith("---") or end == -1:
        return None
    fields = dict(FIELD.findall(text[:end]))
    if "category" not in fields:
        return None
    return {"path": path, "title": fields.get("title", ""), "excerpt": fields.get("excerpt", ""), "category": fields["category"]}


def ask(client: anthropic.Anthropic, batch: list) -> dict:
    listing = "\n".join(f'{i}. {p["title"]}\n   Resumo: {p["excerpt"]}' for i, p in enumerate(batch))
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=800,
        messages=[{
            "role": "user",
            "content": f"""Classifique cada notícia do Vasco da Gama abaixo em uma categoria.

{robot.CATEGORY_GUIDE}

Notícias:
{listing}

Retorne SOMENTE um JSON (sem markdown) no formato {{"0": "categoria", "1": "categoria", ...}}, com uma entrada para cada número.""",
        }],
    )
    text = response.content[0].text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def write_category(path: Path, category: str):
    raw = path.read_bytes().decode("utf-8")
    new, n = CATEGORY_LINE.subn(f'category: "{category}"', raw, count=1)
    if n == 1 and new != raw:
        path.write_bytes(new.encode("utf-8"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="não grava, só mostra as mudanças")
    parser.add_argument("--limit", type=int, default=0, help="processa só as N primeiras notícias")
    args = parser.parse_args()

    posts = [p for p in (read_post(f) for f in sorted(POSTS.glob("*.md"))) if p]
    if args.limit:
        posts = posts[: args.limit]
    print(f"{len(posts)} notícia(s). Antes: {dict(Counter(p['category'] for p in posts).most_common())}")

    client = anthropic.Anthropic()
    changes = []
    skipped = 0
    for start in range(0, len(posts), BATCH):
        batch = posts[start : start + BATCH]
        try:
            answer = ask(client, batch)
        except Exception as e:
            if robot.is_fatal_api_error(e):
                print(f"ERRO FATAL na API da Anthropic (autenticação, chave ou créditos): {e}")
                sys.exit(1)
            print(f"  ERRO no lote {start // BATCH + 1}, mantido como está: {e}")
            skipped += len(batch)
            continue
        for i, post in enumerate(batch):
            new = robot.valid_category(answer.get(str(i)))
            if not new:
                skipped += 1
                continue
            if new != post["category"]:
                changes.append((post, new))
            post["new"] = new

    for post, new in changes:
        print(f'  {post["category"]:>13} -> {new:<13} {post["title"][:90]}')
        if not args.dry_run:
            write_category(post["path"], new)

    after = Counter(p.get("new", p["category"]) for p in posts)
    print(f"\n{len(changes)} mudança(s), {skipped} sem resposta válida (mantidas).")
    print(f"Depois: {dict(after.most_common())}")
    if args.dry_run:
        print("(dry-run: nada foi gravado)")


if __name__ == "__main__":
    main()
