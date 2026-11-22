"""Testes do gerador de artes de informação.

    python3 -m unittest scripts/test_arte_info.py
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "social_art"))
import arte_info as ai  # noqa: E402


def base():
    return {"rotulo": "Brasileirão", "titulo": ["Hoje tem", "Vasco"],
            "blocos": [{"k": "Jogo", "v": ["Bragantino x Vasco"]}]}


class Validacao(unittest.TestCase):
    def test_modelo_valido(self):
        ai.validar(base())

    def test_travessao_bloqueia(self):
        d = base()
        d["blocos"][0]["v"] = ["Vasco — Flamengo"]
        with self.assertRaises(ValueError):
            ai.validar(d)

    def test_meia_risca_bloqueia(self):
        d = base()
        d["rotulo"] = "Rodada 1–2"
        with self.assertRaises(ValueError):
            ai.validar(d)

    def test_titulo_precisa_de_duas_linhas(self):
        d = base()
        d["titulo"] = ["Hoje tem Vasco"]
        with self.assertRaises(ValueError):
            ai.validar(d)

    def test_no_maximo_quatro_blocos(self):
        d = base()
        d["blocos"] = d["blocos"] * 5
        with self.assertRaises(ValueError):
            ai.validar(d)


class Conferencia(unittest.TestCase):
    def test_conteudo_que_passa_da_tela_avisa(self):
        c = {"h1": [330, 740], "#panel": [800, 1557], "#foot": [1590, 1800]}
        self.assertTrue(ai.conferir("story", c, ai.FORMATOS["story"]))

    def test_layout_folgado_passa(self):
        c = {"h1": [330, 740], "#panel": [800, 1557], "#foot": [1590, 1660]}
        self.assertEqual(ai.conferir("story", c, ai.FORMATOS["story"]), [])

    def test_rodape_colado_no_painel_avisa(self):
        c = {"h1": [330, 740], "#panel": [800, 1590], "#foot": [1595, 1660]}
        self.assertTrue(ai.conferir("story", c, ai.FORMATOS["story"]))


class Logos(unittest.TestCase):
    def test_escudo_inexistente_bloqueia(self):
        d = base()
        d["escudos"] = ["time-que-nao-existe", "vasco"]
        with self.assertRaises(ValueError):
            ai.validar(d)

    def test_escudos_do_topo_passam(self):
        d = base()
        d["escudos"] = ["bragantino", "vasco"]
        ai.validar(d)

    def test_logo_inexistente_bloqueia(self):
        d = base()
        d["blocos"][0]["logos"] = ["time-que-nao-existe"]
        with self.assertRaises(ValueError):
            ai.validar(d)

    def test_logos_do_repositorio_passam(self):
        d = base()
        d["blocos"][0]["logos"] = ["bragantino", "x", "vasco", "premiere", "sportv"]
        ai.validar(d)


if __name__ == "__main__":
    unittest.main()
