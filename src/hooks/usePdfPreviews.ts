import { useState, useEffect } from "react";

interface PdfPreviewsResult {
  previews: string[];
  isLoading: boolean;
  pageCount: number;
}

// Ensure PDF.js is loaded once
let pdfJsLoadPromise: Promise<void> | null = null;

function loadPdfJs(): Promise<void> {
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
  const [previews, setPreviews] = useState<string[]>([]);
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
        const urls: string[] = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          if (cancelled) break;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 0.8 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport }).promise;
            urls.push(canvas.toDataURL("image/jpeg", 0.7));
          }
        }

        if (!cancelled) {
          setPreviews(urls);
        }
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
