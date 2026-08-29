#!/usr/bin/env python3
"""Vascainamente News Fetcher — monitora RSS e publica notícias do Vasco."""

import feedparser
import json
import hashlib
import re
import os
from datetime import datetime
from pathlib import Path
import anthropic

RSS_SOURCES = [
    {"name": "GE.Globo",           "url": "https://ge.globo.com/rss/ge/"},
    {"name": "ESPN Brasil",        "url": "https://www.espn.com.br/rss/news"},
    {"name": "UOL Esporte",        "url": "https://rss.uol.com.br/feed/esporte.xml"},
    {"name": "Trivela",            "url": "https://trivela.com.br/feed/"},
    {"name": "Gazeta Esportiva",   "url": "https://www.gazetaesportiva.com/rss/"},
    # Lance! e Goal Brasil descontinuaram seus feeds RSS públicos (404/410
    # em todas as URLs conhecidas testadas em 2026-08-28). Reativar se/quando
    # publicarem um feed novamente.
]

VASCO_KEYWORDS = [
    "vasco", "crvg", "cruz maltina", "são januário",
    "vasco da gama", "vascaíno", "vascaína",
]

CATEGORY_MAP = {
    "urgente":     ["urgente", "oficial", "confirmado", "anunciado", "breaking"],
    "transferencia": ["contratou", "contratação", "reforço", "assinou", "acertou",
                      "negociação", "transferência", "emprestado", "rescindiu", "saída"],
    "resultado":   ["venceu", "perdeu", "empatou", "goleou", "placar",
                    "vitória", "derrota", "empate", " x "],
    "elenco":      ["escalação", "desfalque", "lesão", "recuperação", "titular"],
    "base":        ["sub-17", "sub-20", "base", "categorias de base"],
    "feminino":    ["feminino", "time feminino"],
}

def is_vasco(title: str, desc: str = "") -> bool:
    text = (title + " " + desc).lower()
    return any(kw in text for kw in VASCO_KEYWORDS)

def classify(title: str, desc: str = "") -> str:
    text = (title + " " + desc).lower()
    for cat, keywords in CATEGORY_MAP.items():
        if any(kw in text for kw in keywords):
            return cat
    return "clube"

def extract_image(entry) -> str:
    media = entry.get("media_content")
    if media and isinstance(media, list) and media[0].get("url"):
        return media[0]["url"]

    enclosures = entry.get("enclosures")
    if enclosures and isinstance(enclosures, list) and enclosures[0].get("href"):
        return enclosures[0]["href"]

    for link in entry.get("links") or []:
        if str(link.get("type", "")).startswith("image") and link.get("href"):
            return link["href"]

    return ""

def fingerprint(title: str) -> str:
    return hashlib.md5(title.lower().strip().encode()).hexdigest()[:12]

def load_cache(path: str) -> set:
    try:
        return set(json.loads(Path(path).read_text()))
    except Exception:
        return set()

def save_cache(path: str, data: set):
    Path(path).write_text(json.dumps(list(data)))

def slugify(text: str) -> str:
    text = text.lower()
    for a, b in [("á","a"),("à","a"),("ã","a"),("â","a"),("é","e"),("ê","e"),
                 ("í","i"),("ó","o"),("õ","o"),("ô","o"),("ú","u"),("ç","c")]:
        text = text.replace(a, b)
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text.strip())
    return text[:70]

def process_with_ai(title: str, desc: str, source: str) -> dict:
    client = anthropic.Anthropic()
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1200,
        messages=[{
            "role": "user",
            "content": f"""Você é o editor do Vascainamente, portal de notícias do Vasco da Gama.
Escreva de forma direta, profissional e apaixonada pelo clube. NUNCA use linguagem de IA.

Artigo original:
Título: {title}
Trecho: {desc}
Fonte: {source}

Retorne SOMENTE um JSON (sem markdown) com:
- "title": título reescrito — direto, preciso, sem sensacionalismo
- "excerpt": 2-3 frases naturais de resumo
- "body": 3-4 parágrafos desenvolvendo a notícia
- "seoTitle": título SEO (máx 60 chars)
- "seoDescription": meta description (máx 155 chars)"""
        }]
    )
    text = response.content[0].text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text)

def publish(article: dict, category: str, source: str, url: str, image_url: str = ""):
    now = datetime.now()
    slug = f"{now.strftime('%Y-%m-%d')}-{slugify(article['title'])}"
    date = now.strftime("%Y-%m-%dT%H:%M:%S-03:00")

    content = f"""---
title: "{article['title'].replace('"', "'")}"
slug: "{slug}"
date: "{date}"
category: "{category}"
source: "{source}"
sourceUrl: "{url}"
imageUrl: "{image_url}"
excerpt: "{article['excerpt'].replace('"', "'")}"
seoTitle: "{article.get('seoTitle', article['title']).replace('"', "'")}"
seoDescription: "{article.get('seoDescription', '').replace('"', "'")}"
---

{article['body']}
"""
    path = Path("content/noticias") / f"{slug}.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"OK {article['title']}")

def main():
    cache_file = ".news_cache.json"
    cache = load_cache(cache_file)
    published = 0

    for src in RSS_SOURCES:
        try:
            feed = feedparser.parse(src["url"])
            for entry in feed.entries[:15]:
                title = entry.get("title", "").strip()
                desc  = entry.get("summary", "").strip()
                link  = entry.get("link", "")
                image_url = extract_image(entry)

                if not title or not is_vasco(title, desc):
                    continue

                fp = fingerprint(title)
                if fp in cache:
                    continue

                cat = classify(title, desc)

                try:
                    article = process_with_ai(title, desc, src["name"])
                    publish(article, cat, src["name"], link, image_url)
                    cache.add(fp)
                    published += 1
                except Exception as e:
                    print(f"  ERRO: {title[:60]} — {e}")

        except Exception as e:
            print(f"  ERRO RSS {src['name']}: {e}")

    save_cache(cache_file, cache)
    print(f"\n{published} noticia(s) publicada(s).")

if __name__ == "__main__":
    main()
