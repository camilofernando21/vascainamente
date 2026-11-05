"""Testes do panorama do dia e do log de saúde das fontes.

    python3 -m unittest scripts/test_panorama.py

Sem rede e sem chave: o cliente da API é de mentira e as matérias vêm de uma pasta temporária.
"""

import importlib.util
import sys
import tempfile
import types
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
for name in ("feedparser", "anthropic"):
    if name not in sys.modules:
        stub = types.ModuleType(name)
        stub.Anthropic = object
        stub.AnthropicError = Exception
        sys.modules[name] = stub

import panorama  # noqa: E402

SP = ZoneInfo("America/Sao_Paulo")
AGORA = datetime(2026, 11, 5, 9, 30, tzinfo=SP)
CONTEXT = {"tecnico": "Pedro Emanuel", "temporada": 2026}


def materia(pasta: Path, nome: str, quando: datetime, titulo: str, importancia=3, evento=None, fonte="GE.Globo", imagem=""):
    extra = f'matchEvent: "{evento}"\n' if evento else ""
    (pasta / f"{nome}.md").write_text(
        f'---\ntitle: "{titulo}"\nslug: "{nome}"\ndate: "{quando.isoformat(timespec="seconds")}"\ncategory: "clube"\n'
        f'importance: {importancia}\n{extra}source: "{fonte}"\nsourceUrl: "https://x"\nimageUrl: "{imagem}"\n'
        f'excerpt: "Resumo de {titulo}."\n---\n\nCorpo de {titulo}. O jogo foi na quarta-feira.\n',
        encoding="utf-8",
    )


class FakeClient:
    def __init__(self, review="OK"):
        self.review, self.calls = review, []
        self.messages = self

    def create(self, **kw):
        self.calls.append(kw)
        return types.SimpleNamespace(content=[types.SimpleNamespace(text=self.review)],
                                     usage=types.SimpleNamespace(input_tokens=1, output_tokens=1,
                                                                 cache_creation_input_tokens=0, cache_read_input_tokens=0))


ARTIGO = {"title": "Vasco hoje: vitória de ontem muda o clima", "excerpt": "Resumo curto. Segundo resumo.",
          "body": "O Vasco venceu ontem. Corpo da matéria.", "seoTitle": "Vasco hoje", "seoDescription": "Panorama do dia."}


class Rotulo(unittest.TestCase):
    def test_dia_relativo(self):
        ontem = AGORA - timedelta(hours=11)
        self.assertEqual(panorama.day_label(ontem, AGORA), "ontem, quarta-feira, 4/11")
        self.assertEqual(panorama.day_label(AGORA - timedelta(hours=2), AGORA), "hoje, quinta-feira, 5/11")
        self.assertEqual(panorama.day_label(AGORA - timedelta(days=2), AGORA), "anteontem, terça-feira, 3/11")


