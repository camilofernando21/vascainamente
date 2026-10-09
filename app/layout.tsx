import type { Metadata } from "next";
import { Instrument_Serif, DM_Mono } from "next/font/google";
import "./globals.css";
import Loader, { LOADER_HEAD_SCRIPT } from "@/components/effects/Loader";
import GrainCanvas from "@/components/effects/GrainCanvas";
import CustomCursor from "@/components/effects/CustomCursor";

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
    default: "Vascainamente · Notícias do Vasco da Gama",
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
    <html lang="pt-BR" suppressHydrationWarning className={`${instrumentSerif.variable} ${dmMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOADER_HEAD_SCRIPT }} />
      </head>
      <body className="antialiased">
        <Loader />
        {children}
        <GrainCanvas />
        <CustomCursor />
      </body>
    </html>
  );
}
