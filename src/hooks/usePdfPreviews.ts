import { useState, useEffect } from "react";
import { loadPdfDocument } from "@/lib/pdf";

// PDF.js now ships with the bundle (see lib/pdf.ts) rather than being fetched
// from a CDN at runtime. Re-exported here so existing importers keep working.
export { loadPdfJs } from "@/lib/pdf";

interface PdfPreviewsResult {
  /** One entry per page, in order. null = still rendering that page. */
  previews: (string | null)[];
  isLoading: boolean;
  pageCount: number;
}

export function usePdfPreviews(file: File | null, maxPages: number = 8): PdfPreviewsResult {
  const [previews, setPreviews] = useState<(string | null)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      setPreviews([]);
      setPageCount(0);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setPreviews([]);

    const generatePreviews = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await loadPdfDocument(arrayBuffer);

        if (cancelled) return;

        setPageCount(pdf.numPages);
        const numPages = Math.min(pdf.numPages, maxPages);

        // Reserve a slot per page up front and reveal the grid immediately —
        // pages fill in as they finish rendering instead of the user staring
        // at a spinner until the slowest page is done.
        setPreviews(new Array(numPages).fill(null));
        setIsLoading(false);

        // Page 1 is shown large (hero preview) so it renders sharper; the
        // rest are small filmstrip thumbnails and render faster at a lower scale.
        const renderPage = async (pageNum: number) => {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: pageNum === 1 ? 1.4 : 0.9 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) return;
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport }).promise;
          if (cancelled) return;
          const url = canvas.toDataURL("image/jpeg", 0.75);
          setPreviews((prev) => {
            const next = [...prev];
            next[pageNum - 1] = url;
            return next;
          });
        };

        // All pages render concurrently rather than one-at-a-time.
        await Promise.all(Array.from({ length: numPages }, (_, i) => renderPage(i + 1)));
        pdf.destroy();
      } catch (err) {
        console.error("PDF preview generation error:", err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    generatePreviews();

    return () => {
      cancelled = true;
    };
  }, [file, maxPages]);

  return { previews, isLoading, pageCount };
}
