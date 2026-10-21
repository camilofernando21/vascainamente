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
MONTH_NAMES = "janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro"
# placar: "2 a 1", "2x1", "2-1", "2–1"; não conta faixa de datas ("18 a 20 de outubro")
SCORE = re.compile(
    r"(?<![\d/])(\d{1,2})\s*(?:a|x|×|-|–|—)\s*(\d{1,2})(?![\d/])(?!\s+de\s+(?:" + MONTH_NAMES + r"))",
    re.IGNORECASE,
)
FORMATION = re.compile(r"\b\d\s*[-–—]\s*\d(?:\s*[-–—]\s*\d){1,3}\b")
TABLE_ZONE = re.compile(r"\b[zg]-?\d{1,2}\b", re.IGNORECASE)  # Z-4, G-6: zona da tabela, não número da fonte
WEEKDAYS = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]
MONTHS = {
    "janeiro": "1", "fevereiro": "2", "março": "3", "abril": "4", "maio": "5", "junho": "6",
    "julho": "7", "agosto": "8", "setembro": "9", "outubro": "10", "novembro": "11", "dezembro": "12",
}
# número por extenso na fonte vale como o algarismo ("dois gols" na fonte, "2 gols" no texto)
SPELLED = {
    "zero": "0", "um": "1", "uma": "1", "dois": "2", "duas": "2", "três": "3", "quatro": "4", "cinco": "5",
    "seis": "6", "sete": "7", "oito": "8", "nove": "9", "dez": "10", "onze": "11", "doze": "12",
    "primeiro": "1", "primeira": "1", "segundo": "2", "segunda": "2", "terceiro": "3", "terceira": "3",
    "quarto": "4", "quarta": "4", "quinto": "5", "quinta": "5", "sexto": "6", "sexta": "6",
    "sétimo": "7", "sétima": "7", "oitavo": "8", "oitava": "8", "nono": "9", "nona": "9",
    "décimo": "10", "décima": "10",
}
SPELLED_SCORE = re.compile(
    r"\b(zero|um|uma|dois|duas|três|quatro|cinco|seis|sete|oito|nove|dez)\s+a\s+"
    r"(zero|um|uma|dois|duas|três|quatro|cinco|seis|sete|oito|nove|dez)\b",
    re.IGNORECASE,
)

VASCO_ID = "3454"
ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer"
LEAGUES = [
    "bra.1", "conmebol.libertadores", "conmebol.sudamericana", "bra.copa_do_brazil",
    "bra.camp.carioca", "conmebol.recopa", "bra.supercopa_do_brazil",
]
# título que diz quem ganhou: "Vasco perde para", "Vasco vence o"
VASCO_LOST = re.compile(r"^\W*vasco\b[^.]{0,20}?\b(perde|perdeu|é derrotado|foi derrotado|sofre|cai|caiu|é eliminado|leva)\b", re.IGNORECASE)
VASCO_WON = re.compile(r"^\W*vasco\b[^.]{0,20}?\b(vence|venceu|bate|bateu|goleia|goleou|derrotou|vira|virou|atropela)\b", re.IGNORECASE)
VASCO_DREW = re.compile(r"^\W*vasco\b[^.]{0,20}?\b(empata|empatam|empatou|empataram)\b", re.IGNORECASE)


def load_context() -> dict:
    """Fatos fixos que o robô pode usar sem estarem na fonte (técnico, temporada, nome do site)."""
    try:
        return json.loads(CONTEXT_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"  AVISO: {CONTEXT_FILE} não foi lido ({e}); a checagem segue sem os fatos fixos")
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


def _spell_scores(text: str) -> str:
    """'dois a zero' vira '2 a 0', para o placar por extenso também ser conferido."""
    return SPELLED_SCORE.sub(lambda m: f"{SPELLED[m.group(1).lower()]} a {SPELLED[m.group(2).lower()]}", text)


def scores(text: str) -> set:
    """Placares como pares sem ordem: '3 a 1' e '1 a 3' são o mesmo jogo contado de lados diferentes."""
    clean = FORMATION.sub(" ", _spell_scores(text or ""))
    return {tuple(sorted((int(a), int(b)))) for a, b in SCORE.findall(clean)}


def _lower(text: str) -> str:
    return unicodedata.normalize("NFC", (text or "").lower())


def _weekday_root(day: str) -> str:
    return day.replace("-feira", "")


