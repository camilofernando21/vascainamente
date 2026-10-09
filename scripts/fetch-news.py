#!/usr/bin/env python3
"""Vascainamente News Fetcher — monitora RSS e publica notícias do Vasco."""

import feedparser
import json
import hashlib
import re
import os
import sys
import calendar
import unicodedata
import time
from datetime import datetime
from pathlib import Path
import anthropic

RSS_SOURCES = [
    {"name": "GE.Globo",           "url": "https://ge.globo.com/rss/ge/"},
    # Vasco-only ge feed (adds base and women's team news, tested 2026-10-09: 100 items)
    {"name": "GE.Globo",           "url": "https://ge.globo.com/rss/ge/futebol/times/vasco/"},
    {"name": "ESPN Brasil",        "url": "https://www.espn.com.br/rss/news"},
    {"name": "UOL Esporte",        "url": "https://rss.uol.com.br/feed/esporte.xml"},
    {"name": "Trivela",            "url": "https://trivela.com.br/feed/"},
    {"name": "Gazeta Esportiva",   "url": "https://www.gazetaesportiva.com/rss/"},
    # Lance! e Goal Brasil descontinuaram seus feeds RSS públicos (404/410
    # em todas as URLs conhecidas testadas em 2026-08-28). Reativar se/quando
    # publicarem um feed novamente.
    # vasco.com.br não tem RSS (site em app JS; /feed, /rss e wp-json dão 404 em 2026-10-09).
]

VASCO_KEYWORDS = [
    "vasco", "crvg", "cruz maltina", "são januário",
    "vasco da gama", "vascaíno", "vascaína",
]

# Categories the AI may choose, with the definitions it gets in the prompt (also used by reclassify.py).
CATEGORIES = ["transferencia", "resultado", "elenco", "base", "feminino", "clube", "urgente"]
CATEGORY_GUIDE = """Categorias (escolha UMA, pelo assunto principal da notícia):
- transferencia: chegada ou saída de jogador ou técnico, negociações, propostas, empréstimos, rescisões.
- resultado: jogo do time profissional masculino: prévia, onde assistir, placar, análise e repercussão da partida.
- elenco: lesão, escalação, treino, técnico e comissão, renovação de contrato, situação de jogadores do elenco.
- base: categorias de base (sub-15 a sub-20) e seus torneios.
- feminino: qualquer time feminino do Vasco.
- clube: diretoria, política, SAF, finanças, estádio, torcida, institucional e o que não couber acima.
- urgente: SOMENTE quando o clube anunciou oficialmente, no dia, algo grande. Na dúvida, use outra categoria."""

# Keyword fallback, used only when the AI answer is missing or invalid.
# Order matters: the most specific teams first. No "urgente" here (that is the AI's call).
CATEGORY_RULES = [
    ("feminino", r"\bfeminin|\bmeninas da colina|\bgigantes da colina\b"),
    ("base", r"\bsub-?\d{2}\b|categorias de base|\bda base\b|\bjunior(es)?\b"),
    ("transferencia", r"contrat|\breforço|\bassin(a|ou)\b|\bacert(a|ou)\b|negocia|transferência|emprestad|empréstimo|rescind|\bsaída\b|\bproposta\b"),
    ("elenco", r"escalaç|desfalque|\blesão\b|lesionad|\btreino\b|\brenova|departamento médico|\bdm\b"),
    ("resultado", r"\bvenc(e|eu)\b|\bperd(e|eu)\b|\bempat(a|ou)\b|\bgole(ia|ou)\b|\bvitória\b|\bderrota\b|\d+\s*x\s*\d+|onde assistir|\bao vivo\b"),
]

