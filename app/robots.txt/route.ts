import { absoluteUrl } from "@/lib/site";

// Plain route instead of app/robots.ts: the metadata format can't point to llms.txt.
export function GET() {
  const body = [
    "User-Agent: *",
    "Allow: /",
    // the Instagram card route is for manual download only
    "Disallow: /*/card",
    "",
    `Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    "",
    `# Resumo do site para modelos de linguagem: ${absoluteUrl("/llms.txt")}`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
