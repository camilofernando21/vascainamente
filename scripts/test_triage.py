"""Testes da triagem e do cache de prompt do robô.

    python3 -m unittest scripts/test_triage.py

O robô importa feedparser e anthropic; aqui entram módulos de mentira, então nada de rede nem de chave.
"""

import importlib.util
import os
import sys
import types
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
for name in ("feedparser", "anthropic"):
    if name not in sys.modules:
        stub = types.ModuleType(name)
        stub.Anthropic = object
        stub.AnthropicError = Exception
        sys.modules[name] = stub

import triage  # noqa: E402

spec = importlib.util.spec_from_file_location("fetch_news", HERE / "fetch-news.py")
fetch_news = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fetch_news)


class FakeClient:
    """Guarda o que foi enviado e devolve uma resposta pronta."""

    def __init__(self, text, usage=None):
        self.text, self.calls = text, []
        self.usage = usage or types.SimpleNamespace(input_tokens=100, output_tokens=5,
                                                    cache_creation_input_tokens=0, cache_read_input_tokens=0)
        self.messages = self

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return types.SimpleNamespace(content=[types.SimpleNamespace(text=self.text)], usage=self.usage)


RSS = {"title": "Vasco acerta com lateral", "desc": "Clube fecha contrato.", "name": "GE.Globo", "from_x": False}
POST_X = {"title": "Pablo Ramadas", "desc": "Vasco fecha com o zagueiro, diz o setorista", "name": "X", "from_x": True}
OFICIAL = {**POST_X, "official": True}
RECENT = [{"slug": "a", "title": "Vasco acerta com lateral", "excerpt": "ok", "matchEvent": None}]
ARTIGO = ('{"title":"T","excerpt":"E","body":"B","seoTitle":"S","seoDescription":"D","category":"clube",'
          '"importance":2,"matchEvent":null,"duplicateOf":null}')


class Decisao(unittest.TestCase):
    def test_parse_aceita_so_as_palavras_esperadas(self):
        self.assertEqual(triage.parse("mesmo_fato", triage.allowed(RSS)), "mesmo_fato")
        self.assertEqual(triage.parse("  Escrever.\nporque sim", triage.allowed(RSS)), "escrever")
        self.assertIsNone(triage.parse("talvez", triage.allowed(RSS)))
        self.assertIsNone(triage.parse("", triage.allowed(RSS)))

    def test_rss_nunca_e_sem_noticia(self):
        self.assertIsNone(triage.parse("sem_noticia", triage.allowed(RSS)))
        self.assertEqual(triage.parse("sem_noticia", triage.allowed(POST_X)), "sem_noticia")

    def test_perfil_oficial_nao_passa_pela_triagem(self):
        self.assertFalse(triage.applies_to(OFICIAL))
        self.assertTrue(triage.applies_to(POST_X))

    def test_modo(self):
        for valor, esperado in (("on", "on"), ("SHADOW", "shadow"), ("", "off"), ("qualquer", "off")):
            os.environ["TRIAGE_MODE"] = valor
            self.assertEqual(triage.mode(), esperado)
        del os.environ["TRIAGE_MODE"]
        self.assertEqual(triage.mode(), "off")

    def test_falha_da_api_devolve_none(self):
        class Quebrado:
            messages = None

            def __init__(self):
                self.messages = self

            def create(self, **kw):
                raise RuntimeError("fora do ar")

        self.assertIsNone(triage.decide(Quebrado(), RSS, RECENT))

    def test_resposta_estranha_vira_escrever_no_fluxo(self):
        self.assertIsNone(triage.decide(FakeClient("não sei"), RSS, RECENT))

    def test_prompt_traz_o_item_e_a_lista(self):
        texto = triage.build_prompt(POST_X, RECENT)
        self.assertIn("Vasco fecha com o zagueiro", texto)
        self.assertIn("- Vasco acerta com lateral", texto)
        self.assertNotIn("excerpt", texto)
        self.assertIn("sem_noticia", texto)
        self.assertNotIn("sem_noticia", triage.build_prompt(RSS, RECENT))

    def test_resultado_da_escrita(self):
        self.assertEqual(triage.outcome_of_writing({"skip": True}), "sem_noticia")
        self.assertEqual(triage.outcome_of_writing({"blocked": ["x"]}), "bloqueada")
        igual = {"duplicateOf": {"slug": "a"}, "development": False, "update": None}
        self.assertEqual(triage.outcome_of_writing(igual), "mesmo_fato")
        self.assertEqual(triage.outcome_of_writing({**igual, "update": "novo horário"}), "escrever")
        self.assertEqual(triage.outcome_of_writing({**igual, "development": True}), "escrever")
        self.assertEqual(triage.outcome_of_writing({"duplicateOf": None}), "escrever")


