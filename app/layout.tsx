import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    <html lang="pt-BR" className={inter.variable}>
      <body className="antialiased">
        <div className="relative min-h-screen">
          <div className="fixed inset-0 bg-black/75 z-0" />
          <div className="relative z-10">{children}</div>
        </div>
      </body>
    </html>
  );
}
