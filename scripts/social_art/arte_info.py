"""Gera as artes de informação (story 1080x1920 e feed 1080x1350) no padrão de docs/PADRAO-ARTES.md.

    python scripts/social_art/arte_info.py scripts/social_art/exemplos/hoje-tem-vasco.json <pasta_saida>

Saída: story.png e feed.png. O JSON tem: rotulo, titulo (duas linhas) e blocos (de 1 a 4, cada um com
"k" e "v", onde "v" é uma lista de linhas, e, se quiser, "logos": lista com nomes de scripts/social_art/logos/,
"vasco" (escudo atual, de public/images) ou "x"). O escudo do cabeçalho vem de public/images. Os textos precisam de revisão
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
LOGOS = AQUI / "logos"
# logos escuras precisam de placa clara para ter contraste no fundo preto
PLACA = {"sportv"}

# medidas de cada formato (px). A coluna começa em "topo" e os blocos vão um abaixo do outro, com os espaços abaixo.
FORMATOS = {
    "story": dict(h=1920, topo=170, a=150, b=200, gap_b=8, head_h1=30, h1_painel=56, painel_foot=44,
                  pad="34px 48px", entre=26, v=54, escudo=132, logo_h=60, limite=1670),
    "feed": dict(h=1350, topo=48, a=110, b=160, gap_b=6, head_h1=26, h1_painel=36, painel_foot=34,
                 pad="26px 48px", entre=16, v=48, escudo=92, logo_h=44, limite=1350),
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
#col{position:absolute;left:64px;right:64px;top:%(topo)spx}
#head{display:flex;align-items:center;gap:26px;font-size:34px;color:var(--mut)}
#head img{height:96px}
h1{margin-top:%(head_h1)spx;margin-left:-4px;font-family:an,Impact,sans-serif;font-weight:400;text-transform:uppercase;line-height:1}
h1 .a{display:block;font-size:%(a)spx;color:var(--cr)}
h1 .b{display:block;font-size:%(b)spx;color:var(--redt);margin-top:%(gap_b)spx}
#panel{margin-top:%(h1_painel)spx;width:952px;border:6px solid var(--cr);box-shadow:12px 12px 0 var(--cr);background:var(--bg);padding:%(pad)s}
.row+.row{margin-top:%(entre)spx}
.row .k{font-size:30px;color:var(--redt)}
.row .v{font-size:%(v)spx;line-height:1.1;margin-top:10px}
.row.com-logos{display:flex;align-items:center;justify-content:space-between;gap:24px}
.logos{display:flex;align-items:center;gap:20px;flex:none}
.logos.coluna{flex-direction:column;align-items:flex-end;gap:14px}
.logos .escudo{height:%(escudo)spx;width:auto}
.logos .canal{height:%(logo_h)spx;width:auto;display:block}
.logos .placa{background:var(--cr);border-radius:10px;padding:8px 16px;display:flex;align-items:center}
.logos .placa .canal{height:%(logo_h_placa)spx}
.logos .xis{font-family:an,Impact,sans-serif;font-size:%(xis)spx;color:var(--redt);line-height:1}
#foot{margin-top:%(painel_foot)spx;font-size:32px;color:var(--mut);line-height:1.4}
"""


def esc(t: str) -> str:
    return html.escape(t)


def validar(d: dict) -> None:
    textos = [d["rotulo"], *d["titulo"]] + [d_k for b in d["blocos"] for d_k in [b["k"], *b["v"]]]
    if len(d["titulo"]) != 2:
        raise ValueError("o título tem de ter duas linhas")
    if not 1 <= len(d["blocos"]) <= 4:
        raise ValueError("o painel aceita de 1 a 4 blocos")
    for b in d["blocos"]:
        for nome in b.get("logos", []):
            if nome not in ("x", "vasco") and not (LOGOS / f"{nome}.png").exists():
                raise ValueError(f"logo não encontrada em scripts/social_art/logos/: {nome}")
    for t in textos:
        if "—" in t or "–" in t:
            raise ValueError(f"travessão ou meia-risca não é permitido: {t!r}")


def html_logos(nomes: list[str]) -> str:
    itens = []
    for n in nomes:
        if n == "x":
            itens.append('<span class="xis">x</span>')
        elif n == "vasco":
            itens.append(f'<img class="escudo" src="file://{ESCUDO}" alt="">')
        elif n in PLACA:
            itens.append(f'<span class="placa"><img class="canal" src="file://{LOGOS / (n + ".png")}" alt=""></span>')
        elif n == "bragantino":
            itens.append(f'<img class="escudo" src="file://{LOGOS / (n + ".png")}" alt="">')
        else:
            itens.append(f'<img class="canal" src="file://{LOGOS / (n + ".png")}" alt="">')
    coluna = " coluna" if any(n not in ("x", "vasco", "bragantino") for n in nomes) else ""
    return f'<div class="logos{coluna}">{"".join(itens)}</div>'


def montar(d: dict, fmt: dict) -> str:
    def bloco(b: dict) -> str:
        texto = (f'<div><div class="k mono">{esc(b["k"])}</div>'
                 f'<div class="v">{"<br>".join(esc(x) for x in b["v"])}</div></div>')
        if b.get("logos"):
            return f'<div class="row com-logos">{texto}{html_logos(b["logos"])}</div>'
        return f'<div class="row">{texto}</div>'

    linhas = "".join(bloco(b) for b in d["blocos"])
    medidas = dict(fmt, f=AQUI / "fonts", g=AQUI / "grain.png",
                   logo_h_placa=int(fmt["logo_h"] * 0.78), xis=int(fmt["escudo"] * 0.5))
    return (f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>{CSS % medidas}</style></head><body>'
            f'<div id="col"><div id="head" class="mono"><img src="file://{ESCUDO}" alt=""><span>{esc(d["rotulo"])}</span></div>'
            f'<h1><span class="a">{esc(d["titulo"][0])}</span><span class="b">{esc(d["titulo"][1])}</span></h1>'
            f'<div id="panel">{linhas}</div>'
            f'<div id="foot" class="mono">vascainamente.com.br<br>@_vascainamente_</div></div><div class="grain"></div></body></html>')


def caixas(pg) -> dict:
    return pg.evaluate("""() => Object.fromEntries(['#head','h1','#panel','#foot'].map(s => {
        const r = document.querySelector(s).getBoundingClientRect(); return [s, [r.top, r.bottom]]}))""")


def conferir(nome: str, c: dict, fmt: dict) -> list[str]:
    """Os blocos andam em fluxo (nunca se sobrepõem); aqui se confere se o conteúdo cabe na tela."""
    erros = []
    if c["#foot"][1] > fmt["limite"]:
        erros.append(f"{nome}: o conteúdo passa do limite da tela ({c['#foot'][1]:.0f} de {fmt['limite']}); reduza textos ou blocos")
    if c["#panel"][1] + 12 > c["#foot"][0]:
        erros.append(f"{nome}: o rodapé está colado no painel")
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
