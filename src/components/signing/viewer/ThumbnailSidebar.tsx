import { memo, useEffect, useRef, useState } from "react";
import { renderPageToCanvas, type PDFDocumentProxy, type RenderTask } from "@/lib/pdf";
import { cn } from "@/lib/utils";

interface ThumbnailSidebarProps {
  pdf: PDFDocumentProxy | null;
  pageCount: number;
  currentPage: number;
  onPageSelect: (page: number) => void;
  /** Page numbers that have at least one field placed, for the dot indicator. */
  pagesWithFields?: Set<number>;
}

const THUMB_WIDTH = 112;

/**
 * One lazily-rendered thumbnail.
 *
 * Rendered only once it scrolls into the sidebar (IntersectionObserver) — a
 * 500-page document must not rasterize 500 thumbnails on open. Once rendered
 * it stays cached; thumbnails are small and re-rendering on every scroll would
 * be worse than the memory.
 */
const Thumbnail = memo(function Thumbnail({
  pdf,
  pageNumber,
  isActive,
  hasFields,
  onSelect,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  isActive: boolean;
  hasFields: boolean;
  onSelect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLButtonElement>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const renderedRef = useRef(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect(); // once rendered, stop watching
        }
      },
      { root: el.closest("[data-thumbnail-scroll]"), rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldRender || renderedRef.current) return;
    let cancelled = false;
    let task: RenderTask | null = null;

    (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;
        const baseWidth = page.getViewport({ scale: 1 }).width;
        task = renderPageToCanvas(page, canvasRef.current, THUMB_WIDTH / baseWidth);
        await task.promise;
        renderedRef.current = true;
      } catch {
        // A failed or cancelled thumbnail is cosmetic — the page-number
        // placeholder remains.
      }
    })();

    return () => {
      cancelled = true;
      // Unmounting mid-render (fast sidebar scrolling) would otherwise leave the
      // task painting into a detached canvas.
      task?.cancel();
    };
  }, [shouldRender, pdf, pageNumber]);

  // Keep the active thumbnail in view as the user scrolls the main pane.
  useEffect(() => {
    if (isActive) {
      wrapperRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isActive]);

  return (
    <button
      ref={wrapperRef}
      onClick={onSelect}
      aria-label={`Go to page ${pageNumber}`}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex w-full flex-col items-center gap-1 rounded-lg p-1.5 transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        isActive ? "bg-primary/10" : "hover:bg-muted"
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded border-2 bg-white shadow-sm transition-colors",
          isActive ? "border-primary" : "border-transparent group-hover:border-border"
        )}
        style={{ width: THUMB_WIDTH, minHeight: 60 }}
      >
        <canvas ref={canvasRef} className="block" />
        {hasFields && (
          <span
            className="absolute right-1 top-1 size-2 rounded-full bg-primary ring-2 ring-white"
            aria-label="This page has fields"
          />
        )}
      </div>
      <span
        className={cn(
          "text-[11px] font-medium tabular-nums",
          isActive ? "text-primary" : "text-muted-foreground"
        )}
      >
        {pageNumber}
      </span>
    </button>
  );
});

export function ThumbnailSidebar({
  pdf,
  pageCount,
  currentPage,
  onPageSelect,
  pagesWithFields,
}: ThumbnailSidebarProps) {
  if (!pdf) return null;

  return (
    <aside
      data-thumbnail-scroll
      className="w-36 shrink-0 overflow-y-auto border-r border-border bg-muted/30 p-1"
      aria-label="Page thumbnails"
    >
      {Array.from({ length: pageCount }, (_, i) => (
        <Thumbnail
          key={i + 1}
          pdf={pdf}
          pageNumber={i + 1}
          isActive={currentPage === i + 1}
          hasFields={pagesWithFields?.has(i + 1) ?? false}
          onSelect={() => onPageSelect(i + 1)}
        />
      ))}
    </aside>
  );
}