class CachePromptEUso(unittest.TestCase):
    def escrever(self, cache, recent=None, **kw):
        client = FakeClient(ARTIGO)
        recent = recent if recent is not None else [{"slug": "a", "title": "Vasco acerta", "excerpt": "ok", "matchEvent": None}]
        fetch_news.process_with_ai(client, "Titulo", "Trecho", "GE.Globo", [], recent, context={"temporada": 2026}, cache=cache, **kw)
        return client.calls[0]

    def test_sem_cache_nao_marca_nada(self):
        call = self.escrever(cache=False)
        self.assertTrue(all("cache_control" not in b for b in call["system"]))

    def test_com_cache_marca_os_dois_blocos(self):
        call = self.escrever(cache=True)
        self.assertEqual(len(call["system"]), 2)
        self.assertTrue(all(b.get("cache_control") == {"type": "ephemeral"} for b in call["system"]))

    def test_noticia_fica_fora_do_cache(self):
        call = self.escrever(cache=True)
        sistema = " ".join(b["text"] for b in call["system"])
        self.assertNotIn("Trecho: Trecho", sistema)
        self.assertIn("Trecho: Trecho", call["messages"][0]["content"][-1]["text"])
        self.assertIn("Vasco acerta", sistema)  # lista recente no system

    def test_regras_de_fidelidade_e_pontuacao_continuam(self):
        call = self.escrever(cache=False)
        sistema = call["system"][0]["text"]
        self.assertIn("REGRA DE FIDELIDADE", sistema)
        self.assertIn("nunca use travessão", sistema)
        self.assertIn('"duplicateOf"', sistema)

    def test_feedback_da_checagem_vai_na_mensagem(self):
        call = self.escrever(cache=True, feedback=["placar 2 a 0 não está na fonte"])
        self.assertIn("placar 2 a 0", call["messages"][0]["content"][-1]["text"])
        self.assertNotIn("placar 2 a 0", " ".join(b["text"] for b in call["system"]))

    def test_campos_extras_do_perfil_oficial(self):
        call = self.escrever(cache=False, from_x=True, official=True)
        self.assertIn('"lineup"', call["messages"][0]["content"][-1]["text"])

    def test_sem_materias_recentes_nao_pede_duplicateOf(self):
        call = self.escrever(cache=False, recent=[])
        self.assertEqual(len(call["system"]), 1)
        self.assertNotIn("duplicateOf", call["system"][0]["text"])

    def test_resumo_de_uso_e_custo(self):
        fetch_news.USAGE.clear()
        uso = types.SimpleNamespace(input_tokens=1_000_000, output_tokens=0, cache_creation_input_tokens=0, cache_read_input_tokens=1_000_000)
        fetch_news.track_usage("claude-sonnet-4-6", types.SimpleNamespace(usage=uso))
        resumo = fetch_news.usage_summary()
        self.assertIn("US$ 3.3000", resumo)  # 1M de entrada (3,00) + 1M de cache lido (0,30)
        fetch_news.USAGE.clear()
        self.assertEqual(fetch_news.usage_summary(), "")


if __name__ == "__main__":
    unittest.main()
