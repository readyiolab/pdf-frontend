import { useEffect, useRef, useState } from "react";
import { loadPdfDocument, getPageSize, type PDFDocumentProxy } from "@/lib/pdf";

export interface PageSize {
  width: number;
  height: number;
}

export interface PdfDocumentState {
  pdf: PDFDocumentProxy | null;
  pageCount: number;
  /**
   * Unrotated size of each page at scale 1, 0-indexed.
   *
   * Seeded from page 1 for EVERY page rather than measured up front: a 500-page
   * document would otherwise need 500 getPage round-trips to the worker before
   * the first pixel appears. Nearly every real document has uniform page sizes,
   * so page 1 is a good guess; the rare mixed-size document self-corrects as
   * each page renders and reports its true size (see reportPageSize).
   */
  pageSizes: PageSize[];
  isLoading: boolean;
  error: string | null;
}

export function usePdfDocument(source: ArrayBuffer | string | null) {
  const [state, setState] = useState<PdfDocumentState>({
    pdf: null,
    pageCount: 0,
    pageSizes: [],
    isLoading: false,
    error: null,
  });

  // Held in a ref so the cleanup below always destroys the document this effect
  // actually created, even if `source` changed twice before the first resolved.
  const pdfRef = useRef<PDFDocumentProxy | null>(null);

  useEffect(() => {
    if (!source) {
      setState({ pdf: null, pageCount: 0, pageSizes: [], isLoading: false, error: null });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, isLoading: true, error: null }));

    (async () => {
      try {
        const pdf = await loadPdfDocument(source);
        if (cancelled) {
          pdf.destroy();
          return;
        }

        const firstPage = await pdf.getPage(1);
        const size = getPageSize(firstPage);
        if (cancelled) {
          pdf.destroy();
          return;
        }

        pdfRef.current = pdf;
        setState({
          pdf,
          pageCount: pdf.numPages,
          pageSizes: Array.from({ length: pdf.numPages }, () => ({ ...size })),
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          pdf: null,
          pageCount: 0,
          pageSizes: [],
          isLoading: false,
          error:
            err instanceof Error
              ? // PDF.js error names are the only reliable way to tell a
                // password-protected file from a corrupt one.
                err.name === "PasswordException"
                ? "This PDF is password protected. Remove the password before sending it for signature."
                : err.name === "InvalidPDFException"
                  ? "This file is not a valid PDF or is corrupted."
                  : err.message
              : "Failed to load the document.",
        });
      }
    })();

    return () => {
      cancelled = true;
      pdfRef.current?.destroy();
      pdfRef.current = null;
    };
  }, [source]);

  /** Corrects a page's assumed size once it has actually been rendered. */
  const reportPageSize = (pageIndex: number, size: PageSize) => {
    setState((s) => {
      const current = s.pageSizes[pageIndex];
      // Sub-pixel differences aren't worth a re-render of the whole page list.
      if (!current || (Math.abs(current.width - size.width) < 0.5 && Math.abs(current.height - size.height) < 0.5)) {
        return s;
      }
      const pageSizes = [...s.pageSizes];
      pageSizes[pageIndex] = size;
      return { ...s, pageSizes };
    });
  };

  return { ...state, reportPageSize };
}
