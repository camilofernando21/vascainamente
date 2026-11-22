"""Gera as artes de informação (story 1080x1920 e feed 1080x1350) no padrão de docs/PADRAO-ARTES.md.

    python scripts/social_art/arte_info.py scripts/social_art/exemplos/hoje-tem-vasco.json <pasta_saida>

Saída: story.png e feed.png. O JSON tem: rotulo, titulo (duas linhas) e blocos (de 1 a 4, cada um com
"k" e "v", onde "v" é uma lista de linhas). O escudo vem de public/images. Os textos precisam de revisão
de português antes de ir ao Camilo.
"""
from __future__ import annotations

import html
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parents[2]
AQUI = Path(__file__).resolve().parent
ESCUDO = RAIZ / "public" / "images" / "escudo-5-atual.png"

# medidas de cada formato (px)
FORMATOS = {
    "story": dict(h=1920, head=200, h1=330, a=170, b=230, gap_b=10, painel=800, pad="38px 48px",
                  entre=30, v=58, foot=1590, foot_lh=1.6, limite_baixo=1700),
    "feed": dict(h=1350, head=48, h1=176, a=120, b=176, gap_b=6, painel=510, pad="30px 48px",
                 entre=20, v=52, foot=1226, foot_lh=1.4, limite_baixo=1350),
}

CSS = """
@font-face{font-family:IS;src:url(file://%(f)s/InstrumentSerif-Regular.ttf)}
@font-face{font-family:DM;src:url(file://%(f)s/DMMono-Medium.ttf)}
@font-face{font-family:an;src:url(file://%(f)s/anton-latin-400-normal.woff2)}
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0d0d0d;--cr:#F0EBE1;--redt:#FF4D5E;--mut:rgba(240,235,225,.78)}
body{width:1080px;height:%(h)spx;background:var(--bg);position:relative;overflow:hidden;color:var(--cr);font-family:IS,serif}
.grain{position:absolute;inset:0;background:url(file://%(g)s);opacity:.22;mix-blend-mode:screen;pointer-events:none}
.mono{font-family:DM,monospace;text-transform:uppercase;letter-spacing:5px}
#head{position:absolute;left:64px;right:64px;top:%(head)spx;display:flex;align-items:center;gap:26px;font-size:34px;color:var(--mut)}
#head img{height:96px}
h1{position:absolute;left:60px;top:%(h1)spx;font-family:an,Impact,sans-serif;font-weight:400;text-transform:uppercase;line-height:1}
h1 .a{display:block;font-size:%(a)spx;color:var(--cr)}
h1 .b{display:block;font-size:%(b)spx;color:var(--redt);margin-top:%(gap_b)spx}
#panel{position:absolute;left:64px;top:%(painel)spx;width:952px;border:6px solid var(--cr);box-shadow:12px 12px 0 var(--cr);background:var(--bg);padding:%(pad)s}
.row+.row{margin-top:%(entre)spx}
.row .k{font-size:30px;color:var(--redt)}
.row .v{font-size:%(v)spx;line-height:1.1;margin-top:10px}
#foot{position:absolute;left:64px;right:64px;top:%(foot)spx;font-size:32px;color:var(--mut);line-height:%(foot_lh)s}
"""


def esc(t: str) -> str:
    return html.escape(t)


def validar(d: dict) -> None:
    textos = [d["rotulo"], *d["titulo"]] + [d_k for b in d["blocos"] for d_k in [b["k"], *b["v"]]]
    if len(d["titulo"]) != 2:
        raise ValueError("o título tem de ter duas linhas")
    if not 1 <= len(d["blocos"]) <= 4:
        raise ValueError("o painel aceita de 1 a 4 blocos")
    for t in textos:
        if "—" in t or "–" in t:
            raise ValueError(f"travessão ou meia-risca não é permitido: {t!r}")


def montar(d: dict, fmt: dict) -> str:
    linhas = "".join(
        f'<div class="row"><div class="k mono">{esc(b["k"])}</div><div class="v">{"<br>".join(esc(x) for x in b["v"])}</div></div>'
        for b in d["blocos"])
    medidas = dict(fmt, f=AQUI / "fonts", g=AQUI / "grain.png")
    return (f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>{CSS % medidas}</style></head><body>'
            f'<div id="head" class="mono"><img src="file://{ESCUDO}" alt=""><span>{esc(d["rotulo"])}</span></div>'
            f'<h1><span class="a">{esc(d["titulo"][0])}</span><span class="b">{esc(d["titulo"][1])}</span></h1>'
            f'<div id="panel">{linhas}</div>'
            f'<div id="foot" class="mono">vascainamente.com.br<br>@_vascainamente_</div><div class="grain"></div></body></html>')


def caixas(pg) -> dict:
    return pg.evaluate("""() => Object.fromEntries(['#head','h1','#panel','#foot'].map(s => {
        const r = document.querySelector(s).getBoundingClientRect(); return [s, [r.top, r.bottom]]}))""")


def conferir(nome: str, c: dict, fmt: dict) -> list[str]:
    """Nada pode encostar em outro bloco nem sair da tela (a margem do title é a do próprio texto)."""
    erros = []
    if c["h1"][1] > c["#panel"][0] - 20:
        erros.append(f"{nome}: o painel está colado no título")
    if c["#panel"][1] + 12 > c["#foot"][0] - 10:
        erros.append(f"{nome}: o rodapé está colado no painel")
    if c["#foot"][1] > fmt["limite_baixo"] + 40:
        erros.append(f"{nome}: o rodapé passa do limite da tela")
    return erros


def gerar(arq: str, saida: str) -> None:
    d = json.loads(Path(arq).read_text(encoding="utf-8"))
    validar(d)
    out = Path(saida)
    out.mkdir(parents=True, exist_ok=True)
    problemas: list[str] = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        for nome, fmt in FORMATOS.items():
            pg = b.new_page(viewport={"width": 1080, "height": fmt["h"]}, device_scale_factor=2)
            arq_html = out / f"{nome}.html"
            arq_html.write_text(montar(d, fmt), encoding="utf-8")
            pg.goto(f"file://{arq_html.resolve()}")
            pg.wait_for_timeout(600)
            problemas += conferir(nome, caixas(pg), fmt)
            pg.screenshot(path=str(out / f"{nome}.png"))
            arq_html.unlink()
        b.close()
    for pr in problemas:
        print("AVISO", pr)
    print(f"story.png e feed.png em {out}" + (" (com avisos)" if problemas else ""))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    gerar(sys.argv[1], sys.argv[2])
