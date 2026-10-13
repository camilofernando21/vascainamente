import { FACEBOOK, INSTAGRAM, PUBLISHER, SITE_DESCRIPTION, SITE_NAME, X_PROFILE, absoluteUrl } from "@/lib/site";

// schema.org JSON-LD builders. Rendered with <JsonLd />.

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    "@id": absoluteUrl("/#organization"),
    name: SITE_NAME,
    url: absoluteUrl("/"),
    masthead: absoluteUrl("/quem-somos"),
    publishingPrinciples: absoluteUrl("/como-produzimos"),
    correctionsPolicy: absoluteUrl("/correcoes"),
    logo: { "@type": "ImageObject", url: absoluteUrl("/icons/icon-512.png"), width: 512, height: 512 },
    sameAs: [INSTAGRAM.url, X_PROFILE.url, FACEBOOK.url],
    // the company that runs the site (no CNPJ here: only on the privacy and terms pages)
    parentOrganization: { "@type": "Organization", name: PUBLISHER.name, url: PUBLISHER.url },
    publisher: { "@type": "Organization", name: PUBLISHER.name, url: PUBLISHER.url },
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description: SITE_DESCRIPTION,
    inLanguage: "pt-BR",
    publisher: { "@id": absoluteUrl("/#organization") },
  };
}

/** Breadcrumb from the home: [{ name, path }...], last item is the current page. */
export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Início", path: "/" }, ...items].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
