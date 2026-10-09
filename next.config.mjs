/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async redirects() {
    // Histórico moved from a news list to its own page
    return [{ source: "/categoria/historico/:path*", destination: "/historia", permanent: true }];
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
