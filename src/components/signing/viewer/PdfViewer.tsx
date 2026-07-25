import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FileWarning } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { usePdfDocument, type PageSize } from "./usePdfDocument";
import { usePdfSearch } from "./usePdfSearch";
import { PdfPage } from "./PdfPage";
import { ThumbnailSidebar } from "./ThumbnailSidebar";
import { ViewerToolbar } from "./ViewerToolbar";

export type FitMode = "width" | "page" | "custom";

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
const MIN_ZOOM = ZOOM_STEPS[0];
const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1];
const PAGE_GAP = 16;
/**
 * How many pages either side of the viewport stay rendered. One page of slack
 * means a normal scroll lands on an already-painted page instead of a shimmer,
 * while keeping at most ~5 canvases alive on a 500-page document.
 */
const OVERSCAN = 1;

export interface PdfViewerHandle {
  scrollToPage: (page: number) => void;
  getScale: () => number;
}

interface PdfViewerProps {
  /** Bytes or a URL. Bytes are transferred to the worker — pass a copy if reused. */
  source: ArrayBuffer | string | null;
  /** Per-page overlay (field boxes). Receives the page's rendered CSS size. */
  renderPageOverlay?: (pageNumber: number, size: PageSize, scale: number) => React.ReactNode;
  pagesWithFields?: Set<number>;
  onPageCountChange?: (count: number) => void;
  onScaleChange?: (scale: number) => void;
  /** Fires as the user scrolls — the page currently occupying the viewport. */
  onPageChange?: (page: number) => void;
  className?: string;
  toolbarExtra?: React.ReactNode;
}

