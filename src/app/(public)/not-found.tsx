import { NotFoundContent } from "@/components/shared/not-found-content"
import { getPublicSiteSettings } from "@/lib/queries/settings.queries"

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
}

/**
 * "Not found" for a public page that calls `notFound()` — a listing that no
 * longer exists, a tracking or quotation page for something gone. Only the
 * message: it renders inside the public layout, which already supplies the
 * header, footer and <main>. (The root not-found.tsx, for unmatched URLs,
 * composes that shell itself.)
 */
export default async function PublicNotFound() {
  const settings = await getPublicSiteSettings()
  return (
    <div className="flex min-h-[60vh] items-center">
      <NotFoundContent settings={settings} />
    </div>
  )
}
