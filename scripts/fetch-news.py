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
from zoneinfo import ZoneInfo
from pathlib import Path
import anthropic

from x_source import fetch_x_items

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
- resultado: jogo do time profissional masculino: prévia, onde assistir, placar, análise e repercussão da partida, e também o adversário do próximo jogo (lesões, escalação, técnico e arbitragem do rival).
- elenco: SOMENTE jogadores, técnico e comissão do Vasco: lesão, escalação, treino, renovação de contrato, situação no elenco. Jogador de outro clube nunca é elenco.
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
    # Sorted, and only written when it changes: a set has no stable order, so dumping it as-is
    # rewrote the file on every run, which made the workflow commit (and Vercel deploy) with no news.
    text = json.dumps(sorted(data))
    p = Path(path)
    if p.exists() and p.read_text() == text:
        return
    p.write_text(text)

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
MATCH_BROADCAST = re.compile(r"^\s*ao vivo\b.*\S\s+x\s+\S", re.IGNORECASE)

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
            # full match broadcasts ("AO VIVO - VASCO x OLARIA ...") last hours: not a news video.
            # Live press conferences ("AO VIVO | COLETIVA ...") stay.
            if MATCH_BROADCAST.search(entry.get("title", "")):
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
    return f"\nVídeos publicados nos últimos 3 dias no canal oficial Vasco TV (ID: título):\n{lines}\n"

