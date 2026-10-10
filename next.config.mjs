import { readFileSync } from "node:fs";

// Repeated news merged into a single article: old links keep working
const mergedNews = JSON.parse(readFileSync(new URL("./content/redirects.json", import.meta.url), "utf8"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // only the hosts that actually appear in content/noticias and the YouTube thumbnails
    // (components/NewsImage.tsx serves any other host unoptimized instead of failing)
    remotePatterns: [
      { protocol: "https", hostname: "**.glbimg.com" },
      { protocol: "https", hostname: "trivela.com.br" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
  async redirects() {
    // Histórico moved from a news list to its own page
    return [
      { source: "/categoria/historico/:path*", destination: "/historia", permanent: true },
      ...Object.entries(mergedNews).flatMap(([from, to]) => [
        { source: `/${from}`, destination: `/${to}`, permanent: true },
        { source: `/${from}/:rest+`, destination: `/${to}/:rest+`, permanent: true },
      ]),
    ];
  },
  experimental: {
    // native image encoders for the generated images: loaded from node_modules, not bundled
    serverComponentsExternalPackages: ["@resvg/resvg-js", "sharp"],
    // generated images and on-demand pages read these from disk at request time
    outputFileTracingIncludes: {
      "/**": ["./content/**", "./assets/**"],
    },
  },
};

export default nextConfig;
