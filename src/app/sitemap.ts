import type { MetadataRoute } from "next";
import { RESOURCE_GUIDES } from "@/lib/resource-guides/data";

const SITE = "https://www.flscapitaladvisors.com";

/**
 * Every public page, so search engines find the guides without having to
 * crawl for them. Signed-in and token-gated routes are deliberately absent
 * (see robots.ts), as is /how-it-works while it is noindex (QUESTIONS.md §4);
 * /about redirects to the home page section.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (
    path: string,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: number,
  ) => ({ url: `${SITE}${path}`, lastModified: now, changeFrequency, priority });

  return [
    page("/", "weekly", 1),
    page("/financing-options", "monthly", 0.8),
    page("/contact", "monthly", 0.6),
    ...RESOURCE_GUIDES.map((guide) => page(`/resources/${guide.slug}`, "monthly", 0.7)),
    page("/privacy", "yearly", 0.2),
    page("/terms", "yearly", 0.2),
    page("/disclosures", "yearly", 0.2),
  ];
}
