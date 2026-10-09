import fs from "fs";
import path from "path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { CROSS_PATH } from "@/components/ui/cruz-malta";

// Shared renderer for every generated image (link previews, Instagram card).
// satori (JSX -> SVG) + resvg (SVG -> PNG) are what next/og uses internally; called directly because
// next/og's Node build resolves its own files with path.join on a URL, which breaks on Windows.
// Fonts and grain are read from the repo, never fetched.

const BG = "#0D0D0D";
const CREAM = "#F0EBE1";
const RED = "#C8003C";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel));

type Fonts = Parameters<typeof satori>[1]["fonts"];
let cache: { fonts: Fonts; grain: Record<string, string> } | null = null;

// Grain: a sparse 1-bit texture at the exact output size (light to embed, never resampled).
const GRAIN_SIZES = ["1200x630", "1080x1350"];

function assets() {
  if (!cache) {
    cache = {
      fonts: [
        { name: "Instrument Serif", data: read("assets/fonts/InstrumentSerif-Regular.ttf"), weight: 400, style: "normal" },
        { name: "Instrument Serif", data: read("assets/fonts/InstrumentSerif-Italic.ttf"), weight: 400, style: "italic" },
        { name: "DM Mono", data: read("assets/fonts/DMMono-Regular.ttf"), weight: 400, style: "normal" },
        { name: "DM Mono", data: read("assets/fonts/DMMono-Medium.ttf"), weight: 500, style: "normal" },
      ],
      grain: Object.fromEntries(
        GRAIN_SIZES.map((size) => [
          size,
          `data:image/png;base64,${read(`assets/og-grain-${size}.png`).toString("base64")}`,
        ])
      ),
    };
  }
  return cache;
}

function Cross({ size, opacity = 1 }: { size: number; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 696 696" style={{ opacity }}>
      <path d={CROSS_PATH} fill={RED} />
    </svg>
  );
}

// Long headlines shrink so they always fit in the frame.
function titleSize(title: string, base: number) {
  const n = title.length;
  if (n > 110) return Math.round(base * 0.7);
  if (n > 85) return Math.round(base * 0.8);
  if (n > 60) return Math.round(base * 0.9);
  return base;
}

function Frame({
  width,
  height,
  padding,
  children,
}: {
  width: number;
  height: number;
  padding: number;
  children: React.ReactNode;
}) {
  const { grain: grains } = assets();
  const grain = grains[`${width}x${height}`] ?? grains[GRAIN_SIZES[0]];
  return (
    <div style={{ width, height, display: "flex", position: "relative", background: BG, color: CREAM }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={grain} width={width} height={height} alt="" style={{ position: "absolute", inset: 0, opacity: 0.07 }} />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding,
        }}
      >
        {children}
      </div>
    </div>
  );
}

async function render(element: React.ReactNode, width: number, height: number): Promise<Response> {
  const svg = await satori(element, { width, height, fonts: assets().fonts });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();
  // JPEG, not PNG: the grain makes PNGs ~300-600 KB, and WhatsApp drops heavy preview images
  const jpeg = await sharp(png).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

const label = (size: number, color = "rgba(240,235,225,0.55)") =>
  ({ fontFamily: "DM Mono", fontSize: size, letterSpacing: size * 0.2, textTransform: "uppercase", color }) as const;

function Footer({ size, right }: { size: number; right?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div style={{ ...label(size, "rgba(240,235,225,0.75)"), textTransform: "lowercase", display: "flex" }}>
        vascainamente
      </div>
      {right ? <div style={{ ...label(size * 0.8, "rgba(240,235,225,0.4)"), display: "flex" }}>{right}</div> : null}
    </div>
  );
}

export type ArticleImageData = { title: string; category: string; date?: string; urgent?: boolean };

/** Link preview / Instagram card for one article. */
export async function articleImage(data: ArticleImageData, width: number, height: number) {
  const portrait = height > width;
  const pad = portrait ? 88 : 72;
  const titleBase = portrait ? 132 : 96;
  return render(
    (
      <Frame width={width} height={height} padding={pad}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Cross size={portrait ? 72 : 56} />
          <div style={{ ...label(portrait ? 28 : 22, data.urgent ? RED : "rgba(240,235,225,0.6)"), display: "flex" }}>
            {data.category}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Instrument Serif",
            fontSize: titleSize(data.title, titleBase),
            lineHeight: 1.04,
            letterSpacing: -1.5,
            color: CREAM,
            maxWidth: portrait ? "100%" : "92%",
          }}
        >
          {data.title}
        </div>
        <Footer size={portrait ? 30 : 24} right={data.date} />
      </Frame>
    ),
    width,
    height
  );
}

/** Home preview. */
export async function homeImage(width: number, height: number) {
  return render(
    (
      <Frame width={width} height={height} padding={72}>
        <div style={{ ...label(22), display: "flex" }}>Notícias do Vasco da Gama</div>
        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          <Cross size={170} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: "Instrument Serif", fontSize: 140, lineHeight: 0.95, letterSpacing: -4 }}>
              Vascainamente
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "Instrument Serif",
                fontStyle: "italic",
                fontSize: 44,
                color: "rgba(240,235,225,0.55)",
                marginTop: 16,
              }}
            >
              Vascaíno não se escolhe. Se nasce.
            </div>
          </div>
        </div>
        <Footer size={24} right="Atualizado a cada 15 minutos" />
      </Frame>
    ),
    width,
    height
  );
}

/** Category page preview: name big, total as ghost number. */
export async function categoryImage(name: string, total: number, width: number, height: number) {
  return render(
    (
      <Frame width={width} height={height} padding={72}>
        <div
          style={{
            position: "absolute",
            right: 40,
            bottom: -120,
            display: "flex",
            fontFamily: "Instrument Serif",
            fontSize: 520,
            lineHeight: 1,
            color: "rgba(240,235,225,0.05)",
          }}
        >
          {String(total).padStart(2, "0")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Cross size={56} />
          <div style={{ ...label(22), display: "flex" }}>
            Categoria · {total} {total === 1 ? "notícia" : "notícias"}
          </div>
        </div>
        <div style={{ display: "flex", fontFamily: "Instrument Serif", fontSize: 190, lineHeight: 0.9, letterSpacing: -5 }}>
          {name}
        </div>
        <Footer size={24} />
      </Frame>
    ),
    width,
    height
  );
}
