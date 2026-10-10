"""Posts dos setoristas do Vasco no X, lidos pela API oficial (cobrada por post lido).

Desligado enquanto não houver X_BEARER_TOKEN. Para gastar pouco:
- busca só os posts novos de cada perfil (since_id), sem retweets e sem respostas;
- na primeira leitura de um perfil só marca onde parou, sem publicar posts antigos;
- conta os posts lidos no mês em .x_state.json e para no teto X_MONTHLY_POST_LIMIT.
"""

import json
import os
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

API = "https://api.x.com/2"
STATE_FILE = Path(".x_state.json")
SP_TZ = ZoneInfo("America/Sao_Paulo")

# perfis acompanhados (handle sem @). O nome exibido vem da própria API.
ACCOUNTS = ["pabloramadas", "gustavotutinha", "pedrosa", "leolacerdantv"]

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
                "tweet.fields": "created_at",
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
                # primeira leitura: só marca onde parou, nada antigo vira notícia
                print(f"  X: @{handle} começou a ser acompanhado")
                continue

            for post in reversed(posts):  # do mais antigo para o mais novo
                text = " ".join(post.get("text", "").split())
                if len(text) < MIN_TEXT:
                    continue
                items.append({
                    "name": f"{user['name']} (X)",
                    "title": text[:140],
                    "desc": text,
                    "link": f"https://x.com/{handle}/status/{post['id']}",
                    "image": "",
                    "from_x": True,
                })
    except requests.RequestException as e:
        print(f"  ERRO X: {e}")
    finally:
        _save_state(state)

    print(f"  X: {len(items)} post(s) novo(s), {state['reads']} lido(s) no mês (teto {limit})")
    return items
