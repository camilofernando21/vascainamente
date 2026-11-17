"""Testes do postador social.

    python3 -m unittest scripts/test_social_post.py
"""

import sys
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parent))
import social_post as sp  # noqa: E402

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


class Assinatura(unittest.TestCase):
    def test_exemplo_oficial_da_documentacao_do_x(self):
        params = {
            "include_entities": "true",
            "oauth_consumer_key": "xvz1evFS4wEEPTGEFPHBog",
            "oauth_nonce": "kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg",
            "oauth_signature_method": "HMAC-SHA1",
            "oauth_timestamp": "1318622958",
            "oauth_token": "370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb",
            "oauth_version": "1.0",
            "status": "Hello Ladies + Gentlemen, a signed OAuth request!",
        }
        sig = sp.oauth1_signature(
            "POST", "https://api.twitter.com/1.1/statuses/update.json", params,
            "kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw",
            "LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE",
        )
        self.assertEqual(sig, "hCtSmYh+iHYCEqBWrE7C7hYmtUk=")


class Texto(unittest.TestCase):
    def test_modelo(self):
        t = sp.build_text({"title": "Vasco vence", "slug": "2026-11-17-teste"})
        self.assertEqual(t, "Vasco vence\n\nhttps://www.vascainamente.com.br/2026-11-17-teste\n\n#Vasco")

    def test_titulo_normal_passa(self):
        a = materia()
        self.assertEqual(sp.validate(a, sp.build_text(a)), [])

    def test_travessao_bloqueia(self):
        a = materia(title="Vasco vence — e sobe na tabela")
        self.assertTrue(any("travessão" in p for p in sp.validate(a, sp.build_text(a))))

    def test_meia_risca_bloqueia(self):
        a = materia(title="Vasco 2 – 0 Flamengo")
        self.assertTrue(any("travessão" in p for p in sp.validate(a, sp.build_text(a))))

    def test_texto_longo_bloqueia(self):
        a = materia(title="x" * 300)
        self.assertTrue(any("caracteres" in p for p in sp.validate(a, sp.build_text(a))))

    def test_link_conta_23(self):
        self.assertEqual(sp.tweet_length("a https://www.vascainamente.com.br/um-slug-bem-comprido-aqui"), 2 + 23)

    def test_sem_fonte_bloqueia(self):
        a = materia(source="")
        self.assertTrue(any("fonte" in p for p in sp.validate(a, sp.build_text(a))))

    def test_campo_vazio_bloqueia(self):
        a = materia(title="Vasco None Flamengo")
        self.assertTrue(any("vazio" in p for p in sp.validate(a, sp.build_text(a))))


class Escolha(unittest.TestCase):
    def test_escolhe_nota_alta_recente(self):
        out, _ = sp.pick([materia()], estado(), AGORA, "auto")
        self.assertEqual(len(out), 1)

    def test_ignora_nota_baixa(self):
        out, _ = sp.pick([materia(importance=3)], estado(), AGORA, "auto")
        self.assertEqual(out, [])

    def test_ignora_antiga(self):
        out, _ = sp.pick([materia(minutos=4 * 60)], estado(), AGORA, "auto")
        self.assertEqual(out, [])

    def test_transferencia_nunca_sai_sozinha(self):
        out, notas = sp.pick([materia(category="transferencia", importance=5)], estado(), AGORA, "auto")
        self.assertEqual(out, [])
        self.assertTrue(notas)

    def test_nao_repete(self):
        st = estado()
        st["posted"]["2026-11-17-teste"] = {"at": (AGORA - timedelta(hours=2)).isoformat(), "id": "1"}
        out, _ = sp.pick([materia()], st, AGORA, "auto")
        self.assertEqual(out, [])

    def test_silencio_de_madrugada(self):
        noite = datetime(2026, 11, 17, 3, 0, tzinfo=TZ)
        a = materia()
        a["_date"] = noite - timedelta(minutes=10)
        out, notas = sp.pick([a], estado(), noite, "auto")
        self.assertEqual(out, [])
        self.assertIn("silêncio", notas[0])

    def test_intervalo_minimo(self):
        st = estado()
        st["posted"]["outra"] = {"at": (AGORA - timedelta(minutes=10)).isoformat(), "id": "1"}
        out, _ = sp.pick([materia()], st, AGORA, "auto")
        self.assertEqual(out, [])

    def test_limite_diario(self):
        st = estado()
        for i in range(sp.MAX_PER_DAY):
            st["posted"][f"s{i}"] = {"at": (AGORA - timedelta(hours=1 + i * 0.1)).isoformat(), "id": str(i)}
        out, notas = sp.pick([materia()], st, AGORA, "auto")
        self.assertEqual(out, [])
        self.assertIn("limite", notas[0])

    def test_so_um_por_rodada_o_mais_importante(self):
        a = materia(slug="a", importance=4)
        b = materia(slug="b", importance=5)
        out, _ = sp.pick([a, b], estado(), AGORA, "auto")
        self.assertEqual([x["slug"] for x in out], ["b"])

    def test_ensaio_nao_repete_o_que_ja_mostrou(self):
        st = estado()
        st["seen_dry"]["2026-11-17-teste"] = AGORA.isoformat()
        out, _ = sp.pick([materia()], st, AGORA, "dry-run")
        self.assertEqual(out, [])


