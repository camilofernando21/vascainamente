"""Gera o carrossel da Quinta Histórica (1080x1350) a partir de um JSON de edição.

    python scripts/quinta_historica/gerar.py scripts/quinta_historica/edicoes/2026-11-19.json <pasta_saida>

Saída: slide1.png ... slideN.png. Estilo neobrutalista do Vascainamente. O escudo vem sempre de
public/images/escudo-1-cruz.png. A foto (opcional) é tratada em preto e branco e entra na capa e em
slides marcados com "foto": true. Os textos precisam de revisão de português antes de ir ao Camilo.
"""
from __future__ import annotations

import html
import json
import sys
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps
from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parents[2]
SOCIAL = RAIZ / "scripts" / "social_art"
CRUZ = RAIZ / "public" / "images" / "escudo-1-cruz.png"

CSS = f"""
@font-face{{font-family:IS;src:url(file://{SOCIAL}/fonts/InstrumentSerif-Regular.ttf)}}
@font-face{{font-family:DM;src:url(file://{SOCIAL}/fonts/DMMono-Medium.ttf)}}
@font-face{{font-family:an;src:url(file://{SOCIAL}/fonts/anton-latin-400-normal.woff2)}}
*{{margin:0;padding:0;box-sizing:border-box}}
:root{{--bg:#0d0d0d;--cr:#F0EBE1;--redt:#FF4D5E;--mut:rgba(240,235,225,.72)}}
body{{width:1080px;height:1350px;background:var(--bg);position:relative;overflow:hidden;color:var(--cr);font-family:IS,serif}}
.grain{{position:absolute;inset:0;background:url(file://{SOCIAL}/grain.png);opacity:.22;mix-blend-mode:screen;z-index:30}}
.mono{{font-family:DM,monospace;text-transform:uppercase;letter-spacing:5px}}
#head{{position:absolute;left:56px;top:54px;display:flex;align-items:center;gap:18px;font-size:24px;color:var(--mut)}}
#head img{{height:46px}}
h1,h2{{position:absolute;left:54px;top:124px;font-family:an,Impact,sans-serif;font-weight:400;text-transform:uppercase}}
h1{{font-size:176px;line-height:1.2}}
h2{{font-size:170px;right:56px;line-height:1.2}}
h1 span,h2 span{{display:block}} .b{{color:var(--redt)}}
#panel{{position:absolute;left:56px;top:600px;width:968px;height:590px;border:6px solid var(--cr);box-shadow:12px 12px 0 var(--cr);background:var(--bg);padding:30px 44px;display:flex;flex-direction:column;justify-content:center}}
#panel p{{font-size:54px;line-height:1.18}} #panel p+p{{margin-top:26px}}
#panel .k{{font-family:DM,monospace;font-size:24px;letter-spacing:5px;text-transform:uppercase;color:var(--redt);display:block;margin-bottom:18px}}
#foto{{position:absolute;left:56px;width:968px;height:528px;border:6px solid var(--cr);box-shadow:12px 12px 0 var(--cr);overflow:hidden;background:#000}}
#foto img{{width:100%;height:100%;object-fit:cover;display:block;filter:contrast(1.12) brightness(1.02)}}
#cred{{position:absolute;left:56px;right:56px;top:1236px;font-size:20px;letter-spacing:2px !important;color:var(--mut);line-height:1.2;white-space:nowrap}}
#sub2{{position:absolute;left:56px;right:56px;top:1160px;font-size:56px;line-height:1.1;font-style:italic}}
#foot{{position:absolute;left:56px;right:56px;bottom:46px;display:flex;justify-content:space-between;font-size:22px;color:rgba(240,235,225,.6)}}
"""