def is_vasco(title: str, desc: str = "") -> bool:
    title_lower = title.lower()
    desc_lower = desc.lower()

    VASCO_TERMS = [
        "vasco", "crvg", "cruz maltina", "são januário",
        "vasco da gama", "vascaíno", "gigante da colina"
    ]

    # A palavra "vasco" TEM que estar no TÍTULO
    # Não basta estar só na descrição
    title_has_vasco = any(term in title_lower for term in VASCO_TERMS)
    if not title_has_vasco:
        return False

    # Blacklist: se o título menciona rivais em destaque, rejeitar
    RIVALS = [
        "flamengo", "fluminense", "botafogo", "palmeiras",
        "corinthians", "são paulo", "santos", "atletico",
        "grêmio", "internacional", "cruzeiro", "bahia"
    ]

    # Se o título começa com rival ou rival aparece antes de "vasco", rejeitar
    for rival in RIVALS:
        if rival in title_lower:
            rival_pos = title_lower.find(rival)
            vasco_pos = min([title_lower.find(t) for t in VASCO_TERMS if t in title_lower], default=999)
            if rival_pos < vasco_pos:
                return False

    return True

def classify(title: str, desc: str = "") -> str:
    """Keyword fallback (word boundaries, so "com base em" is not "base")."""
    text = (title + " " + desc).lower()
    for cat, pattern in CATEGORY_RULES:
        if re.search(pattern, text):
            return cat
    return "clube"

def valid_category(value) -> str | None:
    """Accepts "Feminino", " transferência " etc.; anything outside the list is None."""
    if not isinstance(value, str):
        return None
    norm = unicodedata.normalize("NFKD", value.strip().lower()).encode("ascii", "ignore").decode()
    return norm if norm in CATEGORIES else None

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

# Official Vasco TV channel (public feed). Its recent videos are offered to the AI so a news item
# can carry the matching video (press conference, goals, behind the scenes).
VASCO_TV_FEED = "https://www.youtube.com/feeds/videos.xml?channel_id=UCZD5qcen7lbLPFTjfvdLFcw"
VIDEO_WINDOW_HOURS = 48

def fetch_recent_videos() -> list:
    """Videos from the last 48h. Any failure returns [] so news keep being published without video."""
    try:
        feed = feedparser.parse(VASCO_TV_FEED)
        if getattr(feed, "bozo", False) and not feed.entries:
            raise ValueError(feed.get("bozo_exception"))
        cutoff = time.time() - VIDEO_WINDOW_HOURS * 3600
        videos = []
        for entry in feed.entries:
            vid = entry.get("yt_videoid", "")
            published = entry.get("published_parsed")
            if not vid or not published or calendar.timegm(published) < cutoff:
                continue
            videos.append({"id": vid, "title": entry.get("title", "").strip()})
        print(f"Vasco TV: {len(videos)} video(s) nas ultimas {VIDEO_WINDOW_HOURS}h")
        return videos
    except Exception as e:
        print(f"  AVISO: feed da Vasco TV indisponivel, seguindo sem video: {e}")
        return []

def video_prompt(videos: list) -> str:
    if not videos:
        return ""
    lines = "\n".join(f"- {v['id']}: {v['title']}" for v in videos)
    return f"\nVídeos publicados nas últimas 48 horas no canal oficial Vasco TV (ID: título):\n{lines}\n"

VIDEO_FIELD = (
    "\n- \"videoId\": o ID de UM vídeo da lista acima que trate exatamente do mesmo assunto da notícia "
    "(mesmo jogo, mesma coletiva, mesmos bastidores, mesma pessoa e mesmo fato), ou null. "
    "Na dúvida, responda null: é melhor sem vídeo do que com vídeo errado."
)

# Matches a dash used as punctuation. Dashes between digits (placar 2–1, 2023–2024)
# become a hyphen so the meaning survives; everything else becomes a comma.
DIGIT_DASH = re.compile(r"(?<=\d)\s*[—–]\s*(?=\d)")
LINE_START_DASH = re.compile(r"^[ \t]*[—–][ \t]*", re.MULTILINE)
DASH = re.compile(r"[ \t]*[—–][ \t]*")
COMMA_BEFORE_PUNCT = re.compile(r",\s*([,.;:!?])")

