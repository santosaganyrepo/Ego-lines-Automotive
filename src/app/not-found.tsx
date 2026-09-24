import { CartProvider } from "@/components/cart/cart-provider";
import { NotFoundContent } from "@/components/shared/not-found-content";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteTopBar, hasTopBarContent } from "@/components/layout/site-top-bar";
import { getPublicSiteSettings } from "@/lib/queries/settings.queries";
import {
  buildGeneralWhatsAppMessage,
  buildWhatsAppUrl,
} from "@/lib/utils/whatsapp";

export const metadata = {
  title: "Page not found",
  // A 404 must never be indexed, or it competes with real pages in search
  // results for the very queries the site is trying to rank for.
  robots: { index: false, follow: true },
};

/**
 * Global 404.
 *
 * Lives at the app root rather than inside the (public) route group,
 * because an unmatched URL belongs to no group and so would never reach a
 * group-scoped not-found. It therefore composes the header and footer
 * itself to stay inside the same shell as the rest of the site.
 *
 * A public page that calls `notFound()` (a sold car's old link, a mistyped
 * part) is answered by src/app/(public)/not-found.tsx instead, which renders
 * only the message: the public layout around it already has the header and
 * footer, and this page's own would appear a second time inside them.
 *
 * It is written to be a useful redirect rather than a dead end: every route
 * in the main navigation now resolves, so anyone landing here has followed a
 * stale link or mistyped an address, and what they need is a way back into
 * the two things the business sells.
 *
 * ── Why the cart provider is here ─────────────────────────────────────
 * The basket is read by the add-to-cart controls and the spare-parts bar,
 * and this page composes the shell itself rather than inheriting the public
 * layout — so it supplies the provider the same way the layout does, and a
 * shortlist survives a detour through a dead link.
 */
export default async function NotFound() {
  // Same reason as the public layout: SiteHeader is a Client Component and
  // the number lives in BusinessSettings, so the link is built here and
  // passed down. This page composes the shell itself, so it has to supply it
  // itself too.
  const settings = await getPublicSiteSettings();
  const whatsappUrl = buildWhatsAppUrl({
    phoneNumber: settings.contact.whatsappNumber,
    message: buildGeneralWhatsAppMessage(settings.businessName),
  });

  return (
    <CartProvider>
      <div
        className={
          hasTopBarContent(settings)
            ? "flex flex-1 flex-col [--header-offset:7.75rem] md:[--header-offset:9.75rem]"
            : "flex flex-1 flex-col [--header-offset:5rem] md:[--header-offset:7rem]"
        }
      >
        <SiteHeader
          whatsappUrl={whatsappUrl}
          topBar={hasTopBarContent(settings) ? <SiteTopBar settings={settings} /> : null}
        />

        <main className="flex flex-1 items-center pt-(--header-offset)">
          <NotFoundContent settings={settings} />
        </main>

        <SiteFooter />
      </div>
    </CartProvider>
  );
}
