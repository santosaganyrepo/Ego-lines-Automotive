/**
 * True on a Vercel preview or development deployment.
 *
 * Those serve the real pages on a `*.vercel.app` address, and a search
 * engine that indexed them would see a second copy of the site competing
 * with the production domain. Vercel sets `VERCEL_ENV` on every deployment;
 * outside Vercel (local `next start`, CI) it is absent, and nothing changes.
 */
export function isNonProductionDeployment(): boolean {
  const environment = process.env.VERCEL_ENV
  return environment === "preview" || environment === "development"
}
