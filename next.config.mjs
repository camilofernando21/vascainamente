/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    // native PNG encoder for the generated images: loaded from node_modules, not bundled
    serverComponentsExternalPackages: ["@resvg/resvg-js"],
    // generated images and on-demand pages read these from disk at request time
    outputFileTracingIncludes: {
      "/**": ["./content/**", "./assets/**"],
    },
  },
};

export default nextConfig;
