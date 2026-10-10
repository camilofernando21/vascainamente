"""Posts dos setoristas do Vasco no X, lidos pela API oficial (cobrada por post lido).

Desligado enquanto não houver X_BEARER_TOKEN. Para gastar pouco:
- busca só os posts novos de cada perfil (since_id), sem retweets e sem respostas;
- na primeira leitura de um perfil só marca onde parou, sem publicar posts antigos;
- conta os posts lidos no mês em .x_state.json e para no teto X_MONTHLY_POST_LIMIT.
"""

import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

API = "https://api.x.com/2"
STATE_FILE = Path(".x_state.json")
SP_TZ = ZoneInfo("America/Sao_Paulo")

# perfis acompanhados (handle sem @, minúsculo). O nome exibido vem da própria API.
ACCOUNTS = ["vascodagama", "pabloramadas", "gustavotutinha", "pedrosa", "leolacerdantv"]
# perfil oficial do clube: o que ele posta é fato confirmado, e a escalação costuma vir só na imagem
OFFICIAL = {"vascodagama"}
# na primeira leitura de um perfil, posts mais novos que isso ainda viram notícia
FIRST_READ_HOURS = 3

# a cerca de US$ 0,005 por post, 2.000 posts dão uns US$ 10 por mês
DEFAULT_MONTHLY_LIMIT = 2000
MIN_TEXT = 60  # posts curtos ("Vamos!", emoji, link solto) não viram notícia


def _load_state() -> dict:
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")


def fetch_x_items() -> list:
    """Itens no mesmo formato das notícias do RSS: name, title, desc, link, image, from_x."""
    token = os.environ.get("X_BEARER_TOKEN", "").strip()
    if not token:
        return []

    headers = {"Authorization": f"Bearer {token}"}
    state = _load_state()
    month = datetime.now(SP_TZ).strftime("%Y-%m")
    if state.get("month") != month:
        state["month"] = month
        state["reads"] = 0
    limit = int(os.environ.get("X_MONTHLY_POST_LIMIT") or DEFAULT_MONTHLY_LIMIT)
    users = state.setdefault("users", {})
    since = state.setdefault("since", {})
    items = []

    try:
        # ids e nomes: uma consulta só, uma única vez por perfil
        missing = [h for h in ACCOUNTS if h not in users]
        if missing:
            r = requests.get(
                f"{API}/users/by",
                params={"usernames": ",".join(missing), "user.fields": "name"},
                headers=headers,
                timeout=20,
            )
            r.raise_for_status()
            for u in r.json().get("data", []):
                users[u["username"].lower()] = {"id": u["id"], "name": u["name"]}

        for handle in ACCOUNTS:
            user = users.get(handle)
            if not user:
                print(f"  X: perfil @{handle} não encontrado")
                continue
            if state["reads"] >= limit:
                print(f"  X: teto do mês atingido ({state['reads']} posts lidos), leitura pausada até o mês que vem")
                break

            first_time = handle not in since
            params = {
                "exclude": "retweets,replies",
                "tweet.fields": "created_at,attachments",
                "expansions": "attachments.media_keys",
                "media.fields": "url,type",
                "max_results": 5 if first_time else 20,
            }
            if not first_time:
                params["since_id"] = since[handle]
            r = requests.get(f"{API}/users/{user['id']}/tweets", params=params, headers=headers, timeout=20)
            if r.status_code == 429:
                print("  X: limite de consultas da API, tenta de novo na próxima rodada")
                break
            r.raise_for_status()
            body = r.json()
            posts = body.get("data", [])
            state["reads"] += len(posts)
            if body.get("meta", {}).get("newest_id"):
                since[handle] = body["meta"]["newest_id"]
            if first_time:
                # primeira leitura: só o que saiu nas últimas horas vira notícia, nada antigo
                print(f"  X: @{handle} começou a ser acompanhado")
                cutoff = datetime.now(SP_TZ) - timedelta(hours=FIRST_READ_HOURS)
                posts = [
                    p for p in posts
                    if p.get("created_at") and datetime.fromisoformat(p["created_at"].replace("Z", "+00:00")) >= cutoff
                ]

            media = {m["media_key"]: m for m in body.get("includes", {}).get("media", [])}
            for post in reversed(posts):  # do mais antigo para o mais novo
                text = " ".join(post.get("text", "").split())
                keys = post.get("attachments", {}).get("media_keys", [])
                photos = [media[k]["url"] for k in keys if k in media and media[k].get("type") == "photo" and media[k].get("url")]
                # post curto só passa com foto (a escalação oficial vem na arte, com pouco texto)
                if len(text) < MIN_TEXT and not photos:
                    continue
                items.append({
                    "name": f"{user['name']} (X)",
                    "title": text[:140],
                    "desc": text,
                    "link": f"https://x.com/{handle}/status/{post['id']}",
                    "image": photos[0] if photos else "",
                    "photos": photos[:2],
                    "official": handle in OFFICIAL,
                    "from_x": True,
                })
    except requests.RequestException as e:
        print(f"  ERRO X: {e}")
    finally:
        _save_state(state)

    print(f"  X: {len(items)} post(s) novo(s), {state['reads']} lido(s) no mês (teto {limit})")
    return items
