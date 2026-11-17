"""Postador automático do Vascainamente no X (fase 1).

Escolhe as matérias do site que merecem divulgação, monta o texto com um modelo fixo
(nenhuma frase nova é escrita por IA), valida e publica pela API oficial do X.

    python scripts/social_post.py            # usa SOCIAL_MODE
    SOCIAL_MODE = off | dry-run | auto       # padrão: off (não faz nada)

Segurança:
  * nenhum segredo no código: tudo por variável de ambiente (secrets do GitHub);
  * dry-run só mostra o que seria publicado (resumo da execução), não chama o X;
  * chave de desligar: SOCIAL_MODE=off (variável do repositório, sem mexer em código);
  * cada matéria sai no máximo uma vez, com limite diário e horário de silêncio;
  * erro 401/403 do X acende o alerta (execução vermelha); erro temporário tenta de novo na próxima rodada.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import sys
import time
import urllib.parse
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

ROOT = Path(__file__).resolve().parent.parent
NEWS_DIR = ROOT / "content" / "noticias"
STATE_FILE = ROOT / ".social_state.json"
TZ = ZoneInfo("America/Sao_Paulo")

SITE_URL = os.environ.get("SITE_URL", "https://www.vascainamente.com.br").rstrip("/")
MIN_IMPORTANCE = 4
# transferência é, em geral, rumor: nunca sai sozinha
BLOCKED_CATEGORIES = {"transferencia"}
MAX_AGE_HOURS = 3          # só divulga o que acabou de sair
MAX_PER_DAY = 6
MIN_GAP_MINUTES = 30       # intervalo entre posts
QUIET_START, QUIET_END = 0, 7  # silêncio de 0h às 7h (Brasília)
TWEET_LIMIT = 280
URL_WEIGHT = 23            # o X conta todo link como 23 caracteres
HASHTAG = "#Vasco"

DASHES = ("—", "–")  # travessão e meia-risca: proibidos em texto público


# ---------- leitura das matérias ----------

def parse_article(path: Path) -> dict | None:
    """Lê o cabeçalho da matéria (chave: "valor"). Devolve None se estiver quebrado."""
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        return None
    meta: dict = {}
    for line in m.group(1).splitlines():
        km = re.match(r"^([A-Za-z]+):\s*(.*)$", line)
        if not km:
            continue
        key, val = km.group(1), km.group(2).strip()
        if len(val) >= 2 and val[0] == val[-1] == '"':
            val = val[1:-1].replace('\\"', '"')
        meta[key] = val
    meta["_file"] = path.name
    return meta


def load_articles() -> list[dict]:
    items = []
    for path in sorted(NEWS_DIR.glob("*.md")):
        meta = parse_article(path)
        if not meta:
            continue
        if meta.get("slug") != path.stem:  # slug e nome do arquivo precisam bater
            continue
        try:
            meta["_date"] = datetime.fromisoformat(meta["date"])
            meta["_importance"] = int(meta.get("importance", "0"))
        except (KeyError, ValueError):
            continue
        items.append(meta)
    return items


# ---------- estado ----------

def load_state() -> dict:
    try:
        state = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        state = {}
    state.setdefault("posted", {})  # slug -> {"at": iso, "id": tweet id}
    state.setdefault("seen_dry", {})  # slug -> iso (ensaio, para não repetir no resumo)
    return state


def save_state(state: dict) -> None:
    # guarda só os últimos 60 dias para o arquivo não crescer sem fim
    cutoff = (datetime.now(TZ) - timedelta(days=60)).isoformat()
    for key in ("posted", "seen_dry"):
        state[key] = {
            k: v for k, v in state[key].items()
            if (v["at"] if isinstance(v, dict) else v) >= cutoff
        }
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")


# ---------- texto e validação ----------

def build_text(article: dict) -> str:
    title = " ".join(article["title"].split())
    url = f"{SITE_URL}/{article['slug']}"
    return f"{title}\n\n{url}\n\n{HASHTAG}"


def tweet_length(text: str) -> int:
    """Tamanho como o X conta: todo link vale 23 caracteres."""
    return len(re.sub(r"https?://\S+", "x" * URL_WEIGHT, text))


def validate(article: dict, text: str) -> list[str]:
    problems = []
    title = article.get("title", "")
    if not title.strip():
        problems.append("título vazio")
    if any(d in text for d in DASHES):
        problems.append("travessão ou meia-risca no texto")
    if re.search(r"\b(undefined|null|None|nan)\b", text):
        problems.append("campo vazio no texto")
    if tweet_length(text) > TWEET_LIMIT:
        problems.append(f"texto passa de {TWEET_LIMIT} caracteres ({tweet_length(text)})")
    if "  " in title or title != title.strip():
        problems.append("espaço duplo no título")
    if not article.get("source", "").strip():
        problems.append("matéria sem fonte")
    return problems


# ---------- escolha ----------

def pick(articles: list[dict], state: dict, now: datetime, mode: str) -> tuple[list[dict], list[str]]:
    """Devolve (matérias a publicar agora, motivos de cada recusa para o log)."""
    notes: list[str] = []
    local = now.astimezone(TZ)
    if QUIET_START <= local.hour < QUIET_END:
        return [], [f"horário de silêncio ({QUIET_START}h às {QUIET_END}h de Brasília)"]

    posted = state["posted"]
    today = local.date().isoformat()
    sent_today = sum(1 for v in posted.values() if v["at"][:10] == today)
    last = max((datetime.fromisoformat(v["at"]) for v in posted.values()), default=None)
    if last and now - last < timedelta(minutes=MIN_GAP_MINUTES) and mode == "auto":
        return [], [f"último post há menos de {MIN_GAP_MINUTES} minutos"]
    if sent_today >= MAX_PER_DAY and mode == "auto":
        return [], [f"limite de {MAX_PER_DAY} posts por dia atingido"]

    seen = state["seen_dry"] if mode == "dry-run" else {}
    candidates = []
    for a in articles:
        slug = a["slug"]
        if slug in posted or slug in seen:
            continue
        age = now - a["_date"]
        if age > timedelta(hours=MAX_AGE_HOURS) or age < timedelta(minutes=-5):
            continue
        if a["_importance"] < MIN_IMPORTANCE:
            continue
        if a.get("category") in BLOCKED_CATEGORIES:
            notes.append(f"{slug}: categoria {a.get('category')} não sai sozinha")
            continue
        candidates.append(a)

    # a mais importante primeiro, e entre iguais a mais recente; um post por rodada
    candidates.sort(key=lambda a: (a["_importance"], a["_date"]), reverse=True)
    return candidates[:1], notes


# ---------- X (OAuth 1.0a, contexto do usuário) ----------

def _enc(s: str) -> str:
    return urllib.parse.quote(str(s), safe="~")


def oauth1_signature(method: str, url: str, params: dict, api_secret: str, access_secret: str) -> str:
    norm = "&".join(f"{k}={v}" for k, v in sorted((_enc(k), _enc(v)) for k, v in params.items()))
    base = "&".join([method.upper(), _enc(url), _enc(norm)])
    key = f"{_enc(api_secret)}&{_enc(access_secret)}"
    return base64.b64encode(hmac.new(key.encode(), base.encode(), hashlib.sha1).digest()).decode()


def oauth1_header(method: str, url: str, creds: dict) -> str:
    params = {
        "oauth_consumer_key": creds["api_key"],
        "oauth_nonce": secrets.token_hex(16),
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": str(int(time.time())),
        "oauth_token": creds["access_token"],
        "oauth_version": "1.0",
    }
    # o corpo é JSON, então só os parâmetros do OAuth entram na assinatura
    params["oauth_signature"] = oauth1_signature(method, url, params, creds["api_secret"], creds["access_secret"])
    return "OAuth " + ", ".join(f'{_enc(k)}="{_enc(v)}"' for k, v in sorted(params.items()))


class XAuthError(Exception):
    pass


def post_to_x(text: str, creds: dict) -> tuple[str, str]:
    """Publica. Devolve ("ok", id) | ("duplicado", "") | ("tentar_depois", motivo). Erro de acesso levanta XAuthError."""
    url = "https://api.x.com/2/tweets"
    resp = requests.post(
        url,
        json={"text": text},
        headers={"Authorization": oauth1_header("POST", url, creds), "Content-Type": "application/json"},
        timeout=30,
    )
    if resp.status_code in (200, 201):
        return "ok", resp.json()["data"]["id"]
    body = resp.text[:300]
    if resp.status_code == 403 and "duplicate" in body.lower():
        return "duplicado", ""  # o X já tem esse texto: conta como publicado
    if resp.status_code in (401, 403):
        raise XAuthError(f"HTTP {resp.status_code}: {body}")
    return "tentar_depois", f"HTTP {resp.status_code}: {body}"


def x_credentials() -> dict | None:
    creds = {
        "api_key": os.environ.get("X_POST_API_KEY", ""),
        "api_secret": os.environ.get("X_POST_API_SECRET", ""),
        "access_token": os.environ.get("X_POST_ACCESS_TOKEN", ""),
        "access_secret": os.environ.get("X_POST_ACCESS_SECRET", ""),
    }
    return creds if all(creds.values()) else None


# ---------- execução ----------

def summary(line: str) -> None:
    print(line)
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if path:
        with open(path, "a", encoding="utf-8") as f:
            f.write(line + "\n")


def run(now: datetime | None = None) -> int:
    mode = os.environ.get("SOCIAL_MODE", "off").strip().lower()
    if mode not in ("off", "dry-run", "auto"):
        summary(f"SOCIAL_MODE inválido: {mode!r}. Use off, dry-run ou auto.")
        return 1
    if mode == "off":
        summary("Postador desligado (SOCIAL_MODE=off).")
        return 0

    now = now or datetime.now(TZ)
    state = load_state()
    chosen, notes = pick(load_articles(), state, now, mode)
    for n in notes:
        summary(f"- recusada: {n}")
    if not chosen:
        summary("Nada a publicar agora.")
        return 0

    article = chosen[0]
    text = build_text(article)
    problems = validate(article, text)
    if problems:
        summary(f"- BLOQUEADA ({article['slug']}): " + "; ".join(problems))
        # não tenta de novo para sempre: marca como vista, a matéria segue no site
        state["seen_dry"][article["slug"]] = now.isoformat()
        save_state(state)
        return 0

    if mode == "dry-run":
        summary(f"### Ensaio: isto seria publicado no X\n\n```\n{text}\n```\n({tweet_length(text)} de {TWEET_LIMIT} caracteres)")
        state["seen_dry"][article["slug"]] = now.isoformat()
        save_state(state)
        return 0

    creds = x_credentials()
    if not creds:
        summary("Faltam os segredos do X (X_POST_API_KEY, X_POST_API_SECRET, X_POST_ACCESS_TOKEN, X_POST_ACCESS_SECRET).")
        return 1
    try:
        status, info = post_to_x(text, creds)
    except XAuthError as exc:
        summary(f"O X recusou as chaves de postagem ({exc}). Gere as chaves de novo no console e atualize os secrets.")
        return 1
    if status == "tentar_depois":
        summary(f"Falha temporária ao publicar {article['slug']}: {info}. Tenta de novo na próxima rodada.")
        return 0
    state["posted"][article["slug"]] = {"at": now.isoformat(), "id": info}
    save_state(state)
    summary(f"Publicado no X ({status}): {article['title']}")
    return 0


if __name__ == "__main__":
    sys.exit(run())
