"""Checagem de fatos do robô: barra número, placar, ano e dia da semana que não vieram da fonte.

O robô recebe só o título e o resumo da notícia original e escreve a matéria inteira. Quando o resumo é
curto, o modelo tende a completar com detalhes plausíveis e errados (placar inventado, ano trocado,
dia do jogo errado). Esta checagem compara o texto gerado com a fonte e devolve a lista de problemas.

Regras:
- todo número escrito em algarismos no texto gerado tem de aparecer na fonte (exceções: o ano da
  temporada e o número do mês quando a fonte cita o mês por extenso);
- todo placar ("2 a 1", "2x1", "2-1") tem de aparecer na fonte com os mesmos dois números;
- dia da semana só se estiver na fonte;
- matéria de resultado: o placar tem de bater com o resultado final na agenda da ESPN (a mesma do site).

Só usa a biblioteca padrão. Testes: python3 -m unittest scripts/test_fact_guard.py
"""

import json
import re
import unicodedata
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

CONTEXT_FILE = Path("content/contexto-robo.json")

# "21h30" vira 21 e 30; "25ª" vira 25; "1,5" e "52.827" ficam inteiros
NUMBER = re.compile(r"\d+(?:[.,]\d+)*")
SCORE = re.compile(r"(?<![\d/])(\d{1,2})\s*(?:a|x|×|-)\s*(\d{1,2})(?![\d/])", re.IGNORECASE)
WEEKDAYS = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]
MONTHS = {
    "janeiro": "1", "fevereiro": "2", "março": "3", "abril": "4", "maio": "5", "junho": "6",
    "julho": "7", "agosto": "8", "setembro": "9", "outubro": "10", "novembro": "11", "dezembro": "12",
}

VASCO_ID = "3454"
ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer"
LEAGUES = [
    "bra.1", "conmebol.libertadores", "conmebol.sudamericana", "bra.copa_do_brazil",
    "bra.camp.carioca", "conmebol.recopa", "bra.supercopa_do_brazil",
]


def load_context() -> dict:
    """Fatos fixos que o robô pode usar sem estarem na fonte (técnico, temporada, nome do site)."""
    try:
        return json.loads(CONTEXT_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _norm_number(raw: str) -> str:
    """'52.827' e '52827' são o mesmo número; '1,5' fica '1,5'; zeros à esquerda saem."""
    if re.fullmatch(r"\d{1,3}(?:\.\d{3})+", raw):
        raw = raw.replace(".", "")
    raw = raw.replace(".", ",")
    if "," not in raw:
        raw = raw.lstrip("0") or "0"
    return raw


def numbers(text: str) -> set:
    return {_norm_number(n) for n in NUMBER.findall(text or "")}


def scores(text: str) -> set:
    """Placares como pares sem ordem: '3 a 1' e '1 a 3' são o mesmo jogo contado de lados diferentes."""
    found = set()
    for a, b in SCORE.findall(text or ""):
        found.add(tuple(sorted((int(a), int(b)))))
    return found


def _lower(text: str) -> str:
    return unicodedata.normalize("NFC", (text or "").lower())


def check(generated: list, source: str, context: dict | None = None, has_image: bool = False, today: str | None = None) -> list:
    """Problemas do texto gerado em relação à fonte. Lista vazia: pode publicar.

    has_image: post oficial com imagem (placar ou escalação na arte). Números podem vir da imagem,
    então só ano e dia da semana são checados; o placar de resultado passa pela agenda da ESPN.
    today: nome do dia de hoje ("quarta-feira"), que o robô pode usar para um fato do próprio dia.
    """
    context = context or {}
    text = "\n".join(t for t in generated if isinstance(t, str))
    src = _lower(source)
    out = _lower(text)
    problems = []

    allowed = numbers(source)
    season = str(context.get("temporada", ""))
    if season:
        allowed.add(season)
    for month, num in MONTHS.items():
        if month in src:
            allowed.add(num)

    if not has_image:
        bad_scores = sorted(scores(text) - scores(source))
        for pair in bad_scores:
            problems.append(f"placar {pair[1]} a {pair[0]} não está na fonte")
        in_scores = {str(n) for pair in bad_scores for n in pair}
        extra = sorted(numbers(text) - allowed - in_scores, key=lambda n: (len(n), n))
        if extra:
            problems.append("números que não estão na fonte: " + ", ".join(extra))
    else:
        years = {n for n in numbers(text) if re.fullmatch(r"(19|20)\d\d", n)}
        bad_years = sorted(years - allowed)
        if bad_years:
            problems.append("anos que não estão na fonte: " + ", ".join(bad_years))

    for day in WEEKDAYS:
        if day in out and day not in src and day != today:
            problems.append(f"dia da semana '{day}' não está na fonte")
    return problems


def recent_results(days: int = 3, fetch=None) -> list:
    """Jogos do Vasco encerrados nos últimos dias, na agenda da ESPN: [{'placar': (menor, maior), ...}].

    Qualquer falha devolve None: sem agenda, a checagem do placar de resultado não roda.
    """
    fetch = fetch or _fetch_json
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    results, ok = [], False
    for league in LEAGUES:
        data = fetch(f"{ESPN}/{league}/teams/{VASCO_ID}/schedule")
        if data is None:
            continue
        ok = True
        for ev in data.get("events", []):
            try:
                comp = ev["competitions"][0]
                if comp["status"]["type"]["state"] != "post":
                    continue
                when = datetime.fromisoformat(ev["date"].replace("Z", "+00:00"))
                if when < cutoff:
                    continue
                goals = []
                for team in comp["competitors"]:
                    score = team.get("score")
                    # same reading as the site (lib/competitions.ts): displayValue first
                    value = (score.get("displayValue") or score.get("value")) if isinstance(score, dict) else score
                    goals.append(int(float(value)))
                if len(goals) == 2:
                    results.append({"placar": tuple(sorted(goals)), "data": when.isoformat()})
            except (KeyError, IndexError, ValueError, TypeError):
                continue
    return results if ok else None


def check_result(generated: list, results: list | None) -> list:
    """Matéria de resultado: algum placar citado tem de ser o placar final de um jogo recente do Vasco."""
    if not results:
        return []
    text = "\n".join(t for t in generated if isinstance(t, str))
    cited = scores(text)
    if not cited:
        return []
    real = {r["placar"] for r in results}
    if cited & real:
        return []
    shown = ", ".join(f"{b} a {a}" for a, b in sorted(cited))
    finals = ", ".join(f"{b} a {a}" for a, b in sorted(real))
    return [f"placar {shown} não bate com o resultado final na agenda da ESPN ({finals})"]


def _fetch_json(url: str):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "vascainamente-fact-guard"})
        with urllib.request.urlopen(req, timeout=8) as r:
            return json.load(r)
    except Exception:
        return None
