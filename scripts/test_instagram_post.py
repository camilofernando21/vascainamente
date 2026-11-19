"""Testes do postador do Instagram.

    python3 -m unittest scripts/test_instagram_post.py
"""

import sys
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parent))
import instagram_post as ig  # noqa: E402

TZ = ZoneInfo("America/Sao_Paulo")
AGORA = datetime(2026, 11, 17, 14, 0, tzinfo=TZ)


def materia(slug="2026-11-17-teste", title="Vasco vence o Flamengo por 2 a 0", importance=4,
            category="resultado", minutos=30, source="GE.Globo"):
    return {
        "slug": slug, "title": title, "_importance": importance, "category": category,
        "_date": AGORA - timedelta(minutes=minutos), "source": source,
    }


def estado():
    return {"posted": {}, "seen_dry": {}}


class Legenda(unittest.TestCase):
    def test_modelo_fixo(self):
        c = ig.build_caption(materia())
        self.assertEqual(
            c,
            "Vasco vence o Flamengo por 2 a 0\n\nMatéria completa no link da bio.\n\nFonte: GE.Globo\n\n#Vasco #VascodaGama",
        )

    def test_legenda_boa_passa(self):
        a = materia()
        self.assertEqual(ig.validate(a, ig.build_caption(a)), [])

    def test_travessao_bloqueia(self):
        a = materia(title="Vasco — Flamengo hoje")
        self.assertTrue(any("travessão" in p for p in ig.validate(a, ig.build_caption(a))))

    def test_sem_fonte_bloqueia(self):
        a = materia(source="")
        self.assertTrue(any("fonte" in p for p in ig.validate(a, ig.build_caption(a))))

    def test_legenda_longa_bloqueia(self):
        a = materia(title="a" * 2300)
        self.assertTrue(any("2200" in p for p in ig.validate(a, ig.build_caption(a))))


class Escolha(unittest.TestCase):
    def test_escolhe_nota_alta_recente(self):
        chosen, _ = ig.pick([materia()], estado(), AGORA, "auto")
        self.assertEqual(len(chosen), 1)

    def test_ignora_nota_baixa(self):
        chosen, _ = ig.pick([materia(importance=3)], estado(), AGORA, "auto")
        self.assertEqual(chosen, [])

    def test_ignora_antiga(self):
        chosen, _ = ig.pick([materia(minutos=200)], estado(), AGORA, "auto")
        self.assertEqual(chosen, [])

    def test_transferencia_nao_sai(self):
        chosen, notes = ig.pick([materia(category="transferencia")], estado(), AGORA, "auto")
        self.assertEqual(chosen, [])
        self.assertTrue(notes)

    def test_nao_repete(self):
        st = estado()
        st["posted"]["2026-11-17-teste"] = {"at": (AGORA - timedelta(hours=2)).isoformat(), "id": "1"}
        chosen, _ = ig.pick([materia()], st, AGORA, "auto")
        self.assertEqual(chosen, [])

    def test_horario_de_silencio(self):
        madrugada = datetime(2026, 11, 17, 3, 0, tzinfo=TZ)
        a = materia()
        a["_date"] = madrugada - timedelta(minutes=10)
        chosen, notes = ig.pick([a], estado(), madrugada, "auto")
        self.assertEqual(chosen, [])
        self.assertIn("silêncio", notes[0])

    def test_intervalo_entre_posts(self):
        st = estado()
        st["posted"]["outro"] = {"at": (AGORA - timedelta(minutes=30)).isoformat(), "id": "1"}
        chosen, notes = ig.pick([materia()], st, AGORA, "auto")
        self.assertEqual(chosen, [])
        self.assertIn("60 minutos", notes[0])

    def test_limite_diario(self):
        st = estado()
        for i in range(ig.MAX_PER_DAY):
            st["posted"][f"p{i}"] = {"at": (AGORA - timedelta(hours=2 + i * 0.1)).isoformat(), "id": str(i)}
        chosen, notes = ig.pick([materia()], st, AGORA, "auto")
        self.assertEqual(chosen, [])
        self.assertIn("limite", notes[0])

    def test_ensaio_nao_repete_ja_vista(self):
        st = estado()
        st["seen_dry"]["2026-11-17-teste"] = AGORA.isoformat()
        chosen, _ = ig.pick([materia()], st, AGORA, "dry-run")
        self.assertEqual(chosen, [])


class Endereco(unittest.TestCase):
    def test_url_da_arte(self):
        import os
        os.environ["GITHUB_REPOSITORY"] = "dono/repo"
        self.assertEqual(ig.image_url("a.jpg"), "https://raw.githubusercontent.com/dono/repo/social-img/ig/a.jpg")


if __name__ == "__main__":
    unittest.main()
