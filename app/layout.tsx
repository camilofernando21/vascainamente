import type { Metadata } from "next";
import { Instrument_Serif, DM_Mono } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Vascainamente — Notícias do Vasco da Gama",
    template: "%s · Vascainamente",
  },
  description:
    "Portal de notícias 100% dedicado ao Club de Regatas Vasco da Gama. Transferências, resultados, elenco e tudo sobre o Gigante da Colina.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${instrumentSerif.variable} ${dmMono.variable}`}>
      <body className="antialiased">
        {children}

        <canvas
          id="grain-canvas"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 9999,
            opacity: 0.035,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
      const c=document.getElementById('grain-canvas');
      const ctx=c.getContext('2d');
      function resize(){c.width=window.innerWidth;c.height=window.innerHeight;}
      function grain(){
        const img=ctx.createImageData(c.width,c.height);
        const d=img.data;
        for(let i=0;i<d.length;i+=4){
          const v=Math.random()*255|0;
          d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;
        }
        ctx.putImageData(img,0,0);
      }
      resize();
      window.addEventListener('resize',resize);
      setInterval(grain,50);
    `,
          }}
        />
      </body>
    </html>
  );
}
