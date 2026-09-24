/**
 * PDF.js ships its worker as a plain ES module with no type declarations —
 * it is meant to be loaded as a script, not imported.
 *
 * `src/components/admin/pdf-preview.tsx` imports it anyway, deliberately, so
 * the bundler resolves it and the engine can run in-process instead of
 * needing a worker URL that every bundler locates differently. Nothing reads
 * anything off the module: it is handed straight to PDF.js, which looks for
 * its own `WorkerMessageHandler` on it.
 */
declare module "pdfjs-dist/legacy/build/pdf.worker.mjs" {
  const workerModule: unknown
  export = workerModule
}
