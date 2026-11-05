"""Panorama do dia: a matéria que mantém o site com assunto do dia quando as fontes não trazem nada novo.

Problema que resolve: depois de um jogo, de madrugada ou de uma manhã parada, o robô não encontra notícia
nova e a página inicial amanhece com as matérias de ontem. Aqui, a partir das 7h, se o site ainda não
publicou NADA no dia, o robô escreve um panorama com o que já está publicado (últimas 48 horas): o que
aconteceu ontem, o que vem pela frente, com o dia de cada fato dito do jeito certo ("ontem", "hoje").

Segurança, porque este texto sai sem revisão humana:
  1. só usa fatos que estão nas matérias já publicadas (as fontes vão no prompt, nada de internet);
  2. passa pela checagem de fatos do robô (número, placar, dia da semana) com as fontes como referência;
  3. uma segunda leitura com o modelo pequeno confere fatos e dias; na dúvida, não publica;
  4. no máximo um por dia, porque depois dele o site já tem matéria do dia.

Só biblioteca padrão; o cliente da API e as funções do robô chegam por parâmetro. Testes: scripts/test_panorama.py
"""

import re
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import triage

SP_TZ = ZoneInfo("America/Sao_Paulo")
NEWS_DIR = Path("content/noticias")
START_HOUR = 7          # antes disso a madrugada é normal: não há o que cobrar do robô
WINDOW_HOURS = 48       # matérias que servem de fonte
MAX_SOURCES = 10
REVIEW_MODEL = "claude-sonnet-4-6"  # a segunda leitura é só uma por dia: vale o modelo que erra menos
MIN_SOURCES = 3         # com menos matéria que isso, não há panorama a escrever
BODY_CHARS = 500
SOURCE_NAME = "Vascainamente"
SOURCE_URL = "https://www.vascainamente.com.br"
EXCLUDED_EVENTS = ("escalacao", "gol")  # só valem na hora do jogo
WEEKDAYS = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]

FIELD = re.compile(r'^(title|slug|date|excerpt|matchEvent|imageUrl|source|importance):\s*"?(.*?)"?\s*$', re.MULTILINE)


def day_label(when: datetime, now: datetime) -> str:
    """Como a matéria deve citar o dia do fato: 'hoje', 'ontem' ou 'anteontem', com dia da semana e data."""
    days = (now.date() - when.date()).days
    word = {0: "hoje", 1: "ontem", 2: "anteontem"}.get(days, f"há {days} dias")
    return f"{word}, {WEEKDAYS[when.weekday()]}, {when.day}/{when.month}"


def load_candidates(now: datetime, news_dir: Path = NEWS_DIR) -> list:
    """Matérias publicadas nas últimas 48 horas, já com o rótulo do dia e um trecho do corpo."""
    items = []
    for path in news_dir.glob("*.md"):
        try:
            text = path.read_text(encoding="utf-8")
            end = text.find("\n---", 4)
            fields = dict(FIELD.findall(text[:end]))
            when = datetime.fromisoformat(fields["date"]).astimezone(SP_TZ)
        except Exception:
            continue
        age_hours = (now - when).total_seconds() / 3600
        if age_hours < 0 or age_hours > WINDOW_HOURS:
            continue
        body = re.sub(r"\s+", " ", text[end + 4:]).strip()
        try:
            importance = int(fields.get("importance") or 0)
        except ValueError:
            importance = 0
        items.append({
            "slug": fields.get("slug") or path.stem,
            "title": fields.get("title", ""),
            "excerpt": fields.get("excerpt", ""),
            "body": body[:BODY_CHARS],
            "event": (fields.get("matchEvent") or "").strip(),
            "image": fields.get("imageUrl", "").strip(),
            "source": fields.get("source", ""),
            "importance": importance,
            "when": when,
            "label": day_label(when, now),
        })
    return items


def posted_today(candidates: list, now: datetime) -> bool:
    return any(c["when"].date() == now.date() for c in candidates)


def needed(candidates: list, now: datetime) -> bool:
    """Só depois das 7h, e só se o site ainda não publicou nada hoje (o panorama também conta como matéria do dia)."""
    return now.hour >= START_HOUR and not posted_today(candidates, now)


def pick_sources(candidates: list) -> list:
    usable = [c for c in candidates if c["event"] not in EXCLUDED_EVENTS and c["source"] != SOURCE_NAME]
    usable.sort(key=lambda c: (-c["importance"], -c["when"].timestamp()))
    top = usable[:MAX_SOURCES]
    top.sort(key=lambda c: -c["when"].timestamp())
    return top


def sources_text(sources: list, now: datetime) -> str:
    """Todas as fontes em um bloco só: vai no prompt e é a referência da checagem de fatos."""
    lines = [f"Hoje é {WEEKDAYS[now.weekday()]}, {now.day}/{now.month}/{now.year}."]
    for s in sources:
        lines.append(f"[{s['label']}] {s['title']}\n{s['excerpt']}\n{s['body']}")
    return "\n\n".join(lines)


