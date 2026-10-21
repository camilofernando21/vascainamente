"""Testes da checagem de fatos com os erros reais que o robô publicou em 2026.

    python3 -m unittest scripts/test_fact_guard.py
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fact_guard as fg  # noqa: E402

CTX = {"temporada": 2026, "tecnico": "Pedro Emanuel", "site": "Vascainamente"}


class CasosReais(unittest.TestCase):
    def test_placar_inventado_de_coluna(self):
        # 20/10: coluna sem placar virou "Vasco perde por 2 a 0" (o jogo foi 3 a 1)
        fonte = "Vasco\nJuca Kfouri comenta a eliminação do Vasco para o Boca Juniors no Maracanã."
        gerado = ["Vasco perde por 2 a 0 para o Boca Juniors no Maracanã e é eliminado da Sul-Americana"]
        problemas = fg.check(gerado, fonte, CTX)
        self.assertTrue(any("placar 2 a 0" in p for p in problemas))

    def test_ano_errado(self):
        fonte = "Thiago Mendes exalta virada do Vasco sobre o Grêmio\nO Vasco venceu o Grêmio por 2 a 1 em Porto Alegre."
        gerado = ["primeira vitória fora de casa no Brasileirão 2025"]
        self.assertTrue(any("2025" in p for p in fg.check(gerado, fonte, CTX)))

    def test_agregado_inventado(self):
        fonte = "Pedro Emanuel exalta mentalidade do Vasco no Barradão\nO Vasco venceu o Vitória por 2 a 0."
        gerado = ["O Vasco venceu o Vitória por 2 a 0 e avançou com placar agregado de 4 a 1."]
        self.assertTrue(any("placar 4 a 1" in p for p in fg.check(gerado, fonte, CTX)))

    def test_dia_da_semana_inventado(self):
        fonte = "Vasco perde para o Fluminense\nO Vasco perdeu por 1 a 0 no Maracanã, pela 26ª rodada."
        gerado = ["O Vasco perdeu para o Fluminense por 1 a 0 na noite desta quinta-feira, pela 26ª rodada."]
        self.assertTrue(any("quinta-feira" in p for p in fg.check(gerado, fonte, CTX)))


class PassaQuandoEstaNaFonte(unittest.TestCase):
    def test_placar_e_numeros_da_fonte(self):
        fonte = ("Léo Jardim falha no fim, Boca vence por 3 a 1 e elimina o Vasco\n"
                 "O Boca derrotou o Vasco por 3 a 1 no Maracanã, nesta terça-feira (20), às 21h30.")
        gerado = ["Boca vence o Vasco por 3 a 1", "No Maracanã, nesta terça-feira (20), às 21h30, o Boca fez 3 a 1."]
        self.assertEqual(fg.check(gerado, fonte, CTX), [])

    def test_placar_invertido_e_o_mesmo_jogo(self):
        fonte = "Boca vence o Vasco por 3 a 1"
        self.assertEqual(fg.check(["Vasco perde por 1 a 3"], fonte, CTX), [])

    def test_temporada_e_mes_por_extenso(self):
        fonte = "Conmebol confirma o jogo no Maracanã no dia 20 de outubro"
        gerado = ["O jogo é em 20/10, no Brasileirão 2026."]
        self.assertEqual(fg.check(gerado, fonte, CTX), [])

    def test_numeros_com_ponto_de_milhar(self):
        fonte = "Ao todo, 52.827 pessoas votaram."
        self.assertEqual(fg.check(["Foram 52827 votos."], fonte, CTX), [])

    def test_imagem_oficial_libera_numeros_mas_nao_ano(self):
        fonte = "FIM DE JOGO!"
        self.assertEqual(fg.check(["Vasco 2 x 1 Remo, gol aos 45"], fonte, CTX, has_image=True), [])
        self.assertTrue(fg.check(["Brasileirão 2025"], fonte, CTX, has_image=True))

    def test_dia_de_hoje_pode(self):
        fonte = "Vasco enfrenta o Corinthians"
        self.assertEqual(fg.check(["O Vasco enfrenta o Corinthians nesta quarta-feira"], fonte, CTX, today="quarta-feira"), [])
        self.assertTrue(fg.check(["O Vasco enfrentou o Corinthians na segunda-feira"], fonte, CTX, today="quarta-feira"))

    def test_campos_vazios(self):
        self.assertEqual(fg.check([None, ""], "qualquer fonte", CTX), [])


class Resultado(unittest.TestCase):
    RESULTADOS = [{"placar": (1, 3), "data": "2026-10-21T00:30:00+00:00"}]

    def test_placar_que_nao_bate_com_a_espn(self):
        problemas = fg.check_result(["Vasco perde por 2 a 0 para o Boca"], self.RESULTADOS)
        self.assertTrue(problemas and "3 a 1" in problemas[0])

    def test_placar_certo(self):
        self.assertEqual(fg.check_result(["Boca vence por 3 a 1"], self.RESULTADOS), [])

    def test_sem_agenda_nao_barra(self):
        self.assertEqual(fg.check_result(["Vasco perde por 2 a 0"], None), [])

    def test_leitura_da_agenda(self):
        agenda = {"events": [
            {"date": "2099-01-01T00:30Z", "competitions": [{"status": {"type": {"state": "post"}},
             "competitors": [{"score": {"value": 1.0}}, {"score": {"value": 3.0}}]}]},
            {"date": "2099-01-05T00:30Z", "competitions": [{"status": {"type": {"state": "pre"}},
             "competitors": [{"score": "0"}, {"score": "0"}]}]},
        ]}
        res = fg.recent_results(fetch=lambda url: agenda if url.endswith("bra.1/teams/3454/schedule") else None)
        self.assertEqual([r["placar"] for r in res], [(1, 3)])

    def test_agenda_fora_do_ar(self):
        self.assertIsNone(fg.recent_results(fetch=lambda url: None))


if __name__ == "__main__":
    unittest.main()