class Modos(unittest.TestCase):
    def test_modo_invalido_falha(self):
        import os
        os.environ["SOCIAL_MODE"] = "qualquer"
        try:
            self.assertEqual(sp.run(AGORA), 1)
        finally:
            os.environ.pop("SOCIAL_MODE")

    def test_off_nao_faz_nada(self):
        import os
        os.environ["SOCIAL_MODE"] = "off"
        try:
            self.assertEqual(sp.run(AGORA), 0)
        finally:
            os.environ.pop("SOCIAL_MODE")

    def test_check_sem_segredos_falha(self):
        import os
        os.environ["SOCIAL_MODE"] = "check"
        for k in ("X_POST_API_KEY", "X_POST_API_SECRET", "X_POST_ACCESS_TOKEN", "X_POST_ACCESS_SECRET"):
            os.environ.pop(k, None)
        try:
            self.assertEqual(sp.run(AGORA), 1)
        finally:
            os.environ.pop("SOCIAL_MODE")


class Imagem(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(Path(__file__).resolve().parent / "social_art"))
        import render_art
        self.ra = render_art

    def test_placar_fica_junto(self):
        self.assertEqual(self.ra.juntar_placar("vence por 2 a 0 e 1 x 1"), "vence por 2\u00a0a\u00a00 e 1\u00a0x\u00a01")

    def test_nao_mexe_em_texto_sem_placar(self):
        self.assertEqual(self.ra.juntar_placar("Vasco treina a 2 dias do jogo"), "Vasco treina a 2 dias do jogo")

    def test_dados_da_materia(self):
        d = self.ra.dados_da_materia({"title": "Vasco  vence", "category": "resultado", "source": "GE.Globo", "_date": AGORA})
        self.assertEqual(d["title"], "Vasco vence")
        self.assertEqual(d["cat"], "Resultado")
        self.assertEqual(d["date"], "17 nov. 2026")

    def test_categoria_desconhecida(self):
        d = self.ra.dados_da_materia({"title": "x", "category": "outra", "source": "s", "_date": AGORA})
        self.assertEqual(d["cat"], "Notícia")


class PostComImagem(unittest.TestCase):
    def test_post_leva_o_id_da_midia(self):
        from unittest import mock
        creds = {"api_key": "a", "api_secret": "b", "access_token": "c", "access_secret": "d"}
        fake = mock.Mock(status_code=201)
        fake.json.return_value = {"data": {"id": "99"}}
        with mock.patch.object(sp.requests, "post", return_value=fake) as post:
            self.assertEqual(sp.post_to_x("oi", creds, media_id="777"), ("ok", "99"))
        self.assertEqual(post.call_args.kwargs["json"], {"text": "oi", "media": {"media_ids": ["777"]}})

    def test_post_sem_imagem_nao_leva_midia(self):
        from unittest import mock
        creds = {"api_key": "a", "api_secret": "b", "access_token": "c", "access_secret": "d"}
        fake = mock.Mock(status_code=201)
        fake.json.return_value = {"data": {"id": "1"}}
        with mock.patch.object(sp.requests, "post", return_value=fake) as post:
            sp.post_to_x("oi", creds)
        self.assertEqual(post.call_args.kwargs["json"], {"text": "oi"})

    def test_envio_de_imagem_recusado_por_acesso(self):
        from unittest import mock
        creds = {"api_key": "a", "api_secret": "b", "access_token": "c", "access_secret": "d"}
        fake = mock.Mock(status_code=403, text="forbidden")
        img = sp.ROOT / "scripts" / "social_art" / "grain.png"
        with mock.patch.object(sp.requests, "post", return_value=fake):
            with self.assertRaises(sp.XAuthError):
                sp.upload_media(img, creds)

    def test_envio_de_imagem_devolve_id(self):
        from unittest import mock
        creds = {"api_key": "a", "api_secret": "b", "access_token": "c", "access_secret": "d"}
        fake = mock.Mock(status_code=200)
        fake.json.return_value = {"data": {"id": "555"}}
        img = sp.ROOT / "scripts" / "social_art" / "grain.png"
        with mock.patch.object(sp.requests, "post", return_value=fake) as post:
            self.assertEqual(sp.upload_media(img, creds), "555")
        self.assertEqual(post.call_args.kwargs["data"], {"media_category": "tweet_image"})


class Cabecalho(unittest.TestCase):
    def test_le_matéria_real(self):
        arts = sp.load_articles()
        self.assertGreater(len(arts), 100)
        self.assertTrue(all(a["slug"] and a["title"] for a in arts))


if __name__ == "__main__":
    unittest.main()
