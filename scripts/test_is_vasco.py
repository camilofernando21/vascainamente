"""Testes do filtro de assunto do robô (is_vasco).

    python3 -m unittest scripts/test_is_vasco.py
"""

import importlib.util
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

spec = importlib.util.spec_from_file_location("fetch_news", HERE / "fetch-news.py")
fetch_news = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fetch_news)


class FiltroDeAssunto(unittest.TestCase):
    def test_aceita_vasco_como_palavra(self):
        for titulo in (
            "Vasco vence o Palmeiras em São Januário",
            "Pedro Emanuel exalta o Vasco: 'Temos identidade'",
            "Treino do Vasco, hoje",
            "Torcida vascaína lota São Januário",
            "Vasco, Flamengo e Botafogo brigam por vaga",
        ):
            self.assertTrue(fetch_news.is_vasco(titulo), titulo)

    def test_recusa_nome_que_so_contem_vasco(self):
        for titulo in (
            "Atleta de Ferraz de Vasconcelos conquista ouro na Copa Brasil de Taekwondo",
            "Prefeitura de Vasconcellos inaugura quadra",
        ):
            self.assertFalse(fetch_news.is_vasco(titulo), titulo)

    def test_rival_antes_do_vasco_continua_recusado(self):
        self.assertFalse(fetch_news.is_vasco("Palmeiras ganha do Vasco"))


if __name__ == "__main__":
    unittest.main()
