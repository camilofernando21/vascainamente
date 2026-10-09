import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // the Instagram card route is for manual download only
    rules: { userAgent: "*", allow: "/", disallow: "/*/card" },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
