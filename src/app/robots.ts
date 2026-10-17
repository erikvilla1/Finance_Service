import type { MetadataRoute } from "next";

/**
 * Crawl rules for the launched site.
 *
 * The marketing pages, the guides and the legal pages are open. Everything
 * that needs a session or a token stays out: the admin and the portal, the
 * auth routes, sign-in, create-account and the prequal flow (its result pages
 * are per-applicant and already noindex). Mirrors the per-page `robots`
 * metadata so a crawler that ignores one signal still sees the other.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/auth", "/sign-in", "/create-account", "/start"],
    },
    sitemap: "https://www.flscapitaladvisors.com/sitemap.xml",
  };
}
