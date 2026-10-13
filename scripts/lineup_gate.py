"""Porta do modo dia de jogo: decide se vale consultar o perfil oficial do Vasco no X agora.

Só usa a biblioteca padrão, para rodar em segundos sem instalar nada. Responde "sim" quando:
- um jogo do Vasco começa nas próximas 3 horas (horário da agenda da ESPN, a mesma que o site usa), e
- a escalação oficial estruturada (11 titulares) daquele jogo ainda não foi gravada em uma matéria.

Fora disso responde "não" e o workflow termina sem consultar o X. Em caso de dúvida (agenda fora do ar),
responde "não": errar para o lado de não gastar é o seguro.

Saída: escreve run=true ou run=false em $GITHUB_OUTPUT (e imprime o motivo). Para testar uma hora qualquer:
GATE_NOW=2026-10-13T22:00:00+00:00 python3 scripts/lineup_gate.py
"""

import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

VASCO_ID = "3454"
WINDOW = timedelta(hours=3)
SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer"
LEAGUES = [
    "bra.1",
    "conmebol.libertadores",
    "conmebol.sudamericana",
    "bra.copa_do_brazil",
    "bra.camp.carioca",
    "conmebol.recopa",
    "bra.supercopa_do_brazil",
]
SP_TZ = ZoneInfo("America/Sao_Paulo")
NEWS_DIR = Path("content/noticias")


def decide(run: bool, reason: str) -> None:
    print(f"{'CONSULTAR' if run else 'PULAR'}: {reason}")
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a", encoding="utf-8") as f:
            f.write(f"run={'true' if run else 'false'}\n")
    sys.exit(0)


def parse_iso(text: str) -> datetime:
    return datetime.fromisoformat(text.replace("Z", "+00:00"))


def kickoffs() -> list:
    """Horários de início dos jogos do Vasco que ainda não começaram, em UTC."""
    found = []
    for league in LEAGUES:
        url = f"{SITE}/{league}/teams/{VASCO_ID}/schedule?fixture=true"
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "vascainamente-lineup-gate"}), timeout=8) as r:
                data = json.load(r)
        except Exception:
            continue
        for ev in data.get("events", []):
            try:
                state = ev["competitions"][0]["status"]["type"]["state"]
                if state == "pre":
                    found.append(parse_iso(ev["date"]))
            except (KeyError, IndexError, ValueError):
                continue
    return sorted(found)


FRONT_DATE = re.compile(r'^date:\s*"([^"]+)"\s*$', re.MULTILINE)


def lineup_saved_since(since: datetime) -> bool:
    """Existe uma matéria de escalação oficial com os 11 titulares gravada depois de `since`?"""
    if not NEWS_DIR.exists():
        return False
    for path in sorted(NEWS_DIR.glob("*.md"), reverse=True)[:80]:
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue
        end = text.find("\n---", 4)
        head = text[: end if end > 0 else 2000]
        if 'matchEvent: "escalacao"' not in head or "\nlineup:" not in head:
            continue
        m = FRONT_DATE.search(head)
        try:
            if m and parse_iso(m.group(1)) >= since:
                return True
        except ValueError:
            continue
    return False


def main() -> None:
    forced = os.environ.get("GATE_NOW")
    now = parse_iso(forced) if forced else datetime.now(timezone.utc)
    games = kickoffs()
    if not games:
        decide(False, "agenda da ESPN sem jogos ou indisponível")
    upcoming = [k for k in games if now < k <= now + WINDOW]
    if not upcoming:
        nxt = next((k for k in games if k > now), None)
        when = nxt.astimezone(SP_TZ).strftime("%d/%m às %H:%M") if nxt else "sem data"
        decide(False, f"nenhum jogo do Vasco começa nas próximas 3 horas (próximo: {when})")
    kick = upcoming[0]
    label = kick.astimezone(SP_TZ).strftime("%d/%m às %H:%M")
    if lineup_saved_since(kick - WINDOW):
        decide(False, f"a escalação oficial do jogo de {label} já está gravada")
    decide(True, f"jogo de {label} em até 3 horas, escalação ainda não gravada")


if __name__ == "__main__":
    main()