class QuandoPublica(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def popular(self, n=4, hoje=False):
        for i in range(n):
            materia(self.dir, f"m{i}", AGORA - timedelta(hours=14 + i), f"Matéria {i}", importancia=3 + (i % 2))
        if hoje:
            materia(self.dir, "hoje", AGORA - timedelta(hours=1), "Já saiu hoje")

    def candidatos(self):
        return panorama.load_candidates(AGORA, self.dir)

    def test_sem_nada_hoje_depois_das_7h_precisa(self):
        self.popular()
        self.assertTrue(panorama.needed(self.candidatos(), AGORA))

    def test_madrugada_nao_cobra(self):
        self.popular()
        cedo = AGORA.replace(hour=6, minute=30)
        self.assertFalse(panorama.needed(panorama.load_candidates(cedo, self.dir), cedo))

    def test_site_com_materia_de_hoje_nao_precisa(self):
        self.popular(hoje=True)
        self.assertFalse(panorama.needed(self.candidatos(), AGORA))

    def test_escalacao_e_gol_nao_viram_fonte(self):
        self.popular()
        materia(self.dir, "esc", AGORA - timedelta(hours=15), "Escalação", importancia=5, evento="escalacao")
        materia(self.dir, "gol", AGORA - timedelta(hours=15), "Gol", importancia=5, evento="gol")
        slugs = [s["slug"] for s in panorama.pick_sources(self.candidatos())]
        self.assertNotIn("esc", slugs)
        self.assertNotIn("gol", slugs)

    def test_panorama_anterior_nao_vira_fonte(self):
        self.popular()
        materia(self.dir, "pan", AGORA - timedelta(hours=20), "Vasco hoje: antigo", fonte="Vascainamente")
        self.assertNotIn("pan", [s["slug"] for s in panorama.pick_sources(self.candidatos())])

    def test_materia_velha_fica_de_fora(self):
        self.popular()
        materia(self.dir, "velha", AGORA - timedelta(hours=60), "Velha")
        self.assertNotIn("velha", [c["slug"] for c in self.candidatos()])


class Fluxo(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        for i in range(4):
            materia(self.dir, f"m{i}", AGORA - timedelta(hours=14 + i), f"Matéria {i}", importancia=3 + (i % 2),
                    imagem="https://img/a.jpg" if i == 1 else "")
        self.publicadas = []

    def tearDown(self):
        self.tmp.cleanup()

    def rodar(self, client, artigo=None, problemas=None, now=AGORA):
        prompts = []

        def ask(c, prompt):
            prompts.append(prompt)
            return dict(artigo or ARTIGO)

        def publish(article, category, source, url, image):
            self.publicadas.append((article, category, source, url, image))
            return "slug-do-panorama"

        facts = (lambda texts, ref: problemas) if problemas is not None else (lambda texts, ref: [])
        slug = panorama.run(client, now, CONTEXT, ask, facts, lambda t: t, publish, news_dir=self.dir)
        return slug, prompts

    def test_publica_com_fonte_do_site_e_links(self):
        slug, prompts = self.rodar(FakeClient("OK"))
        self.assertEqual(slug, "slug-do-panorama")
        artigo, categoria, fonte, url, imagem = self.publicadas[0]
        self.assertEqual((categoria, fonte, artigo["importance"], artigo["matchEvent"]), ("clube", "Vascainamente", 3, None))
        self.assertEqual(imagem, "https://img/a.jpg")
        self.assertIn("Leia também:", artigo["body"])
        self.assertIn("](/m", artigo["body"])
        self.assertIn("[ontem, quarta-feira, 4/11]", prompts[0])
        self.assertIn("Hoje é quinta-feira, 5/11/2026", prompts[0])

    def test_segunda_leitura_com_duvida_nao_publica(self):
        slug, _ = self.rodar(FakeClient("DUVIDA: o placar não está nas matérias"))
        self.assertIsNone(slug)
        self.assertEqual(self.publicadas, [])

    def test_checagem_de_fatos_barra_depois_de_duas_tentativas(self):
        slug, prompts = self.rodar(FakeClient("OK"), problemas=["placar 5 a 0 não está nas fontes"])
        self.assertIsNone(slug)
        self.assertEqual(len(prompts), 2)
        self.assertIn("placar 5 a 0", prompts[1])

    def test_falha_na_segunda_leitura_nao_publica(self):
        class Quebrado(FakeClient):
            def create(self, **kw):
                raise RuntimeError("fora do ar")

        slug, _ = self.rodar(Quebrado())
        self.assertIsNone(slug)

    def test_resposta_incompleta_nao_publica(self):
        slug, _ = self.rodar(FakeClient("OK"), artigo={"title": "Só título"})
        self.assertIsNone(slug)

    def test_nao_roda_se_ja_tem_materia_de_hoje(self):
        materia(self.dir, "hoje", AGORA - timedelta(hours=1), "Já saiu hoje")
        slug, prompts = self.rodar(FakeClient("OK"))
        self.assertIsNone(slug)
        self.assertEqual(prompts, [])

    def test_poucas_materias_nao_publica(self):
        for f in list(self.dir.glob("m[1-3].md")):
            f.unlink()
        slug, prompts = self.rodar(FakeClient("OK"))
        self.assertIsNone(slug)
        self.assertEqual(prompts, [])

    def test_travessao_do_modelo_e_removido(self):
        artigo = dict(ARTIGO, body="Texto — com travessão.")
        self.rodar(FakeClient("OK"), artigo=artigo)
        # strip_dashes de verdade vive no robô; aqui só garante que a função recebida é aplicada
        usado = []
        panorama.run(FakeClient("OK"), AGORA, CONTEXT, lambda c, p: dict(artigo), lambda t, r: [],
                     lambda t: usado.append(t) or t.replace("—", ","), lambda *a: "s", news_dir=self.dir)
        self.assertTrue(usado)


class Revisao(unittest.TestCase):
    def test_parse(self):
        self.assertTrue(panorama.parse_review("OK")[0])
        self.assertTrue(panorama.parse_review("ok.")[0])
        self.assertFalse(panorama.parse_review("DUVIDA: dia errado")[0])
        self.assertFalse(panorama.parse_review("")[0])


if __name__ == "__main__":
    unittest.main()
