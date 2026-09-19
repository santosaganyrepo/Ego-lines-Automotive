import Link from "next/link"
import { ClockIcon, MailIcon, MapPinIcon, PhoneIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Container } from "@/components/layout/container"
import { BrandMark } from "@/components/layout/brand-mark"
import { toTelHref } from "@/lib/utils/tel"
import { footerLinkGroups, isNavLinkAvailable } from "@/lib/constants/nav-links"
import { LEGAL_DOCUMENTS } from "@/lib/legal/legal-documents"
import { getPublicSiteSettings } from "@/lib/queries/settings.queries"
import { buildGeneralWhatsAppMessage, buildWhatsAppUrl } from "@/lib/utils/whatsapp"
import { SocialIcon } from "@/components/shared/social-icon"

/**
 * The footer, from Settings → Business information.
 *
 * Every contact line is optional: an empty value in Settings renders no row
 * rather than a placeholder, and an unconfigured network has no icon. The
 * phone number is a tap-to-call link only while "Call us" buttons are on.
 */
export async function SiteFooter() {
  const settings = await getPublicSiteSettings()
  const { contact, company } = settings

  // The registered company, when the dealership has entered it: a customer
  // about to send a deposit checks exactly this line.
  const registration = [
    company.legalName && company.legalName !== settings.businessName ? `Trading as ${settings.businessName}` : null,
    company.registrationNumber ? `Company registration no. ${company.registrationNumber}` : null,
    company.taxNumber ? `TIN ${company.taxNumber}` : null,
  ].filter((line) => line !== null)

  // Null when no number is configured or WhatsApp buttons are off, and the
  // block below then renders nothing rather than a broken wa.me link.
  const whatsappUrl = buildWhatsAppUrl({
    phoneNumber: contact.whatsappNumber,
    message: buildGeneralWhatsAppMessage(settings.businessName),
  })

  const contactItems = [
    contact.address ? { key: "address", icon: MapPinIcon, content: contact.address } : null,
    settings.hours
      ? {
          key: "hours",
          icon: ClockIcon,
          content: (
            <span className="flex flex-col gap-0.5">
              {settings.hours.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </span>
          ),
        }
      : null,
    contact.phone
      ? {
          key: "phone",
          icon: PhoneIcon,
          content: contact.callUsEnabled ? (
            <a href={toTelHref(contact.phone)} className="tabular inline-flex items-center transition-colors hover:text-gold-ink pointer-coarse:min-h-11">
              {contact.phone}
            </a>
          ) : (
            <span className="tabular">{contact.phone}</span>
          ),
        }
      : null,
    contact.email
      ? {
          key: "email",
          icon: MailIcon,
          content: (
            <a href={`mailto:${contact.email}`} className="inline-flex items-center break-all transition-colors hover:text-gold-ink pointer-coarse:min-h-11">
              {contact.email}
            </a>
          ),
        }
      : null,
  ].filter((item) => item !== null)

  return (
    <footer data-slot="site-footer" data-tone="dark" className="bg-foreground text-background">
      {/* Hairline gold rule across the full width — the single strongest
          brand cue in the footer, and cheaper visually than a gold block. */}
      <div aria-hidden="true" className="h-px w-full bg-gradient-to-r from-transparent via-gold/45 to-transparent" />

      <Container size="wide" className="py-16 md:py-20">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Brand + contact */}
          <div className="lg:col-span-5">
            <Link
              href="/"
              aria-label={`${settings.businessName} — home`}
              className="inline-block transition-opacity duration-fast hover:opacity-80"
            >
              <BrandMark size="lg" tone="dark" layout="lockup" />
            </Link>

            <p className="mt-6 max-w-sm text-body text-background/65">{settings.businessDescription}</p>

            {contactItems.length > 0 ? (
              <ul className="mt-8 space-y-3.5 text-small text-background/80">
                {contactItems.map(({ key, icon: Icon, content }) => (
                  <li key={key} className="flex items-start gap-3">
                    <Icon className="mt-0.5 size-4 shrink-0 text-gold-ink" aria-hidden="true" />
                    <span>{content}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* Link groups */}
          {footerLinkGroups.map((group) => (
            <div key={group.title} className="lg:col-span-2">
              <h2 className="eyebrow text-gold-ink">{group.title}</h2>
              <ul className="mt-6 space-y-3 pointer-coarse:space-y-0">
                {group.links.map((link) => (
                  <li key={link.href}>
                    {isNavLinkAvailable(link) ? (
                      <Link
                        href={link.href}
                        className="inline-flex items-center text-small text-background/70 transition-colors duration-fast hover:text-background pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <span className="flex items-center gap-2 text-small text-background/35">
                        {link.label}
                        <span className="rounded-4xl border border-white/15 px-2 py-px text-xs font-semibold tracking-[0.08em] uppercase">
                          Soon
                        </span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Direct contact */}
          <div className="lg:col-span-3">
            <h2 className="eyebrow text-gold-ink">Talk to us</h2>
            <p className="mt-6 text-small text-background/65">
              Questions about a vehicle, a quote, or an order already on its way? We reply fast.
            </p>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "mt-6 inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-3",
                  "text-small font-medium text-background",
                  "transition-colors duration-fast",
                  "hover:border-gold/60 hover:bg-white/5 hover:text-gold-ink"
                )}
              >
                <span aria-hidden="true" className="size-2 rounded-full bg-[#25D366]" />
                Message on WhatsApp
              </a>
            )}

            {settings.social.length > 0 ? (
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {settings.social.map(({ network, label, url }) => (
                  <a
                    key={network}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex size-11 items-center justify-center rounded-full border border-white/15 text-background/70 transition-colors duration-fast hover:border-gold/60 hover:text-gold-ink"
                  >
                    <SocialIcon network={network} />
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Legal documents: on every page, where customers look for them. */}
        <nav aria-label="Legal" className="mt-14 border-t border-white/10 pt-8">
          <ul className="flex flex-wrap gap-x-6 gap-y-1">
            {LEGAL_DOCUMENTS.map((document) => (
              <li key={document.kind}>
                <Link
                  href={document.path}
                  className="inline-flex items-center text-small text-background/70 transition-colors duration-fast hover:text-background pointer-coarse:min-h-11"
                >
                  {document.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1 text-small text-background/50">
            <p>
              © {new Date().getFullYear()} {company.legalName || settings.businessName}. All rights reserved.
            </p>
            {registration.length > 0 ? <p>{registration.join(" · ")}</p> : null}
          </div>
          <p className="text-small text-background/50">
            Vehicles sourced from Japan, South Korea &amp; China · Delivered across South Sudan
          </p>
        </div>
      </Container>
    </footer>
  )
}
