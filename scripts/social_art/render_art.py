"""Gera a arte de uma matéria no estilo do Vascainamente (neobrutalismo editorial).

    python scripts/social_art/render_art.py <slug> <saida.png> [feed|x]

feed = 1080x1350 (Instagram), x = 1600x900 (X). Saída .jpg ou .png. O escudo vem sempre de public/images/escudo-1-cruz.png.
Também usável como módulo: render(dados, formato, caminho).
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
CATEGORIAS = {
    "resultado": "Resultado", "clube": "Clube", "elenco": "Elenco", "urgente": "Urgente",
    "base": "Base", "feminino": "Feminino", "transferencia": "Mercado",
}
MESES = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."]
SIZES = {"feed": (1080, 1350), "x": (1600, 900)}


def render(dados: dict, formato: str, saida: Path, escala: int = 2) -> None:
    w, h = SIZES[formato]
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=escala)
        pg.goto((HERE / "template.html").as_uri())
        pg.evaluate("document.fonts.ready")
        pg.evaluate("d => fill(d)", {**dados, "fmt": formato})
        pg.evaluate("document.fonts.ready")
        pg.wait_for_timeout(400)
        pg.evaluate("d => fill(d)", {**dados, "fmt": formato})  # refaz o ajuste com as fontes já carregadas
        pg.wait_for_timeout(200)
        if saida.suffix.lower() in (".jpg", ".jpeg"):
            pg.screenshot(path=str(saida), type="jpeg", quality=90)  # bem mais leve que PNG com grão (limite do X: 5 MB)
        else:
            pg.screenshot(path=str(saida))
        b.close()


def juntar_placar(texto: str) -> str:
    """Placar nunca quebra no meio da linha: "2 a 0" e "1 x 1" ficam grudados (espaço sem quebra)."""
    return re.sub(r"(\d+) (a|x) (\d+)", "\\1\u00a0\\2\u00a0\\3", texto)


def dados_da_materia(meta: dict) -> dict:
    d = meta["_date"]
    return {
        "title": juntar_placar(" ".join(meta["title"].split())),
        "cat": CATEGORIAS.get(meta.get("category", ""), "Notícia"),
        "source": meta.get("source", "").strip(),
        "date": f"{d.day:02d} {MESES[d.month - 1]} {d.year}",
    }


if __name__ == "__main__":
    sys.path.insert(0, str(HERE.parent))
    import social_post as sp

    slug, saida = sys.argv[1], Path(sys.argv[2])
    formato = sys.argv[3] if len(sys.argv) > 3 else "feed"
    meta = next(a for a in sp.load_articles() if a["slug"] == slug)
    render(dados_da_materia(meta), formato, saida)
    print("ok", saida)
