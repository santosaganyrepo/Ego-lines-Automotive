import { siteConfig } from "@/config/site"
import type { LegalPlaceholderValues } from "@/lib/legal/legal-text"
import type { PublicSiteSettings } from "@/lib/queries/settings.queries"

/** The values `{{placeholders}}` in the legal documents are filled with, from Settings. */
export function legalPlaceholderValues(settings: PublicSiteSettings): LegalPlaceholderValues {
  return {
    businessName: settings.businessName,
    legalName: settings.company.legalName,
    website: siteConfig.url,
    email: settings.contact.email,
    phone: settings.contact.phone,
    whatsapp: settings.contact.whatsappNumber,
    address: settings.contact.address,
    initialPercent: settings.paymentSchedule.initial,
    mombasaPercent: settings.paymentSchedule.mombasa,
    finalPercent: settings.paymentSchedule.final,
  }
}
