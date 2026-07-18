import { memo, useEffect, useRef, useState } from "react";
import { renderPageToCanvas, getPageSize, type PDFDocumentProxy, type RenderTask } from "@/lib/pdf";
import { cn } from "@/lib/utils";
import type { PageSize } from "./usePdfDocument";

interface PdfPageProps {
  pdf: PDFDocumentProxy;
  pageNumber: number; // 1-indexed
  scale: number;
  rotation: number;
  /** Assumed size at scale 1; used to reserve layout space before render. */
  pageSize: PageSize;
  /** True when the page is close enough to the viewport to be worth rendering. */
  isVisible: boolean;
  onSizeReported?: (pageIndex: number, size: PageSize) => void;
  /** Field overlay injected by the designer/signing UI. Sized to the page box. */
  overlay?: React.ReactNode;
  /** Substring to highlight, lowercased by the caller. */
  searchTerm?: string;
  className?: string;
}

/**
 * One rendered PDF page.
 *
 * Only renders when `isVisible` — the parent windows this so a 500-page
 * document keeps at most a handful of canvases alive. When scrolled away the
 * canvas is released and the wrapper collapses to a sized placeholder, which is
 * what keeps memory flat regardless of document length.
 */
function PdfPageImpl({
  pdf,
  pageNumber,
  scale,
  rotation,
  pageSize,
  isVisible,
  onSizeReported,
  overlay,
  searchTerm,
  className,
}: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [isRendered, setIsRendered] = useState(false);

  // Rotation is applied by PDF.js itself (not a CSS transform), so a rotated
  // page swaps width/height in the layout box rather than overflowing it.
  const swap = rotation % 180 !== 0;
  const boxWidth = (swap ? pageSize.height : pageSize.width) * scale;
  const boxHeight = (swap ? pageSize.width : pageSize.height) * scale;

  useEffect(() => {
    if (!isVisible) {
      setIsRendered(false);
      return;
    }

    let cancelled = false;
    // PDF.js rejects a second render on the same canvas while one is in flight,
    // so the in-flight task is cancelled explicitly when inputs change. This
    // MUST be the RenderTask itself — a wrapping promise has no cancel() and
    // the failure is silent until the next zoom throws "Cannot use the same
    // canvas during multiple render() operations".
    let renderTask: RenderTask | null = null;

    (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        onSizeReported?.(pageNumber - 1, getPageSize(page));

        const canvas = canvasRef.current;
        if (!canvas) return;

        renderTask = renderPageToCanvas(page, canvas, scale, rotation);
        await renderTask.promise;
        if (cancelled) return;
        setIsRendered(true);

        // Text layer: invisible, selectable spans positioned over the canvas.
        // Needed for text selection and for search highlighting — the canvas
        // alone is just pixels with no notion of words.
        const textLayer = textLayerRef.current;
        if (textLayer) {
          const textContent = await page.getTextContent();
          if (cancelled) return;
          const viewport = page.getViewport({ scale, rotation });
          renderTextLayer(textLayer, textContent, viewport, searchTerm);
        }
      } catch (err) {
        // A cancelled render is expected on scroll/zoom, not an error worth surfacing.
        if (!cancelled && (err as Error)?.name !== "RenderingCancelledException") {
          console.error(`Failed to render page ${pageNumber}`, err);
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        renderTask?.cancel();
      } catch {
        // Task already settled — nothing to cancel.
      }
    };
  }, [pdf, pageNumber, scale, rotation, isVisible, searchTerm, onSizeReported]);

  return (
    <div
      data-page-number={pageNumber}
      className={cn(
        "relative mx-auto bg-white shadow-lg ring-1 ring-black/5 transition-shadow",
        "dark:ring-white/10",
        className
      )}
      style={{ width: boxWidth, height: boxHeight }}
    >
      {isVisible ? (
        <>
          <canvas ref={canvasRef} className="block h-full w-full" aria-label={`Page ${pageNumber}`} />
          <div
            ref={textLayerRef}
            className="pdf-text-layer pointer-events-auto absolute inset-0 overflow-hidden"
            aria-hidden="true"
          />
        </>
      ) : (
        // Placeholder keeps the scrollbar honest while the page is unrendered.
        <div className="flex h-full w-full items-center justify-center bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground">{pageNumber}</span>
        </div>
      )}

      {!isRendered && isVisible && (
        <div className="absolute inset-0 animate-shimmer bg-muted/40" aria-hidden="true" />
      )}

      {overlay && <div className="absolute inset-0">{overlay}</div>}
    </div>
  );
}

/**
 * Positions PDF.js text items over the canvas.
 *
 * Hand-rolled rather than using pdfjs-dist's TextLayerBuilder: that ships as
 * part of the viewer bundle (web/pdf_viewer), which drags in its own CSS and
 * component tree we'd otherwise have to fight. We only need positioned spans
 * for selection and search hits.
 */
function renderTextLayer(
  container: HTMLDivElement,
  textContent: { items: unknown[] },
  viewport: { transform: number[] },
  searchTerm?: string
): void {
  container.replaceChildren();
  const term = searchTerm?.trim().toLowerCase();

  for (const raw of textContent.items) {
    const item = raw as { str: string; transform: number[]; width: number; height: number };
    if (!item.str) continue;

    // Compose the item's transform with the viewport's to get device coords.
    const tx = pdfjsTransform(viewport.transform, item.transform);
    const fontHeight = Math.hypot(tx[2], tx[3]);

    const span = document.createElement("span");
    span.textContent = item.str;
    span.style.position = "absolute";
    span.style.left = `${tx[4]}px`;
    // PDF y-origin is the text baseline and runs bottom-up; CSS top runs
    // down from the top edge — hence subtracting the glyph height.
    span.style.top = `${tx[5] - fontHeight}px`;
    span.style.fontSize = `${fontHeight}px`;
    span.style.fontFamily = "sans-serif";
    span.style.whiteSpace = "pre";
    span.style.transformOrigin = "0% 0%";
    // Transparent text sitting exactly over the painted glyphs: invisible, but
    // still selectable and highlightable.
    span.style.color = "transparent";

    if (term && item.str.toLowerCase().includes(term)) {
      span.style.backgroundColor = "rgba(250, 204, 21, 0.45)";
      span.dataset.searchHit = "true";
    }

    container.appendChild(span);
  }
}

/** 2D matrix multiply, matching PDF.js's Util.transform. */
function pdfjsTransform(m1: number[], m2: number[]): number[] {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

export const PdfPage = memo(PdfPageImpl);