VIDEO_FIELD = (
    "\n- \"videoId\": o ID de UM vídeo da lista acima SOMENTE se o vídeo mostrar o fato principal desta notícia: "
    "a partida, quando a notícia é o próprio jogo (resultado, gols, análise da partida); "
    "a coletiva, quando a notícia é sobre o que o técnico disse na coletiva; "
    "a zona mista, quando a notícia traz falas de jogadores logo após o jogo; "
    "o treino, quando a notícia é sobre aquele treino. "
    "Não basta ser do mesmo jogo ou citar a mesma pessoa. Para episódio pontual (lesão, desmaio, mensagem em rede social, "
    "polêmica, política, estádio, ingressos) ou se não estiver claro de onde veio a informação, responda null. "
    "Na dúvida, null: é melhor sem vídeo do que com vídeo errado."
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

# The servers run in UTC: every date written by the robot uses Sao Paulo time explicitly.
SP_TZ = ZoneInfo("America/Sao_Paulo")

# Same-fact detection: news published in the last 48h are sent to the AI (title + summary) in the
# same call that rewrites the article, so a story already covered by another source is skipped,
# or appended to the existing article when it brings important new information.
RECENT_WINDOW_HOURS = 72
RECENT_MAX = 60
FRONT_FIELD = re.compile(r'^(title|slug|date|excerpt|matchEvent):\s*"(.*)"\s*$', re.MULTILINE)

def load_recent_posts() -> list:
    cutoff = time.time() - RECENT_WINDOW_HOURS * 3600
    posts = []
    for path in Path("content/noticias").glob("*.md"):
        try:
            text = path.read_text(encoding="utf-8")
            end = text.find("\n---", 4)
            fields = dict(FRONT_FIELD.findall(text[:end]))
            ts = datetime.fromisoformat(fields["date"]).timestamp()
        except Exception:
            continue
        if ts >= cutoff:
            posts.append({
                "slug": fields.get("slug") or path.stem,
                "title": fields.get("title", ""),
                "excerpt": fields.get("excerpt", ""),
                "matchEvent": fields.get("matchEvent"),
                "path": path,
                "ts": ts,
            })
    posts.sort(key=lambda p: -p["ts"])
    return posts[:RECENT_MAX]

def recent_prompt(recent: list) -> str:
    if not recent:
        return ""
    lines = "\n".join(
        f"- {p['slug']}: {p['title']} | {p['excerpt'][:200]}" + (f" [{p['matchEvent']}]" if p.get("matchEvent") else "")
        for p in recent
    )
    return f"\nMatérias já publicadas no site nos últimos 3 dias (slug: título | resumo):\n{lines}\n"

DUPLICATE_FIELD = (
    "\n- \"duplicateOf\": o slug de UMA matéria publicada acima que noticia o MESMO fato desta notícia "
    "(o mesmo anúncio, a mesma decisão, o mesmo resultado, a mesma declaração), ou null. "
    "O site tem UMA matéria por fato. Regras para jogos: cada jogo tem no máximo UMA prévia (horário, onde assistir, "
    "provável escalação, 'tudo sobre', 'acompanhe ao vivo' e 'o que se sabe' são todos a mesma prévia) e UM resultado "
    "(placar, como foi, 'vence', 'bate', 'vira', 'atropela', 'empata' são o mesmo resultado). Se já existe a prévia "
    "ou o resultado daquele jogo, esta notícia é o mesmo fato. Também é o mesmo fato: a mesma entrevista ou coletiva da "
    "mesma pessoa, a mesma decisão da Justiça, o mesmo anúncio oficial, a mesma contratação, a mesma morte, contados "
    "com outras palavras ou por outro veículo. São fatos diferentes, e podem ser publicados: a prévia e o resultado "
    "do mesmo jogo, a fala de outra pessoa, uma análise ou bastidor com informação que a matéria publicada não tem. "
    "Os gols seguintes de um jogo são o mesmo fato da matéria do primeiro gol (marcada [gol]): use update com o novo "
    "placar e quem marcou. "
    "Na dúvida entre mesmo fato e fato novo sobre o mesmo jogo ou anúncio, é o mesmo fato."
    "\n- \"update\": somente se duplicateOf não for null. Use APENAS para um fato concreto e novo que muda o que o "
    "torcedor sabe e que NÃO está no título nem no resumo da matéria publicada: horário ou data definidos, ingressos "
    "à venda ou preço, local confirmado, lesão ou desfalque confirmado, valores de negócio, placar. Escreva 1 ou 2 "
    "frases como notícia, direto ao fato (nunca \"a notícia informa\" ou \"a fonte detalha\"). Nomes, cargos, "
    "grafias, detalhes do processo ou outra forma de contar o mesmo fato NÃO são novidade: nesses casos, null."
)

X_NOTE = (
    "\nATENÇÃO: o texto acima é um post de um setorista no X, não uma matéria pronta. "
    "Se ele não trouxer uma informação concreta e nova sobre o Vasco (contratação, saída, lesão, escalação, "
    "bastidor apurado, data ou local de jogo), responda SOMENTE {\"skip\": true}. "
    "Opinião, piada, enquete, palpite, divulgação de live ou de outro conteúdo também são skip. "
    "Se for notícia, trate como apuração do setorista: diga no título ou no primeiro parágrafo que a informação é dele "
    "(por exemplo \"segundo o setorista ...\"), não afirme como fato confirmado pelo clube e não invente detalhes "
    "que não estão no post.\n"
)

OFFICIAL_NOTE = (
    "\nATENÇÃO: o texto acima é um post do perfil oficial do Vasco no X. O que ele informa é oficial e pode ser "
    "afirmado como fato (\"o Vasco divulgou\", \"o clube confirmou\"). É notícia: escalação confirmada, gol, resultado "
    "final, contratação, saída, renovação, lesão, comunicado oficial, ingressos, data ou local de jogo. Se houver imagem, "
    "leia nela os nomes da escalação, o placar ou o comunicado. Marketing, produto, sócio-torcedor, meme, contagem "
    "regressiva, aniversário, convite para live, bastidor sem informação e lances do jogo que não são gol (cartão, "
    "substituição, intervalo, chance perdida) são skip: responda SOMENTE {\"skip\": true}. Nunca invente nome, "
    "número ou placar que não esteja no texto ou na imagem.\n"
)

def process_with_ai(client: anthropic.Anthropic, title: str, desc: str, source: str, videos: list, recent: list | None = None, from_x: bool = False, official: bool = False, photos: list | None = None) -> dict:
    recent = recent or []
    video_field = VIDEO_FIELD if videos else ""
    duplicate_field = DUPLICATE_FIELD if recent else ""
    prompt = f"""Você é o editor do Vascainamente, portal de notícias do Vasco da Gama.
Escreva de forma direta, profissional e apaixonada pelo clube. NUNCA use linguagem de IA.
Regra de pontuação: nunca use travessão (—) nem meia-risca (–), use vírgula, ponto ou dois-pontos.

Artigo original:
Título: {title}
Trecho: {desc}
Fonte: {source}
{(OFFICIAL_NOTE if official else X_NOTE) if from_x else ""}{video_prompt(videos)}{recent_prompt(recent)}
{CATEGORY_GUIDE}

Retorne SOMENTE um JSON (sem markdown) com:
- "title": título reescrito: direto, preciso, sem sensacionalismo
- "excerpt": 2-3 frases naturais de resumo
- "body": 3-4 parágrafos desenvolvendo a notícia
- "seoTitle": título SEO (máx 60 chars)
- "seoDescription": meta description (máx 155 chars)
- "category": uma das categorias acima, exatamente como escrita
- "importance": número de 1 a 5, o peso da notícia para o torcedor do Vasco hoje. 5: anúncio oficial grande (contratação ou saída de peso, título, troca de técnico, decisão que muda a temporada). 4: resultado de jogo do time principal, lesão séria de titular, negociação avançada de peso. 3: prévia de jogo importante, notícia relevante do elenco ou do clube. 2: bastidores, declarações, base, feminino. 1: curiosidade, adversário, notícia lateral
- "matchEvent": "escalacao" se for o time titular do Vasco CONFIRMADO para o jogo de hoje (escalado, time "
confirmado; provável escalação não conta), "gol" se for um gol do jogo em andamento, "resultado" se for o placar "
final de um jogo do time principal, ou null{video_field}{duplicate_field}"""
    # photos from the official account carry the lineup or the score: the model reads them
    content = [{"type": "image", "source": {"type": "url", "url": u}} for u in (photos or [])]
    content.append({"type": "text", "text": prompt})
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1200,
        messages=[{"role": "user", "content": content}],
    )
    text = response.content[0].text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    article = json.loads(text)
    if article.get("skip") is True:
        return {"skip": True}
    # safety net in case the model ignores the punctuation rule
    for key in ("title", "excerpt", "body", "seoTitle", "seoDescription"):
        if isinstance(article.get(key), str):
            article[key] = strip_dashes(article[key])
    article["category"] = valid_category(article.get("category"))
    imp = article.get("importance")
    article["importance"] = int(imp) if isinstance(imp, (int, float)) and 1 <= int(imp) <= 5 else None
    event = article.get("matchEvent")
    article["matchEvent"] = event if event in MATCH_EVENTS else None
    # only accept an ID that was actually offered: never trust a made-up one
    valid_ids = {v["id"] for v in videos}
    vid = article.get("videoId")
    article["videoId"] = vid if isinstance(vid, str) and vid in valid_ids else None
    # same-fact check: only a slug that was actually offered counts
    by_slug = {p["slug"]: p for p in recent}
    dup = article.get("duplicateOf")
    article["duplicateOf"] = by_slug.get(dup) if isinstance(dup, str) else None
    # official lineup and goals are news of their own: never folded into the preview of the match
    same = article["duplicateOf"]
    if same and article["matchEvent"] in EVENT_SAME_AS and same.get("matchEvent") not in EVENT_SAME_AS[article["matchEvent"]]:
        article["duplicateOf"] = None
    upd = article.get("update")
    article["update"] = strip_dashes(upd.strip()) if article["duplicateOf"] and isinstance(upd, str) and upd.strip() else None
    return article

