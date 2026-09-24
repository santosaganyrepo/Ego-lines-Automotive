import type React from "react"

import { CartProvider } from "@/components/cart/cart-provider"
import { ConnectionStatus } from "@/components/layout/connection-status"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteTopBar, hasTopBarContent } from "@/components/layout/site-top-bar"
import { SkipLink } from "@/components/layout/skip-link"
import { WhatsAppFloatButton } from "@/components/layout/whatsapp-float-button"
import { getPublicSiteSettings } from "@/lib/queries/settings.queries"
import { buildGeneralWhatsAppMessage, buildWhatsAppUrl } from "@/lib/utils/whatsapp"

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  /**
   * Built here, once, for the header's mobile drawer.
   *
   * SiteHeader is a Client Component, so the link is built on the server and
   * passed down. The number and name come from Settings through the cached
   * public settings read that the root layout, footer and floating button
   * share — one database read per cache fill, not one per component.
   */
  const settings = await getPublicSiteSettings()
  const whatsappUrl = buildWhatsAppUrl({
    phoneNumber: settings.contact.whatsappNumber,
    message: buildGeneralWhatsAppMessage(settings.businessName),
  })
  const showTopBar = hasTopBarContent(settings)

  return (
    /**
     * The spare-parts basket is provided for the whole public site, not just
     * for /spare-parts.
     *
     * It has to outlive a navigation between the catalogue and a part page —
     * a provider mounted inside either segment would be torn down and
     * remounted on every move between them, and the basket would rebuild
     * itself from storage on each one.
     *
     * The site settings (WhatsApp number, name, display switches) are provided
     * by the root layout, above this one.
     */
    <CartProvider>
      {/*
        `--header-offset` is the fixed header's full height at the top of the
        page — the navigation row (h-20 / md:h-28) plus the contact bar (h-11)
        when there is one. Content is padded by it, and the homepage hero
        pulls itself up under the header by the same amount, so the two can
        never disagree.
      */}
      <div
        className={
          showTopBar
            ? "flex flex-1 flex-col [--header-offset:7.75rem] md:[--header-offset:9.75rem]"
            : "flex flex-1 flex-col [--header-offset:5rem] md:[--header-offset:7rem]"
        }
      >
        {/* First element in the tab order, so keyboard users can jump the
            eight-item nav on every page rather than tabbing through it. */}
        <SkipLink />

        <SiteHeader whatsappUrl={whatsappUrl} topBar={showTopBar ? <SiteTopBar settings={settings} /> : null} />

        {/*
          The padding reserves space equal to SiteHeader's height at the top of
          the page (`--header-offset`, above) so content never renders
          underneath the fixed header.

          The homepage hero is the one deliberate exception: it sits beneath
          the header's transparent variant by cancelling this padding with a
          matching negative top margin (`-mt-(--header-offset)`) on its own
          full-bleed section. Every other page renders normally inside this
          padded flow — do not repeat that trick elsewhere, or the header
          will overlap real content.

          `id` is the skip link's target; `tabIndex={-1}` makes the element
          programmatically focusable so the skip actually moves focus rather
          than only moving the scroll position.
        */}
        <main id="main-content" tabIndex={-1} className="flex-1 pt-(--header-offset) outline-none">
          {children}
        </main>

        <SiteFooter />
        <WhatsAppFloatButton />
        <ConnectionStatus />
      </div>
    </CartProvider>
  )
}
