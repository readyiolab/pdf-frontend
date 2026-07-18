import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
// The worker is INLINED into the bundle (base64) and instantiated as a real
// Worker, rather than emitted as a separate `pdf.worker.mjs` file.
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker&inline";

/**
 * Central PDF.js setup.
 *
 * ── Why the worker is inlined, not a separate file ──────────────────────────
 * The previous setup pointed `workerSrc` at a Vite-emitted `pdf.worker-*.mjs`
 * file. That works in dev, but many static hosts (nginx without an `.mjs` MIME
 * mapping, and several managed platforms) serve `.mjs` as
 * `application/octet-stream`. Browsers enforce strict MIME checking for module
 * scripts and REFUSE to load it — PDF.js then silently falls back to its
 * "fake worker", parsing PDFs on the main thread. That is exactly the
 * "Setting up fake worker" warning and the ~13s freeze: rendering that belongs
 * on a background thread blocks the UI instead.
 *
 * Inlining the worker (Vite's `?worker&inline`) turns it into a blob created at
 * runtime, so there is NO separate file for a host to mis-serve and no MIME
 * dependency at all. `workerPort` hands PDF.js the ready Worker instance.
 */
pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

export { pdfjsLib };
export type { PDFDocumentProxy, PDFPageProxy, RenderTask };

/**
 * Kept for the existing call sites that awaited the CDN loader. The bundled
 * worker needs no async setup, so this resolves immediately — it exists so the
 * old hooks didn't all have to change shape at once.
 *
 * @deprecated Import `pdfjsLib` directly; this is a no-op.
 */
export function loadPdfJs(): Promise<void> {
  return Promise.resolve();
}

/**
 * Loads a PDF from bytes or a URL.
 *
 * Note the ArrayBuffer is handed to PDF.js which TRANSFERS it to the worker —
 * the caller's buffer is detached and unusable afterwards. Pass a copy if you
 * still need the original bytes (the designer does, for pdf-lib).
 */
export function loadPdfDocument(
  source: ArrayBuffer | Uint8Array | string
): Promise<PDFDocumentProxy> {
  const params =
    typeof source === "string" ? { url: source } : { data: source };
  return pdfjsLib.getDocument({
    ...params,
    // Served from our own origin by the `pdfjs-assets` plugin in vite.config.ts
    // — see the note there for why these can't be `new URL(...)` imports.
    // cMaps decode CJK/Arabic text; standard_fonts covers PDFs that reference
    // the standard 14 fonts without embedding them. Missing either produces
    // blank glyphs and only a console warning.
    cMapUrl: `${import.meta.env.BASE_URL}pdfjs/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${import.meta.env.BASE_URL}pdfjs/standard_fonts/`,
  }).promise;
}

/**
 * Combines a page's intrinsic /Rotate with any rotation the user applied.
 *
 * PDF.js's `getViewport({ rotation })` REPLACES the page's own rotation rather
 * than adding to it. Passing a bare user rotation therefore discards /Rotate
 * entirely, and a scanned page saved with /Rotate 90 renders sideways — in our
 * viewer only, while every other PDF reader shows it upright. Worse for this
 * app: fields would then be placed against a sideways page.
 *
 * Everything that measures or renders a page must go through this.
 */
export function effectiveRotation(page: PDFPageProxy, userRotation = 0): number {
  return (((page.rotate ?? 0) + userRotation) % 360 + 360) % 360;
}

/**
 * Renders a page to a canvas at `scale`, accounting for the display's pixel
 * ratio so pages aren't blurry on HiDPI screens.
 *
 * The canvas is sized in device pixels but constrained in CSS pixels, and the
 * context is scaled by the ratio — the usual trick, but easy to get wrong, so
 * it lives here rather than at each call site.
 *
 * `userRotation` is added to the page's own /Rotate, not substituted for it.
 *
 * ── Returns the RenderTask, NOT a promise ──────────────────────────────────
 * This deliberately is not an `async` function. PDF.js refuses to run two
 * render() calls against the same canvas, so a caller re-rendering on zoom or
 * scroll MUST cancel the one in flight — and only the RenderTask can do that.
 * Wrapping this in an async function hands back a plain Promise, whose
 * non-existent `.cancel()` fails silently and produces
 * "Cannot use the same canvas during multiple render() operations" on the next
 * re-render. Callers await `task.promise` and cancel via `task.cancel()`.
 */
export function renderPageToCanvas(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  scale: number,
  userRotation = 0
): RenderTask {
  const viewport = page.getViewport({ scale, rotation: effectiveRotation(page, userRotation) });
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not acquire a 2D canvas context");

  // Cap the ratio: a 3x-DPR phone rendering a 200% zoom of an A3 page would
  // otherwise allocate a canvas large enough to be refused by the browser.
  const ratio = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.floor(viewport.width * ratio);
  canvas.height = Math.floor(viewport.height * ratio);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  return page.render({
    canvasContext: context,
    viewport,
    transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
  } as Parameters<PDFPageProxy["render"]>[0]);
}

/**
 * CSS-pixel size of a page at scale 1, as actually DISPLAYED — i.e. with the
 * page's own /Rotate applied. Field fractions are relative to this box, so the
 * backend's stamping transform must use the same definition.
 */
export function getPageSize(page: PDFPageProxy, userRotation = 0) {
  const viewport = page.getViewport({ scale: 1, rotation: effectiveRotation(page, userRotation) });
  return { width: viewport.width, height: viewport.height };
}
