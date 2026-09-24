import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { isNonProductionDeployment } from "@/lib/seo/deployment";
import { getPublicSiteSettings } from "@/lib/queries/settings.queries";

/**
 * robots.txt.
 *
 * Search engines and AI assistants are welcome on the public site. What is
 * kept out of crawling is what has no business in an index: the private
 * quotation links customers are sent, the API, the email-link endpoint, and
 * the app icons. None of this is access control — every one of those routes
 * authorises on its own — it just keeps crawlers from wasting effort there.
 *
 * The dashboard's path is deliberately not listed: naming it here would
 * publish it to every scanner. Its pages carry `noindex`, and require
 * sign-in regardless.
 *
 * The app icons under /app-icon/ are deliberately NOT disallowed: the site's
 * favicon is served from there, and Google only shows a favicon beside a
 * search result if its crawler is allowed to fetch the file.
 *
 * The named search and AI crawlers get the same rules as everyone else; they
 * are listed so the permission is explicit (brief: the site should be
 * readable by AI assistants — see also /llms.txt). A crawler obeys only the
 * most specific group that names it, so each group carries the full list.
 *
 * Settings → SEO & social can switch indexing off, which disallows everything.
 * So does any deployment that is not production (a Vercel preview): those
 * serve the same pages on another address, and indexing them would compete
 * with the real site.
 */
const DISALLOW = ["/api/", "/auth/", "/quotation/", "/monitoring"];

const SEARCH_CRAWLERS = [
  "Googlebot",
  "Googlebot-Image",
  "Bingbot",
  "DuckDuckBot",
  "Slurp",
  "YandexBot",
  "Applebot",
];

const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Meta-ExternalAgent",
  "Amazonbot",
  "DuckAssistBot",
  "MistralAI-User",
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { seo } = await getPublicSiteSettings();

  if (!seo.indexingEnabled || isNonProductionDeployment()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: SEARCH_CRAWLERS, allow: "/", disallow: DISALLOW },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: DISALLOW },
    ],
    // Advertised only while the sitemap is published.
    ...(seo.sitemapEnabled ? { sitemap: `${siteConfig.url}/sitemap.xml` } : {}),
  };
}
