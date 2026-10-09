// Idols: texts and video lists (shared by the home section and the Histórico page).

// Official channels only (Vasco TV, ge tv), all checked for embedding.
export const VASCO_TV = "Vasco TV";
export const GE = "ge.globo";

export type IdolVideo = { id: string; credit: string };

// Texts supplied by the editor; do not change numbers or wording without checking with them.
export const IDOLS: {
  name: string;
  videos: IdolVideo[];
  rank: string;
  value: string;
  unit: string;
  lines: string[];
}[] = [
  {
    name: "Roberto Dinamite",
    videos: [
      { id: "RpTCqNPEq-g", credit: VASCO_TV },
      { id: "Cf0EsQDY4iI", credit: GE },
      { id: "-COqah3cdZw", credit: GE },
      { id: "nIbv85ePNvU", credit: GE },
    ],
    rank: "Maior artilheiro da história",
    value: "708",
    unit: "gols",
    lines: ["1.110 jogos, de 1971 a 1992", "190 gols no Brasileirão, recorde"],
  },
  {
    name: "Romário",
    videos: [
      { id: "FGur3GPvfmw", credit: GE }, // milésimo gol, Vasco 3 x 1 Sport, 2007
      { id: "rSy14ftksyg", credit: GE },
      { id: "IWiM_ktgua0", credit: GE },
    ],
    rank: "2º maior artilheiro do clube",
    value: "313",
    unit: "gols",
    lines: ["402 jogos em quatro passagens", "De 1985 a 2007"],
  },
  {
    name: "Edmundo",
    videos: [
      { id: "8iMIV_v6T-Y", credit: VASCO_TV },
      { id: "BveUu9158t8", credit: GE },
      { id: "FiOzHG5k0yA", credit: VASCO_TV },
    ],
    rank: "Brasileirão de 1997",
    value: "29",
    unit: "gols",
    lines: ["Recorde da competição na época", "6 gols em um jogo contra o União São João"],
  },
  {
    name: "Juninho",
    videos: [
      { id: "ETlflPNEvJ4", credit: VASCO_TV },
      { id: "Xf1q1YYWNTU", credit: VASCO_TV },
      { id: "rSy14ftksyg", credit: GE },
    ],
    rank: "O gol do Monumental",
    value: "1998",
    unit: "Libertadores",
    lines: ["Falta contra o River Plate", "Semifinal, 22 de julho de 1998"],
  },
];
