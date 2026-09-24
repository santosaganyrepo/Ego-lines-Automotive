import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

import { SiteSettingsProvider } from "@/components/shared/site-settings-provider";
import { brandingIconUrl, brandingIconVersion } from "@/lib/branding/icon-version";
import { siteConfig } from "@/config/site";
import { getPublicSiteSettings } from "@/lib/queries/settings.queries";
import { OG_LOCALE, defaultOgImages } from "@/lib/seo/page-metadata";

/**
 * Two families, deliberately.
 *
 * Manrope carries the headings: geometric, subtly condensed, and it holds
 * character at display sizes where a neutral grotesque goes generic. Inter
 * carries body and UI text, where its larger x-height wins on small
 * specification tables read on a phone over mobile data.
 *
 * Both are variable fonts, so each ships one file across every weight the
 * scale uses. `display: "swap"` keeps text readable during the font fetch
 * rather than blocking on it — a real consideration on the slower
 * connections the brief calls out (§19).
 *
 * There is intentionally no third (mono) family: reference numbers get
 * `tabular-nums` from Inter instead, which costs no extra download.
 */
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Global metadata baseline (brief §18), from Settings → Website & branding
 * and SEO & social.
 *
 * `metadataBase` is what lets every child page emit *absolute* canonical
 * and Open Graph URLs while only declaring relative ones.
 *
 * The title `template` means individual pages set only their own title
 * (e.g. "Toyota Harrier 2021") and get the configured site title appended.
 * `default` is used by pages that set no title at all.
 *
 * `robots` follows the indexing switch. A page that sets its own `robots`
 * replaces this one — every page that does so today sets `noindex`, so
 * switching indexing off can never be undone by a child page.
 *
 * The read is cached under the business-settings tag, so this does not opt
 * public pages into dynamic rendering, and a save in Settings is live on the
 * next request.
 */
function siteVerification(): Metadata["verification"] {
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const bing = process.env.BING_SITE_VERIFICATION?.trim();
  if (!google && !bing) return undefined;
  return {
    ...(google ? { google } : {}),
    ...(bing ? { other: { "msvalidate.01": bing } } : {}),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings();
  // Changes whenever the branding does, so a browser holding a cached
  // favicon is asked for a new URL rather than keeping the old picture.
  const iconVersion = brandingIconVersion(settings);
  const ogImages = defaultOgImages(settings);

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: settings.seo.title,
      template: `%s | ${settings.siteTitle}`,
    },
    description: settings.seo.description,
    applicationName: settings.siteTitle,
    // No `alternates.canonical` and no `openGraph.url` here. Metadata merges
    // shallowly, so a value set at the root is inherited by every page that
    // does not set its own — a root canonical of "/" would tell search
    // engines that such a page is a duplicate of the homepage. Each public
    // page declares its own through buildPageMetadata().
    openGraph: {
      type: "website",
      siteName: settings.siteTitle,
      title: settings.seo.title,
      description: settings.seo.description,
      locale: OG_LOCALE,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: settings.seo.title,
      description: settings.seo.description,
      images: ogImages,
    },
    // `max-image-preview:large` lets Google show the listing photographs at
    // full width in results and Discover; without it the default is a
    // thumbnail.
    robots: settings.seo.indexingEnabled
      ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } }
      : { index: false, follow: false },
    // Search Console / Bing Webmaster ownership, by the HTML-tag method. The
    // tokens are not secrets — they are published in every page's <head> —
    // but they belong to the deployment, not the repository.
    verification: siteVerification(),
    /**
     * The favicon, always generated rather than linked straight from storage.
     *
     * Pointing at the uploaded file gave a square image in the tab, and no
     * two uploads were framed alike. `/app-icon/favicon-*.png` draws whatever
     * has been uploaded (or the brand monogram, when nothing has) as a disc
     * on the brand's background, at three sizes, supersampled so it stays
     * sharp at 32px — see src/app/app-icon/[variant]/route.tsx.
     *
     * The Apple touch icon stays square and opaque: iOS applies its own
     * rounded-rectangle mask and puts a black backdrop behind transparency,
     * so a pre-cut disc would appear as a circle floating in a black tile.
     */
    icons: {
      icon: [
        { url: brandingIconUrl("favicon-32.png", iconVersion), sizes: "32x32", type: "image/png" },
        { url: brandingIconUrl("favicon-48.png", iconVersion), sizes: "48x48", type: "image/png" },
        { url: brandingIconUrl("favicon-96.png", iconVersion), sizes: "96x96", type: "image/png" },
      ],
      apple: [
        { url: brandingIconUrl("apple-touch-180.png", iconVersion), sizes: "180x180", type: "image/png" },
      ],
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getPublicSiteSettings();

  return (
    <html
      lang="en"
      // globals.css sets `scroll-behavior: smooth` on <html>. Next.js needs
      // this attribute to know that is intentional, so it can suppress the
      // smooth scroll during route transitions (where it causes a visible
      // glide instead of landing at the top of the new page).
      data-scroll-behavior="smooth"
      // Browser extensions commonly stamp attributes onto <html> before
      // React hydrates — password managers, dark-mode and proxy add-ons all
      // do it. This suppresses the warning for THIS ELEMENT'S OWN attributes
      // only — one level deep, not a tree-wide switch. The dashboard's own
      // dark class is applied to <html> after hydration for the same reason.
      suppressHydrationWarning
      className={`${manrope.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
          One provider for the whole application — public site, dashboard and
          the 404 page alike — so the wordmark and every client component
          reads the same configured name, number and display switches.
        */}
        <SiteSettingsProvider
          value={{
            businessName: settings.businessName,
            whatsappNumber: settings.contact.whatsappNumber,
            defaultCountry: settings.defaultCountry,
            phone: settings.contact.phone,
            callUsEnabled: settings.contact.callUsEnabled,
            logoLightUrl: settings.branding.logoLightUrl,
            logoDarkUrl: settings.branding.logoDarkUrl,
            catalogDisplay: settings.catalogDisplay,
          }}
        >
          {children}
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
