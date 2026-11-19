"""Postador automático do Vascainamente no Instagram (fase 2).

Escolhe as matérias que merecem divulgação (mesmas regras de nota e de idade do X), gera a arte
no formato feed (1080x1350), monta a legenda com um modelo fixo (nenhuma frase nova é escrita por IA)
e publica pela API oficial da Meta (API do Instagram com login do Instagram).

    python scripts/instagram_post.py prepare   # escolhe, valida e gera a arte (e a legenda)
    python scripts/instagram_post.py publish   # só no modo auto: publica o que o prepare deixou pronto
    INSTAGRAM_MODE = off | check | dry-run | auto   # padrão: off (não faz nada)

O Instagram só aceita imagem por endereço público. O workflow envia a arte para o ramo `social-img`
do repositório (público) entre as duas etapas, e o publish espera o endereço responder antes de postar.

Segurança:
  * nenhum segredo no código: INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_USER_ID vêm dos secrets do GitHub;
  * o token nunca é impresso, nem em erro (as mensagens de erro de rede não levam o endereço);
  * check só pergunta ao Instagram de quem é o token, sem publicar nada;
  * dry-run mostra legenda e arte no resumo da execução, não chama o Instagram;
  * chave de desligar: INSTAGRAM_MODE=off (variável do repositório);
  * cada matéria sai no máximo uma vez, com limite diário, intervalo e horário de silêncio.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
import social_post as sp  # noqa: E402  (leitura das matérias, fuso, resumo e regras comuns)

ROOT = sp.ROOT
OUT_DIR = sp.OUT_DIR / "ig"
PENDING = OUT_DIR / "pending.json"
STATE_FILE = ROOT / ".instagram_state.json"
TZ = sp.TZ

API_INSTAGRAM = "https://graph.instagram.com/v23.0"  # token do login do Instagram (começa com IG)
API_FACEBOOK = "https://graph.facebook.com/v23.0"    # token do login da Meta/portfólio (começa com EAA)
IMAGE_BRANCH = "social-img"
MAX_IMAGE_BYTES = 8 * 1024 * 1024  # limite do Instagram para JPEG

MIN_IMPORTANCE = sp.MIN_IMPORTANCE
BLOCKED_CATEGORIES = sp.BLOCKED_CATEGORIES
MAX_AGE_HOURS = sp.MAX_AGE_HOURS
MAX_PER_DAY = 3            # o feed é vitrine: menos posts que o X
MIN_GAP_MINUTES = 60
QUIET_START, QUIET_END = sp.QUIET_START, sp.QUIET_END
CAPTION_LIMIT = 2200
MAX_HASHTAGS = 30
HASHTAGS = "#Vasco #VascodaGama"


class InstaAuthError(Exception):
    pass


# ---------- estado ----------

def load_state() -> dict:
    try:
        state = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        state = {}
    state.setdefault("posted", {})    # slug -> {"at": iso, "id": id da publicação}
    state.setdefault("seen_dry", {})  # slug -> iso
    return state


def save_state(state: dict) -> None:
    cutoff = (datetime.now(TZ) - timedelta(days=60)).isoformat()
    for key in ("posted", "seen_dry"):
        state[key] = {
            k: v for k, v in state[key].items()
            if (v["at"] if isinstance(v, dict) else v) >= cutoff
        }
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")


# ---------- legenda e validação ----------

def build_caption(article: dict) -> str:
    title = " ".join(article["title"].split())
    source = " ".join(article.get("source", "").split())
    return f"{title}\n\nMatéria completa no link da bio.\n\nFonte: {source}\n\n{HASHTAGS}"


def validate(article: dict, caption: str) -> list[str]:
    problems = []
    title = article.get("title", "")
    if not title.strip():
        problems.append("título vazio")
    if any(d in caption for d in sp.DASHES):
        problems.append("travessão ou meia-risca na legenda")
    if re.search(r"\b(undefined|null|None|nan)\b", caption):
        problems.append("campo vazio na legenda")
    if len(caption) > CAPTION_LIMIT:
        problems.append(f"legenda passa de {CAPTION_LIMIT} caracteres ({len(caption)})")
    if caption.count("#") > MAX_HASHTAGS:
        problems.append(f"mais de {MAX_HASHTAGS} hashtags")
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

    candidates.sort(key=lambda a: (a["_importance"], a["_date"]), reverse=True)
    return candidates[:1], notes


# ---------- arte ----------

def render_feed(article: dict) -> Path | None:
    """Gera a arte no formato feed (JPEG). Sem arte não há post: o Instagram não publica só texto."""
    try:
        sys.path.insert(0, str(ROOT / "scripts" / "social_art"))
        import render_art  # noqa: PLC0415

        OUT_DIR.mkdir(parents=True, exist_ok=True)
        path = OUT_DIR / f"{article['slug'][:80]}.jpg"
        dados = render_art.dados_da_materia(article)
        try:
            render_art.render(dados, "feed", path)
        except Exception as exc:  # noqa: BLE001
            if "Executable doesn't exist" not in str(exc):
                raise
            import subprocess  # noqa: PLC0415

            subprocess.run([sys.executable, "-m", "playwright", "install", "--with-deps", "chromium"], check=True)
            render_art.render(dados, "feed", path)
        if not path.exists() or path.stat().st_size > MAX_IMAGE_BYTES:
            sp.summary("- arte descartada: arquivo ausente ou acima de 8 MB")
            return None
        return path
    except Exception as exc:  # noqa: BLE001
        sp.summary(f"- arte não gerada ({type(exc).__name__}: {str(exc)[:120]})")
        return None


def image_url(filename: str) -> str:
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    return f"https://raw.githubusercontent.com/{repo}/{IMAGE_BRANCH}/ig/{filename}"


def wait_for_image(url: str, tries: int = 12, pause: int = 5) -> bool:
    """Espera o endereço público da arte responder (o ramo acabou de receber o arquivo)."""
    for _ in range(tries):
        try:
            r = requests.head(url, timeout=15, allow_redirects=True)
            if r.status_code == 200 and "image" in r.headers.get("content-type", ""):
                return True
        except requests.RequestException:
            pass
        time.sleep(pause)
    return False


# ---------- Instagram (API com login do Instagram) ----------

def credentials() -> dict | None:
    creds = {
        "token": "".join(os.environ.get("INSTAGRAM_ACCESS_TOKEN", "").split()),  # tira espaço e quebra de linha colados junto
        "user_id": "".join(os.environ.get("INSTAGRAM_USER_ID", "").split()),
    }
    return creds if all(creds.values()) else None


def api_base(creds: dict) -> str:
    """O endereço certo depende do tipo do token: EAA... vale no graph.facebook.com, IG... no graph.instagram.com."""
    return API_FACEBOOK if creds["token"].startswith("EAA") else API_INSTAGRAM


def _headers(creds: dict) -> dict:
    return {"Authorization": f"Bearer {creds['token']}"}


def _send(method: str, url: str, creds: dict, bearer: bool, **kw) -> requests.Response:
    """Uma chamada sem vazar endereço ou token em caso de erro de rede."""
    kw = dict(kw)
    if bearer:
        headers = _headers(creds)
    else:
        headers = {}
        key = "params" if method == "GET" else "data"
        kw[key] = {**kw.get(key, {}), "access_token": creds["token"]}
    try:
        return requests.request(method, url, headers=headers, timeout=60, **kw)
    except requests.RequestException as exc:
        raise ConnectionError(f"falha de rede ({type(exc).__name__})") from None


def _call(method: str, url: str, creds: dict, **kw) -> requests.Response:
    """Tenta o token no cabeçalho; se o Instagram disser que não consegue ler, tenta como parâmetro."""
    resp = _send(method, url, creds, creds.get("bearer", True), **kw)
    if resp.status_code == 401 and "Cannot parse access token" in resp.text and "bearer" not in creds:
        creds["bearer"] = False
        resp = _send(method, url, creds, False, **kw)
    return resp


def _is_auth_error(resp: requests.Response) -> bool:
    if resp.status_code in (401, 403):
        return True
    try:
        return resp.json().get("error", {}).get("code") in (190, 102)
    except ValueError:
        return False


def check_instagram(creds: dict) -> tuple[bool, str]:
    """Confere o token sem publicar: pergunta ao Instagram de quem ele é."""
    resp = _call("GET", f"{api_base(creds)}/{creds['user_id']}", creds, params={"fields": "username,account_type"})
    if resp.status_code == 200:
        data = resp.json()
        return True, f"@{data.get('username', '?')} ({data.get('account_type', '?')})"
    return False, f"HTTP {resp.status_code}: {resp.text[:200]}. {describe_token(creds['token'])}"


def describe_token(token: str) -> str:
    """Pista para achar erro de colagem sem revelar o token: só tamanho, 4 primeiras letras e caracteres estranhos."""
    odd = sum(1 for c in token if not (c.isascii() and (c.isalnum() or c in "_-.")))
    return f"Pista do segredo: {len(token)} caracteres, começa com {token[:4]!r}, {odd} caractere(s) fora do padrão."


def publish_image(url: str, caption: str, creds: dict) -> tuple[str, str]:
    """Devolve ("ok", id) | ("tentar_depois", motivo). Erro de acesso levanta InstaAuthError."""
    resp = _call("POST", f"{api_base(creds)}/{creds['user_id']}/media", creds, data={"image_url": url, "caption": caption})
    if _is_auth_error(resp):
        raise InstaAuthError(f"HTTP {resp.status_code}: {resp.text[:200]}")
    if resp.status_code != 200:
        return "tentar_depois", f"criar publicação, HTTP {resp.status_code}: {resp.text[:200]}"
    container = resp.json()["id"]

    for _ in range(12):  # até 1 minuto para o Instagram baixar e processar a imagem
        st = _call("GET", f"{api_base(creds)}/{container}", creds, params={"fields": "status_code"})
        code = st.json().get("status_code") if st.status_code == 200 else None
        if code == "FINISHED":
            break
        if code in ("ERROR", "EXPIRED"):
            return "tentar_depois", f"o Instagram recusou a imagem (status {code})"
        time.sleep(5)
    else:
        return "tentar_depois", "o Instagram não terminou de processar a imagem a tempo"

    resp = _call("POST", f"{api_base(creds)}/{creds['user_id']}/media_publish", creds, data={"creation_id": container})
    if _is_auth_error(resp):
        raise InstaAuthError(f"HTTP {resp.status_code}: {resp.text[:200]}")
    if resp.status_code != 200:
        return "tentar_depois", f"publicar, HTTP {resp.status_code}: {resp.text[:200]}"
    return "ok", resp.json()["id"]


# ---------- execução ----------

MISSING = "Faltam os segredos do Instagram (INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_USER_ID)."


def run(phase: str = "prepare", now: datetime | None = None) -> int:
    mode = os.environ.get("INSTAGRAM_MODE", "off").strip().lower()
    if mode not in ("off", "check", "dry-run", "auto"):
        sp.summary(f"INSTAGRAM_MODE inválido: {mode!r}. Use off, check, dry-run ou auto.")
        return 1
    if mode == "off":
        sp.summary("Postador do Instagram desligado (INSTAGRAM_MODE=off).")
        return 0

    if mode == "check":
        creds = credentials()
        if not creds:
            sp.summary(MISSING)
            return 1
        try:
            ok, info = check_instagram(creds)
        except ConnectionError as exc:
            sp.summary(f"Não consegui falar com o Instagram: {exc}")
            return 1
        sp.summary(f"Token do Instagram válido, conta {info}." if ok else f"O Instagram recusou o token: {info}")
        return 0 if ok else 1

    if phase == "publish":
        return publish_pending(mode, now or datetime.now(TZ))

    now = now or datetime.now(TZ)
    PENDING.unlink(missing_ok=True)
    state = load_state()
    chosen, notes = pick(sp.load_articles(), state, now, mode)
    for n in notes:
        sp.summary(f"- recusada: {n}")
    if not chosen:
        sp.summary("Nada a publicar no Instagram agora.")
        return 0

    article = chosen[0]
    caption = build_caption(article)
    problems = validate(article, caption)
    if problems:
        sp.summary(f"- BLOQUEADA ({article['slug']}): " + "; ".join(problems))
        state["seen_dry"][article["slug"]] = now.isoformat()
        save_state(state)
        return 0

    img = render_feed(article)
    if not img:
        sp.summary(f"- sem arte para {article['slug']}: não publica; tenta de novo na próxima rodada.")
        return 0

    if mode == "dry-run":
        sp.summary(f"### Ensaio: isto seria publicado no Instagram (arte {img.name})\n\n```\n{caption}\n```\n({len(caption)} de {CAPTION_LIMIT} caracteres)")
        state["seen_dry"][article["slug"]] = now.isoformat()
        save_state(state)
        return 0

    PENDING.write_text(json.dumps({"slug": article["slug"], "title": article["title"], "caption": caption, "image": img.name}, ensure_ascii=False), encoding="utf-8")
    sp.summary(f"Arte pronta para publicar: {img.name}")
    return 0


def publish_pending(mode: str, now: datetime) -> int:
    if mode != "auto":
        return 0
    if not PENDING.exists():
        sp.summary("Nada pronto para publicar no Instagram.")
        return 0
    pending = json.loads(PENDING.read_text(encoding="utf-8"))
    creds = credentials()
    if not creds:
        sp.summary(MISSING)
        return 1

    url = image_url(pending["image"])
    if not wait_for_image(url):
        sp.summary(f"A arte ainda não está no endereço público ({pending['image']}); tenta de novo na próxima rodada.")
        return 0
    try:
        status, info = publish_image(url, pending["caption"], creds)
    except InstaAuthError as exc:
        sp.summary(f"O Instagram recusou o token ({exc}). Gere o token de novo e atualize o secret.")
        return 1
    except ConnectionError as exc:
        sp.summary(f"Falha temporária ao publicar {pending['slug']}: {exc}. Tenta de novo na próxima rodada.")
        return 0
    if status == "tentar_depois":
        sp.summary(f"Falha temporária ao publicar {pending['slug']}: {info}. Tenta de novo na próxima rodada.")
        return 0
    state = load_state()
    state["posted"][pending["slug"]] = {"at": now.isoformat(), "id": info}
    save_state(state)
    PENDING.unlink(missing_ok=True)
    sp.summary(f"Publicado no Instagram: {pending['title']}")
    return 0


if __name__ == "__main__":
    sys.exit(run(sys.argv[1] if len(sys.argv) > 1 else "prepare"))