def tratar_foto(origem: Path, destino: Path) -> None:
    im = Image.open(origem).convert("L")
    im = im.resize((im.width * 4, im.height * 4), Image.LANCZOS).filter(ImageFilter.GaussianBlur(2.2))
    im = ImageOps.autocontrast(im, cutoff=0.5).filter(ImageFilter.UnsharpMask(radius=4, percent=60, threshold=3))
    im.save(destino, quality=92)


def esc(t: str) -> str:
    return html.escape(t)


def titulo(linhas: list[str], tag: str, estilo: str = "") -> str:
    a, b = linhas
    return f'<{tag}{estilo}><span>{esc(a)}</span><span class="b">{esc(b)}</span></{tag}>'


def montar(ed: dict, i: int, s: dict, total: int, foto: str | None) -> str:
    n = i + 1
    cred = f'<div id="cred" class="mono">{esc(ed["credito"])}</div>' if foto else ""
    if s.get("tipo") == "capa":
        corpo = titulo(ed["capa"], "h1")
        if foto:
            corpo += f'<div id="foto" style="top:600px"><img src="file://{foto}" alt=""></div>'
            corpo += f'<div id="sub2">{esc(ed["subtitulo"])}</div>' + cred
        else:
            corpo += f'<div id="panel"><span class="k">{esc(ed.get("chamada", "Esta quinta"))}</span><p style="font-size:84px;line-height:1.1;font-style:italic">{esc(ed["subtitulo"])}</p></div>'
        rod = "Deslize"
    elif s.get("foto") and foto:
        a, b = s["h"]
        corpo = (f'<h2 style="font-size:120px"><span style="display:inline">{esc(a)} </span>'
                 f'<span class="b" style="display:inline">{esc(b)}</span></h2>'
                 f'<div id="foto" style="top:310px"><img src="file://{foto}" alt=""></div>'
                 f'<div id="panel" style="top:890px;height:auto"><span class="k">{esc(s["k"])}</span>'
                 + "".join(f"<p>{esc(x)}</p>" for x in s["p"]) + "</div>" + cred)
        rod = f"{n}/{total}"
    else:
        corpo = titulo(s["h"], "h2") + f'<div id="panel"><span class="k">{esc(s["k"])}</span>' + "".join(f"<p>{esc(x)}</p>" for x in s["p"]) + "</div>"
        rod = f"{n}/{total}"
    return (f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>{CSS}</style></head><body>'
            f'<div id="head" class="mono"><img src="file://{CRUZ}" alt=""><span>{esc(ed.get("serie", "Quinta Histórica"))} · {esc(ed["ano"])}</span></div>'
            f'{corpo}<div id="foot" class="mono"><span>vascainamente.com.br</span><span>{rod}</span></div><div class="grain"></div></body></html>')


def main(arq: str, saida: str) -> None:
    ed = json.loads(Path(arq).read_text(encoding="utf-8"))
    out = Path(saida)
    out.mkdir(parents=True, exist_ok=True)
    foto = None
    if ed.get("foto"):
        origem = RAIZ / ed["foto"]
        if origem.exists():
            destino = out / "foto_tratada.jpg"
            tratar_foto(origem, destino)
            foto = str(destino.resolve())
    slides = [{"tipo": "capa"}] + ed["slides"]
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1080, "height": 1350}, device_scale_factor=2)
        for i, s in enumerate(slides):
            f = out / f"slide{i + 1}.html"
            f.write_text(montar(ed, i, s, len(slides), foto), encoding="utf-8")
            pg.goto(f"file://{f.resolve()}")
            pg.wait_for_timeout(500)
            alt = pg.evaluate("[...document.querySelectorAll('h1,h2')].map(e=>e.getBoundingClientRect().bottom)")
            if alt and max(alt) > 600 and not (s.get("foto") and foto) and max(alt) > 560:
                print(f"AVISO slide {i + 1}: título passa de 560px ({max(alt):.0f}), pode invadir o painel")
            pg.screenshot(path=str(out / f"slide{i + 1}.png"))
        b.close()
    print(f"{len(slides)} slides em {out}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
