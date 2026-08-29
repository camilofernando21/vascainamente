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
      <body className="antialiased">{children}</body>
    </html>
  );
}