def strip_dashes(text: str) -> str:
    """Remove travessão (—) e meia-risca (–) de texto visível no site."""
    text = DIGIT_DASH.sub("-", text)
    text = LINE_START_DASH.sub("", text)
    text = DASH.sub(", ", text)
    text = COMMA_BEFORE_PUNCT.sub(r"\1", text)
    return re.sub(r",[ \t]*$", "", text, flags=re.MULTILINE)

# Errors that will fail every call (bad key, no permission, no credits): stop the run
# with a non-zero exit so the GitHub Actions job goes red and sends the e-mail.
def is_fatal_api_error(e: Exception) -> bool:
    if isinstance(e, (anthropic.AuthenticationError, anthropic.PermissionDeniedError)):
        return True
    if isinstance(e, anthropic.APIStatusError):
        msg = str(e).lower()
        return "credit balance" in msg or "billing" in msg
    return False

def process_with_ai(client: anthropic.Anthropic, title: str, desc: str, source: str, videos: list) -> dict:
    video_field = VIDEO_FIELD if videos else ""
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1200,
        messages=[{
            "role": "user",
            "content": f"""Você é o editor do Vascainamente, portal de notícias do Vasco da Gama.
Escreva de forma direta, profissional e apaixonada pelo clube. NUNCA use linguagem de IA.
Regra de pontuação: nunca use travessão (—) nem meia-risca (–), use vírgula, ponto ou dois-pontos.

Artigo original:
Título: {title}
Trecho: {desc}
Fonte: {source}
{video_prompt(videos)}
{CATEGORY_GUIDE}

Retorne SOMENTE um JSON (sem markdown) com:
- "title": título reescrito: direto, preciso, sem sensacionalismo
- "excerpt": 2-3 frases naturais de resumo
- "body": 3-4 parágrafos desenvolvendo a notícia
- "seoTitle": título SEO (máx 60 chars)
- "seoDescription": meta description (máx 155 chars)
- "category": uma das categorias acima, exatamente como escrita{video_field}"""
        }]
    )
    text = response.content[0].text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    article = json.loads(text)
    # safety net in case the model ignores the punctuation rule
    for key in ("title", "excerpt", "body", "seoTitle", "seoDescription"):
        if isinstance(article.get(key), str):
            article[key] = strip_dashes(article[key])
    article["category"] = valid_category(article.get("category"))
    # only accept an ID that was actually offered: never trust a made-up one
    valid_ids = {v["id"] for v in videos}
    vid = article.get("videoId")
    article["videoId"] = vid if isinstance(vid, str) and vid in valid_ids else None
    return article

def publish(article: dict, category: str, source: str, url: str, image_url: str = ""):
    now = datetime.now()
    video_frontmatter = (
        f'videoId: "{article["videoId"]}"\nvideoSource: "Vasco TV"\n' if article.get("videoId") else ""
    )
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
{video_frontmatter}---

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
    videos = None  # fetched once, only when there is news to process

    if not os.environ.get("ANTHROPIC_API_KEY", "").strip():
        print("ERRO FATAL: ANTHROPIC_API_KEY ausente ou vazia.")
        sys.exit(1)
    try:
        client = anthropic.Anthropic()
    except anthropic.AnthropicError as e:
        print(f"ERRO FATAL: cliente da Anthropic não inicializou: {e}")
        sys.exit(1)

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

                try:
                    if videos is None:
                        videos = fetch_recent_videos()
                    article = process_with_ai(client, title, desc, src["name"], videos)
                    # AI category first; keyword rules only as a fallback
                    cat = article["category"] or classify(title, desc)
                    publish(article, cat, src["name"], link, image_url)
                    cache.add(fp)
                    published += 1
                except Exception as e:
                    if is_fatal_api_error(e):
                        print(f"ERRO FATAL na API da Anthropic (autenticação, chave ou créditos): {e}")
                        sys.exit(1)
                    print(f"  ERRO: {title[:60]}: {e}")

        except Exception as e:
            print(f"  ERRO RSS {src['name']}: {e}")

    save_cache(cache_file, cache)
    print(f"\n{published} noticia(s) publicada(s).")

if __name__ == "__main__":
    main()