def build_prompt(sources: list, now: datetime, context: dict, feedback: list | None = None) -> str:
    fix = (
        "\nA versão anterior foi barrada na checagem de fatos: " + "; ".join(feedback) + ". Escreva de novo sem esses itens.\n"
    ) if feedback else ""
    return f"""Você é o editor do Vascainamente, portal de notícias do Vasco da Gama.
Escreva o "Panorama do dia": uma matéria curta que situa o torcedor no que importa hoje, a partir SOMENTE das matérias já publicadas abaixo.

Regras:
- Use apenas fatos que estejam nas matérias. Não acrescente placar, número, nome, data, horário, local ou citação que não estejam lá.
- Cada matéria vem com o rótulo do dia do fato entre colchetes. Cite o dia SEMPRE pelo rótulo: um fato de "ontem" é de ontem, nunca "hoje". Não troque os dias.
- Comece pelo fato mais importante e termine com o que vem pela frente, se alguma matéria disser.
- De 3 a 4 parágrafos curtos, direto, profissional, apaixonado pelo clube. Nunca use linguagem de IA.
- Nunca use travessão (—) nem meia-risca (–): use vírgula, ponto ou dois-pontos.
- O título começa com "Vasco hoje:" e resume o assunto do dia.
- Fatos fixos: o técnico do Vasco é {context.get('tecnico', 'Pedro Emanuel')}; a temporada é {context.get('temporada', now.year)}.{fix}

Retorne SOMENTE um JSON, sem markdown, com: "title", "excerpt" (2 frases), "body", "seoTitle" (máx 60 caracteres), "seoDescription" (máx 155 caracteres).

Matérias publicadas:

{sources_text(sources, now)}"""


def review_prompt(article: dict, sources: list, now: datetime) -> str:
    return f"""Você revisa matérias do portal Vascainamente antes de publicar. Compare o TEXTO com as MATÉRIAS.

Passo 1. Para cada frase do TEXTO que afirma um fato, escreva uma linha: a frase resumida, seta, e o rótulo da matéria que a sustenta (ou NENHUMA). Juntar fatos de matérias diferentes e reescrever com outras palavras é permitido.
Passo 2. Confira o dia de cada fato: um fato de ontem não pode estar escrito como de hoje, nem o contrário, conforme o rótulo entre colchetes.
Passo 3. Confira o português: ortografia, acento, concordância, modo verbal.

Por fim, escreva a última linha:
VEREDITO: OK
se toda frase tem apoio e não há erro de dia nem de português. Se houver erro concreto, escreva
VEREDITO: DUVIDA: e o motivo, citando a frase do texto e a matéria. Só use DUVIDA com erro concreto que você consiga apontar.

TEXTO:
{article['title']}
{article['body']}

MATÉRIAS:
{sources_text(sources, now)}"""


def parse_review(text: str) -> tuple:
    """(passou, nota). Vale a última linha 'VEREDITO:'; sem ela, só uma resposta que comece com OK passa."""
    clean = (text or "").strip()
    verdicts = [line for line in clean.splitlines() if line.strip().upper().startswith("VEREDITO:")]
    if verdicts:
        verdict = verdicts[-1].split(":", 1)[1].strip()
        return (verdict.upper().startswith("OK"), verdict[:400])
    return (clean.upper().startswith("OK"), clean[-400:])


def see_also(sources: list) -> str:
    """Links para as matérias de onde o panorama saiu: montados pelo código, não pelo modelo."""
    chosen = sources[:4]
    rows = "\n".join(f"- [{s['title'].replace('[', '(').replace(']', ')')}](/{s['slug']})" for s in chosen)
    return f"\n\nLeia também:\n\n{rows}\n"


def run(client, now: datetime, context: dict, ask_model, check_facts, strip_dashes, publish, usage=None,
        news_dir: Path = NEWS_DIR):
    """Publica o panorama se for o caso. Devolve o slug publicado ou None. `ask_model(client, prompt)` devolve o JSON
    já lido; `check_facts(texts, source_text)` devolve a lista de problemas; `publish(article, source_text_sources)` grava."""
    candidates = load_candidates(now, news_dir)
    if not needed(candidates, now):
        return None
    sources = pick_sources(candidates)
    if len(sources) < MIN_SOURCES:
        print(f"Panorama: só {len(sources)} matéria(s) nas últimas {WINDOW_HOURS}h, pouco para um panorama")
        return None

    reference = sources_text(sources, now)
    feedback = None
    article = None
    for attempt in (1, 2):
        try:
            candidate = ask_model(client, build_prompt(sources, now, context, feedback))
        except Exception as e:
            print(f"Panorama: ERRO ao escrever: {type(e).__name__}: {str(e)[:120]}")
            return None
        for key in ("title", "excerpt", "body", "seoTitle", "seoDescription"):
            if isinstance(candidate.get(key), str):
                candidate[key] = strip_dashes(candidate[key])
        if not all(isinstance(candidate.get(k), str) and candidate[k].strip() for k in ("title", "excerpt", "body")):
            print("Panorama: resposta incompleta, nada publicado")
            return None
        problems = check_facts([candidate.get(k) for k in ("title", "excerpt", "body", "seoTitle", "seoDescription")], reference)
        if problems:
            print(f"Panorama CHECAGEM ({attempt}/2): {'; '.join(problems)}")
            feedback = problems
            continue
        try:
            response = client.messages.create(
                model=REVIEW_MODEL, max_tokens=3000,
                messages=[{"role": "user", "content": review_prompt(candidate, sources, now)}],
            )
            if usage is not None:
                usage(REVIEW_MODEL, response)
            ok, note = parse_review(response.content[0].text)
        except Exception as e:  # sem segunda leitura não se publica: o texto sai sem revisão humana
            print(f"Panorama: segunda leitura falhou ({type(e).__name__}), nada publicado")
            return None
        if ok:
            article = candidate
            break
        print(f"Panorama SEGUNDA LEITURA ({attempt}/2) com dúvida: {note}")
        print(f"  texto barrado: {candidate['title']} | {candidate['body'][:300]}")
        feedback = [note]
    if article is None:
        print("Panorama: não passou na checagem, nada publicado")
        return None

    article["body"] = article["body"].rstrip() + see_also(sources)
    article["importance"] = 3
    article["matchEvent"] = None
    image = next((s["image"] for s in sources if s["image"]), "")
    return publish(article, "clube", SOURCE_NAME, SOURCE_URL, image)
