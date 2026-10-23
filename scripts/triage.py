"""Triagem barata antes da escrita: um modelo menor decide se vale chamar o modelo caro.

Cerca de 8 em cada 10 itens que o robô processa não viram matéria nova (mesmo fato já publicado,
post de setorista sem notícia). Cada um custava uma escrita completa. Aqui um modelo pequeno lê o item e
a lista de matérias recentes e responde só uma palavra:

  escrever    -> segue para a escrita normal (na dúvida, é sempre esta)
  mesmo_fato  -> a matéria já existe e o item não traz nada novo
  sem_noticia -> post de setorista sem informação concreta (só vale para posts do X)

Modos, pela variável TRIAGE_MODE (padrão "off"):
  off     nada muda
  shadow  a triagem roda, mas quem decide ainda é a escrita; o log mostra onde discordaram
  on      "mesmo_fato" e "sem_noticia" pulam a escrita

Só biblioteca padrão (a chamada à API vem do cliente que o robô já criou). Testes: scripts/test_triage.py
"""

import os
import re

MODEL = os.environ.get("TRIAGE_MODEL", "claude-haiku-4-5")
SKIP_DECISIONS = ("mesmo_fato", "sem_noticia")
DECISIONS = ("escrever",) + SKIP_DECISIONS


def mode() -> str:
    value = os.environ.get("TRIAGE_MODE", "off").strip().lower()
    return value if value in ("off", "shadow", "on") else "off"


def applies_to(item: dict) -> bool:
    """O perfil oficial do clube nunca passa pela triagem: escalação, gol e resultado não podem se perder."""
    return not item.get("official")


def allowed(item: dict) -> tuple:
    """RSS só pode ser 'mesmo_fato'. 'sem_noticia' é para post de setorista, que o RSS não tem."""
    return DECISIONS if item.get("from_x") else ("escrever", "mesmo_fato")


def compact_recent(recent: list) -> str:
    """Só os títulos das matérias recentes: para saber se o fato já saiu basta o título, e fica 3x mais barato."""
    if not recent:
        return ""
    rows = "\n".join(f"- {p['title']}" + (f" [{p['matchEvent']}]" if p.get("matchEvent") else "") for p in recent)
    return f"\nMatérias já publicadas nos últimos 3 dias:\n{rows}\n"


def build_prompt(item: dict, recent: list) -> str:
    options = allowed(item)
    lines = [
        "Você faz a triagem de notícias do Vascainamente, portal do Vasco da Gama. Não escreva matéria: só decida.",
        "",
        f"Notícia nova:\nTítulo: {item['title']}\nTrecho: {item['desc']}\nFonte: {item['name']}",
        compact_recent(recent),
        "Responda SOMENTE uma destas palavras, sem mais nada:",
        "- escrever: a notícia traz um fato que o site ainda não tem, ou traz algo novo sobre um fato publicado. "
        "Na dúvida, responda escrever.",
        "- mesmo_fato: o MESMO fato (mesmo anúncio, decisão, jogo, resultado, entrevista, contratação) já está nas matérias "
        "publicadas e esta notícia não acrescenta nada concreto: horário ou data, ingressos ou preço, local, lesão, "
        "valores, placar ou gol novo. Notícia de jogo em andamento (gol, placar, escalação) é sempre escrever.",
    ]
    if "sem_noticia" in options:
        lines.append(
            "- sem_noticia: post de setorista sem informação concreta e nova sobre o Vasco: opinião, piada, enquete, "
            "palpite, divulgação de live ou de outro conteúdo. Contratação, saída, lesão, escalação, bastidor apurado, "
            "data ou local de jogo são notícia: escrever."
        )
    return "\n".join(lines)


def parse(text: str, options: tuple) -> str | None:
    """A decisão vinda do modelo, ou None se a resposta não for uma das palavras esperadas."""
    word = re.sub(r"[^a-z_]", "", (text or "").strip().lower().split("\n")[0].split(" ")[0])
    return word if word in options else None


def decide(client, item: dict, recent: list, usage=None) -> str | None:
    """Pergunta ao modelo pequeno. Qualquer falha devolve None e a escrita segue como se não houvesse triagem."""
    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=10,
            messages=[{"role": "user", "content": build_prompt(item, recent)}],
        )
        if usage is not None:
            usage(MODEL, response)
        return parse(response.content[0].text, allowed(item))
    except Exception as e:  # a triagem nunca pode derrubar o robô
        print(f"  AVISO triagem: {type(e).__name__}: {str(e)[:120]}")
        return None


def outcome_of_writing(article: dict) -> str:
    """O que a escrita decidiu, na mesma régua da triagem, para comparar no modo shadow."""
    if article.get("blocked"):
        return "bloqueada"
    if article.get("skip"):
        return "sem_noticia"
    if article.get("duplicateOf") and not article.get("development") and not article.get("update"):
        return "mesmo_fato"
    return "escrever"
