import type { Metadata, Viewport } from "next";
import { Instrument_Serif, DM_Mono } from "next/font/google";
import "./globals.css";
import Loader, { LOADER_HEAD_SCRIPT } from "@/components/effects/Loader";
import GrainCanvas from "@/components/effects/GrainCanvas";
import CustomCursor from "@/components/effects/CustomCursor";
import ConsentManager from "@/components/consent/ConsentManager";
import { OG_DEFAULTS, SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Vascainamente · Notícias do Vasco da Gama",
    template: "%s · Vascainamente",
  },
  description: SITE_DESCRIPTION,
  openGraph: { ...OG_DEFAULTS, type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0D0D0D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${instrumentSerif.variable} ${dmMono.variable}`}>
      <body className="antialiased">
        {/* first thing in <body>: runs before the loader is painted so returning visitors never see it.
            Loader.tsx repeats the check for pages rendered only on the client (the dynamic 404). */}
        <script dangerouslySetInnerHTML={{ __html: LOADER_HEAD_SCRIPT }} />
        <Loader />
        {children}
        <GrainCanvas />
        <CustomCursor />
        <ConsentManager />
      </body>
    </html>
  );
}