def check(generated: list, source: str, context: dict | None = None, has_image: bool = False,
          today: str | None = None, today_numbers: tuple = ()) -> list:
    """Problemas do texto gerado em relação à fonte. Lista vazia: pode publicar.

    has_image: post oficial com imagem (placar ou escalação na arte). Números podem vir da imagem,
    então só ano e dia da semana são checados; o placar de resultado passa pela agenda da ESPN.
    today / today_numbers: dia da semana, dia e mês de hoje, que o robô pode usar para um fato do próprio dia.
    """
    context = context or {}
    text = "\n".join(t for t in generated if isinstance(t, str))
    src = _lower(source)
    out = _lower(text)
    problems = []

    allowed = numbers(source) | {str(int(n)) for n in today_numbers}
    season = str(context.get("temporada", ""))
    if season:
        allowed.add(season)
    for month, num in MONTHS.items():
        if month in src:
            allowed.add(num)
    for word, num in SPELLED.items():
        if re.search(rf"\b{word}\b", src):
            allowed.add(num)

    if not has_image:
        bad_scores = sorted(scores(text) - scores(source))
        for pair in bad_scores:
            problems.append(f"placar {pair[1]} a {pair[0]} não está na fonte")
        in_scores = {str(n) for pair in bad_scores for n in pair}
        counted = TABLE_ZONE.sub(" ", text)
        extra = sorted(numbers(counted) - allowed - in_scores, key=lambda n: (len(n), n))
        if extra:
            problems.append("números que não estão na fonte: " + ", ".join(extra))
    else:
        years = {n for n in numbers(text) if re.fullmatch(r"(19|20)\d\d", n)}
        bad_years = sorted(years - allowed)
        if bad_years:
            problems.append("anos que não estão na fonte: " + ", ".join(bad_years))

    for day in WEEKDAYS:
        if not re.search(rf"\b{day}\b", out) or day == today:
            continue
        # "quinta" na fonte vale para "quinta-feira" no texto
        if not re.search(rf"\b{_weekday_root(day)}\b", src):
            problems.append(f"dia da semana '{day}' não está na fonte")
    return problems


def _goals(team: dict) -> int:
    score = team.get("score")
    # o site lê displayValue (lib/competitions.ts, num); value fica de reserva
    value = (score.get("displayValue") or score.get("value")) if isinstance(score, dict) else score
    return int(float(value))


def recent_results(days: int = 3, fetch=None) -> list | None:
    """O jogo mais recente do Vasco na agenda da ESPN, encerrado ou em andamento, dos últimos dias.

    Devolve [{"placar": (menor, maior), "vasco": gols, "adversario": gols, "estado": "post"|"in"}] ou [].
    Em andamento conta porque a ESPN leva alguns minutos para marcar o fim do jogo. Qualquer falha
    devolve None: sem agenda, a checagem do placar de resultado não roda.
    """
    fetch = fetch or _fetch_json
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    games, ok = [], False
    for league in LEAGUES:
        data = fetch(f"{ESPN}/{league}/teams/{VASCO_ID}/schedule")
        if data is None:
            continue
        ok = True
        for ev in data.get("events", []):
            try:
                comp = ev["competitions"][0]
                state = comp["status"]["type"]["state"]
                if state not in ("post", "in"):
                    continue
                when = datetime.fromisoformat(ev["date"].replace("Z", "+00:00"))
                if when < cutoff:
                    continue
                vasco = other = None
                for team in comp["competitors"]:
                    if str(team.get("team", {}).get("id", team.get("id"))) == VASCO_ID:
                        vasco = _goals(team)
                    else:
                        other = _goals(team)
                if vasco is None or other is None:
                    continue
                games.append({"placar": tuple(sorted((vasco, other))), "vasco": vasco, "adversario": other,
                              "estado": state, "data": when})
            except (KeyError, IndexError, ValueError, TypeError, AttributeError):
                continue
    if not ok:
        return None
    games.sort(key=lambda g: g["data"])
    return games[-1:]


def check_result(generated: list, results: list | None) -> list:
    """Matéria de resultado: o placar citado e quem ganhou têm de bater com o último jogo do Vasco na ESPN."""
    if not results:
        return []
    game = results[-1]
    texts = [t for t in generated if isinstance(t, str)]
    text = "\n".join(texts)
    problems = []
    cited = scores(text)
    real = game["placar"]
    final = f"{real[1]} a {real[0]}"
    if cited and real not in cited:
        shown = ", ".join(f"{b} a {a}" for a, b in sorted(cited))
        problems.append(f"placar {shown} não bate com o resultado na agenda da ESPN ({final})")
    title = texts[0] if texts else ""
    v, o = game["vasco"], game["adversario"]
    if VASCO_LOST.search(title) and v >= o:
        problems.append(f"o título diz que o Vasco perdeu, mas a ESPN dá {v} a {o} para o Vasco")
    elif VASCO_WON.search(title) and v <= o:
        problems.append(f"o título diz que o Vasco venceu, mas a ESPN dá {v} a {o} para o Vasco")
    elif VASCO_DREW.search(title) and v != o:
        problems.append(f"o título diz que o Vasco empatou, mas a ESPN dá {v} a {o} para o Vasco")
    return problems


def _fetch_json(url: str):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "vascainamente-fact-guard"})
        with urllib.request.urlopen(req, timeout=8) as r:
            return json.load(r)
    except Exception:
        return None