MATCH_EVENTS = {"escalacao", "gol", "resultado"}
# an official lineup or a goal only repeats an article of these events (the result keeps the AI's call)
EVENT_SAME_AS = {"escalacao": {"escalacao"}, "gol": {"gol", "resultado"}}

UPDATED_LINE = re.compile(r'^updated:\s*"[^"]*"\s*\n', re.MULTILINE)

def apply_update(post: dict, update: str, source: str, url: str):
    """Appends the new information to the existing article and marks it as updated (no new page)."""
    now = datetime.now(SP_TZ)
    path = post["path"]
    text = path.read_text(encoding="utf-8")
    end = text.find("\n---", 4)
    front, body = text[:end], text[end:]
    front = UPDATED_LINE.sub("", front + "\n").rstrip("\n")
    front += f'\nupdated: "{now.isoformat(timespec="seconds")}"'
    credit = f" ([{source}]({url}))" if url else f" ({source})"
    note = f"\n\n**Atualização em {now.strftime('%d/%m')} às {now.strftime('%H:%M')}:** {update}{credit}\n"
    path.write_text(front + body.rstrip("\n") + note, encoding="utf-8")
    print(f"ATUALIZADA {post['slug']}: {update}")

def publish(article: dict, category: str, source: str, url: str, image_url: str = ""):
    now = datetime.now(SP_TZ)
    video_frontmatter = (
        f'videoId: "{article["videoId"]}"\nvideoSource: "Vasco TV"\n' if article.get("videoId") else ""
    )
    importance_frontmatter = f'importance: {article["importance"]}\n' if article.get("importance") else ""
    if article.get("matchEvent"):
        importance_frontmatter += f'matchEvent: "{article["matchEvent"]}"\n'
    slug = f"{now.strftime('%Y-%m-%d')}-{slugify(article['title'])}"
    date = now.isoformat(timespec="seconds")  # e.g. 2026-10-10T00:36:12-03:00

    content = f"""---
title: "{article['title'].replace('"', "'")}"
slug: "{slug}"
date: "{date}"
category: "{category}"
{importance_frontmatter}source: "{source}"
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
    skipped = 0
    updated = 0
    videos = None  # fetched once, only when there is news to process

    if not os.environ.get("ANTHROPIC_API_KEY", "").strip():
        print("ERRO FATAL: ANTHROPIC_API_KEY ausente ou vazia.")
        sys.exit(1)
    try:
        client = anthropic.Anthropic()
    except anthropic.AnthropicError as e:
        print(f"ERRO FATAL: cliente da Anthropic não inicializou: {e}")
        sys.exit(1)

    # every source becomes the same kind of item: RSS news and the beat reporters' posts on X
    items = []
    for src in RSS_SOURCES:
        try:
            feed = feedparser.parse(src["url"])
            for entry in feed.entries[:15]:
                title = entry.get("title", "").strip()
                desc = entry.get("summary", "").strip()
                if not title or not is_vasco(title, desc):
                    continue
                items.append({
                    "name": src["name"],
                    "title": title,
                    "desc": desc,
                    "link": entry.get("link", ""),
                    "image": extract_image(entry),
                    "from_x": False,
                })
        except Exception as e:
            print(f"  ERRO RSS {src['name']}: {e}")
    # beat reporters cover only Vasco, so their posts skip the title filter: the AI decides what is news
    items.extend(fetch_x_items())

    for item in items:
        title, desc, link = item["title"], item["desc"], item["link"]
        fp = fingerprint(item["link"] if item["from_x"] else title)
        if fp in cache:
            continue

        try:
            if videos is None:
                videos = fetch_recent_videos()
            # re-read on every item: includes what this same run has just published
            recent = load_recent_posts()
            article = process_with_ai(
                client, title, desc, item["name"], videos, recent,
                from_x=item["from_x"], official=item.get("official", False), photos=item.get("photos"),
            )
            if article.get("skip"):
                print(f"PULADA (post sem notícia): {title[:60]}")
                skipped += 1
                cache.add(fp)
                continue
            if article["duplicateOf"]:
                dup = article["duplicateOf"]
                if article["update"]:
                    apply_update(dup, article["update"], item["name"], link)
                    updated += 1
                else:
                    print(f"PULADA (mesmo fato de {dup['slug']}): {title}")
                    skipped += 1
                cache.add(fp)
                continue
            # AI category first; keyword rules only as a fallback
            cat = article["category"] or classify(title, desc)
            publish(article, cat, item["name"], link, item["image"])
            cache.add(fp)
            published += 1
        except Exception as e:
            if is_fatal_api_error(e):
                print(f"ERRO FATAL na API da Anthropic (autenticação, chave ou créditos): {e}")
                sys.exit(1)
            print(f"  ERRO: {title[:60]}: {e}")

    save_cache(cache_file, cache)
    print(f"\n{published} noticia(s) publicada(s), {updated} atualizada(s), {skipped} pulada(s) (mesmo fato ou post sem notícia).")

if __name__ == "__main__":
    main()