export const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerProps>(function PdfViewer(
  {
    source,
    renderPageOverlay,
    pagesWithFields,
    onPageCountChange,
    onScaleChange,
    onPageChange,
    className,
    toolbarExtra,
  },
  ref
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { pdf, pageCount, pageSizes, isLoading, error, reportPageSize } = usePdfDocument(source);
  const search = usePdfSearch(pdf, pageCount);

  const [scale, setScale] = useState(1);
  const [fitMode, setFitMode] = useState<FitMode>("width");
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showThumbnails, setShowThumbnails] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024
  );
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ start: 1, end: 3 });

  useEffect(() => {
    if (pageCount) onPageCountChange?.(pageCount);
  }, [pageCount, onPageCountChange]);

  useEffect(() => {
    onScaleChange?.(scale);
  }, [scale, onScaleChange]);

  useEffect(() => {
    onPageChange?.(currentPage);
  }, [currentPage, onPageChange]);

  // Track the scroll container's size so fit modes can recompute on resize
  // (window resize, sidebar toggle, properties panel opening).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
      setContainerHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const basePage = pageSizes[0];

  // Fit modes are derived, not stored: the scale recomputes whenever the
  // container or rotation changes, so "fit width" stays fitted as the layout
  // moves instead of going stale the moment a panel opens.
  useEffect(() => {
    if (!basePage || !containerWidth || fitMode === "custom") return;

    const swap = rotation % 180 !== 0;
    const pw = swap ? basePage.height : basePage.width;
    const ph = swap ? basePage.width : basePage.height;
    // 48px of breathing room so pages don't collide with the scrollbar.
    const available = containerWidth - 48;

    const next =
      fitMode === "width"
        ? available / pw
        : Math.min(available / pw, (containerHeight - 48) / ph);

    setScale(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next)));
  }, [fitMode, containerWidth, containerHeight, basePage, rotation]);

  /** Cumulative page offsets — the layout model the virtualizer scrolls against. */
  const pageOffsets = useMemo(() => {
    const swap = rotation % 180 !== 0;
    const offsets: { top: number; height: number }[] = [];
    let y = 0;
    for (const size of pageSizes) {
      const height = (swap ? size.width : size.height) * scale;
      offsets.push({ top: y, height });
      y += height + PAGE_GAP;
    }
    return offsets;
  }, [pageSizes, scale, rotation]);

  const totalHeight = pageOffsets.length
    ? pageOffsets[pageOffsets.length - 1].top + pageOffsets[pageOffsets.length - 1].height
    : 0;

  /**
   * Recomputes which pages are on screen, and which page "owns" the viewport.
   *
   * Binary-search-free: a linear pass is fine at 500 pages and stays readable.
   * The current page is whichever covers the viewport's vertical midpoint,
   * which matches what a reader would call "the page I'm on" better than the
   * topmost visible one.
   */
  const updateVisible = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !pageOffsets.length) return;

    const top = el.scrollTop;
    const bottom = top + el.clientHeight;
    const mid = top + el.clientHeight / 2;

    let start = pageOffsets.length;
    let end = 1;
    let active = 1;

    for (let i = 0; i < pageOffsets.length; i++) {
      const { top: pTop, height } = pageOffsets[i];
      const pBottom = pTop + height;
      if (pBottom >= top && pTop <= bottom) {
        start = Math.min(start, i + 1);
        end = Math.max(end, i + 1);
      }
      if (mid >= pTop && mid <= pBottom) active = i + 1;
    }

    if (start > end) return; // scrolled past the end mid-relayout

    setVisibleRange({
      start: Math.max(1, start - OVERSCAN),
      end: Math.min(pageOffsets.length, end + OVERSCAN),
    });
    setCurrentPage(active);
  }, [pageOffsets]);

  useEffect(() => {
    updateVisible();
  }, [updateVisible]);

  const scrollToPage = useCallback(
    (page: number) => {
      const el = scrollRef.current;
      const offset = pageOffsets[page - 1];
      if (!el || !offset) return;
      el.scrollTo({ top: Math.max(0, offset.top - PAGE_GAP), behavior: "smooth" });
      setCurrentPage(page);
    },
    [pageOffsets]
  );

  useImperativeHandle(ref, () => ({ scrollToPage, getScale: () => scale }), [scrollToPage, scale]);

  // Jump to a search hit's page as the user steps through matches.
  useEffect(() => {
    if (search.currentHitPage) scrollToPage(search.currentHitPage);
    // scrollToPage is intentionally omitted: it changes identity on every zoom,
    // which would re-trigger the jump and yank the user back mid-scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.currentHitPage, search.currentHit]);

  const zoomBy = useCallback((direction: 1 | -1) => {
    setFitMode("custom"); // an explicit zoom overrides a fit mode
    setScale((current) => {
      const next =
        direction > 0
          ? ZOOM_STEPS.find((s) => s > current + 0.001) ?? MAX_ZOOM
          : [...ZOOM_STEPS].reverse().find((s) => s < current - 0.001) ?? MIN_ZOOM;
      return next;
    });
  }, []);

  // Keyboard shortcuts. Skipped while the user is typing so "w" in the search
  // box doesn't fire fit-width.
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        zoomBy(1);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        zoomBy(-1);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        setFitMode("custom");
        setScale(1);
      } else if (e.ctrlKey || e.metaKey) {
        return; // leave every other browser shortcut alone
      } else if (e.key === "w") {
        setFitMode("width");
      } else if (e.key === "p") {
        setFitMode("page");
      } else if (e.key === "r") {
        setRotation((r) => (r + 90) % 360);
      } else if (e.key === "t") {
        setShowThumbnails((v) => !v);
      } else if (e.key === "Home") {
        e.preventDefault();
        scrollToPage(1);
      } else if (e.key === "End") {
        e.preventDefault();
        scrollToPage(pageCount);
      } else if (e.key === "PageDown" || e.key === "ArrowRight") {
        e.preventDefault();
        scrollToPage(Math.min(currentPage + 1, pageCount));
      } else if (e.key === "PageUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        scrollToPage(Math.max(currentPage - 1, 1));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomBy, scrollToPage, currentPage, pageCount]);

  // Ctrl+wheel zoom, matching every other document tool. Non-passive because
  // preventDefault is required to stop the browser zooming the whole page.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 1 : -1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  if (error) {
    return (
      <div className={cn("flex h-full flex-col items-center justify-center gap-3 p-8 text-center", className)}>
        <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
          <FileWarning className="size-7 text-destructive" />
        </div>
        <div>
          <p className="font-semibold">Couldn't open this document</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col overflow-hidden bg-muted/40", className)}>
      <ViewerToolbar
        currentPage={currentPage}
        pageCount={pageCount}
        scale={scale}
        fitMode={fitMode}
        showThumbnails={showThumbnails}
        onPageChange={scrollToPage}
        onZoomIn={() => zoomBy(1)}
        onZoomOut={() => zoomBy(-1)}
        onFitChange={setFitMode}
        onRotate={() => setRotation((r) => (r + 90) % 360)}
        onToggleThumbnails={() => setShowThumbnails((v) => !v)}
        onSearch={search.setTerm}
        searchTerm={search.term}
        searchHitCount={search.hitCount}
        currentHit={search.currentHit}
        onNextHit={search.nextHit}
        onPrevHit={search.prevHit}
      />
      {toolbarExtra}

      <div className="flex min-h-0 flex-1">
        {showThumbnails && (
          <ThumbnailSidebar
            pdf={pdf}
            pageCount={pageCount}
            currentPage={currentPage}
            onPageSelect={scrollToPage}
            pagesWithFields={pagesWithFields}
          />
        )}

        <div
          ref={scrollRef}
          onScroll={updateVisible}
          className="relative flex-1 overflow-auto scroll-smooth"
          tabIndex={0}
          role="region"
          aria-label="Document pages"
        >
          {isLoading && (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Loading document…
            </div>
          )}

          {pdf && (
            // Absolute positioning against a fixed-height spacer: pages that
            // aren't rendered still occupy their exact slot, so the scrollbar
            // never jumps as pages mount and unmount.
            <div className="relative mx-auto" style={{ height: totalHeight, paddingTop: PAGE_GAP }}>
              {pageOffsets.map((offset, i) => {
                const pageNumber = i + 1;
                const inRange = pageNumber >= visibleRange.start && pageNumber <= visibleRange.end;
                return (
                  <div
                    key={pageNumber}
                    className="absolute left-0 right-0"
                    style={{ top: offset.top + PAGE_GAP, height: offset.height }}
                  >
                    <PdfPage
                      pdf={pdf}
                      pageNumber={pageNumber}
                      scale={scale}
                      rotation={rotation}
                      pageSize={pageSizes[i]}
                      isVisible={inRange}
                      onSizeReported={reportPageSize}
                      searchTerm={search.term}
                      overlay={renderPageOverlay?.(pageNumber, pageSizes[i], scale)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
