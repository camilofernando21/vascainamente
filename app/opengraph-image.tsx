import { homeImage } from "@/lib/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Vascainamente, notícias do Vasco da Gama";

export default async function Image() {
  return homeImage(size.width, size.height);
}
