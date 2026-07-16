import { useState, useEffect } from "react";

interface PdfPreviewsResult {
  /** One entry per page, in order. null = still rendering that page. */
  previews: (string | null)[];
  isLoading: boolean;
  pageCount: number;
}

// Ensure PDF.js is loaded once
let pdfJsLoadPromise: Promise<void> | null = null;

export function loadPdfJs(): Promise<void> {
  if ((window as any).pdfjsLib) return Promise.resolve();
  if (pdfJsLoadPromise) return pdfJsLoadPromise;

  pdfJsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js"));
    document.body.appendChild(script);
  });

  return pdfJsLoadPromise;
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
        await loadPdfJs();
        const pdfjsLib = (window as any).pdfjsLib;

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

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
