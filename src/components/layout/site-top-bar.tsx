import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react"

import { Container } from "@/components/layout/container"
import { SocialIcon } from "@/components/shared/social-icon"
import type { PublicSiteSettings } from "@/lib/queries/settings.queries"
import { toTelHref } from "@/lib/utils/tel"

/** How many social profiles the bar shows; the footer lists every one. */
const MAX_SOCIAL_LINKS = 4

/** True when Settings holds anything the bar would show. */
export function hasTopBarContent(settings: PublicSiteSettings): boolean {
  const { phone, email, address } = settings.contact
  return Boolean(phone || email || address || settings.social.length > 0)
}

/**
 * The contact strip above the navigation: how to reach the dealership on the
 * left, where to follow it on the right. Every value comes from Settings →
 * Business information, so it changes when the business does.
 *
 * Phones get the part that matters on a phone — a number to tap — and the
 * social links; the email and address join from wider screens up, where
 * there is room to read them at a glance rather than in a crushed line.
 */
export function SiteTopBar({ settings }: { settings: PublicSiteSettings }) {
  const { phone, email, address } = settings.contact
  const social = settings.social.slice(0, MAX_SOCIAL_LINKS)

  return (
    <div className="border-b border-white/10 bg-night/60 text-small text-white/75">
      <Container size="wide" className="flex h-11 items-center justify-between gap-6">
        <ul aria-label="Contact details" className="flex min-w-0 items-center gap-6">
          {phone ? (
            <li className="flex min-w-0 items-center gap-2">
              <PhoneIcon aria-hidden="true" className="size-4 shrink-0 text-gold" />
              <span className="hidden text-white/55 sm:inline">Call</span>
              <a
                href={toTelHref(phone)}
                className="tabular inline-flex min-h-11 items-center truncate rounded-sm font-medium text-white/90 transition-colors duration-fast hover:text-gold focus-visible:text-gold"
              >
                {phone}
              </a>
            </li>
          ) : null}

          {email ? (
            <li className="hidden min-w-0 items-center gap-2 md:flex">
              <MailIcon aria-hidden="true" className="size-4 shrink-0 text-gold" />
              <span className="text-white/55">E-mail</span>
              <a
                href={`mailto:${email}`}
                className="inline-flex min-h-11 items-center truncate rounded-sm font-medium text-white/90 transition-colors duration-fast hover:text-gold focus-visible:text-gold"
              >
                {email}
              </a>
            </li>
          ) : null}

          {address ? (
            <li className="hidden min-w-0 items-center gap-2 lg:flex">
              <MapPinIcon aria-hidden="true" className="size-4 shrink-0 text-gold" />
              <span className="text-white/55">Location</span>
              <span className="truncate font-medium text-white/90">{address}</span>
            </li>
          ) : null}
        </ul>

        {social.length > 0 ? (
          <ul aria-label="Follow us" className="-mr-3 flex shrink-0 items-center">
            {social.map(({ network, label, url }) => (
              <li key={network}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label} (opens in a new tab)`}
                  className="grid size-11 place-items-center rounded-md text-white/70 transition-colors duration-fast hover:bg-white/10 hover:text-gold"
                >
                  <SocialIcon network={network} />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </Container>
    </div>
  )
}
