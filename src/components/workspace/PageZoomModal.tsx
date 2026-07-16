import React, { useEffect } from "react";
import { Dialog } from "radix-ui";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageZoomModalProps {
  /** Rendered page thumbnails; null entries are still loading. */
  pages: (string | null)[];
  /** Index of the page currently open, or null when the modal is closed. */
  activeIndex: number | null;
  onOpenChange: (index: number | null) => void;
}

/**
 * "PageZoom" — full-size lightbox for a single PDF page, opened by clicking
 * any thumbnail. Lets the user actually read a page instead of squinting at
 * a small grid thumbnail, with arrow-key/click navigation between pages.
 */
export const PageZoomModal: React.FC<PageZoomModalProps> = ({ pages, activeIndex, onOpenChange }) => {
  const open = activeIndex !== null;
  const current = activeIndex !== null ? pages[activeIndex] : null;

  const goTo = (index: number) => {
    if (index < 0 || index >= pages.length) return;
    onOpenChange(index);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && activeIndex !== null) goTo(activeIndex + 1);
      if (e.key === "ArrowLeft" && activeIndex !== null) goTo(activeIndex - 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex]);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onOpenChange(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl bg-popover p-3 sm:p-4 shadow-2xl ring-1 ring-foreground/10",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          )}
        >
          <Dialog.Title className="sr-only">
            Page {activeIndex !== null ? activeIndex + 1 : ""} preview
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            Full-size preview of the selected PDF page.
          </Dialog.Description>

          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold text-muted-foreground tracking-wide uppercase">
              Page {activeIndex !== null ? activeIndex + 1 : ""} of {pages.length}
            </span>
            <Dialog.Close
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="relative flex items-center justify-center rounded-xl bg-muted/40 min-h-[50vh] max-h-[75vh] overflow-hidden">
            {current ? (
              <img
                src={current}
                alt={`Page ${(activeIndex ?? 0) + 1}`}
                className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-sm"
              />
            ) : (
              <span className="text-xs text-muted-foreground">Rendering this page…</span>
            )}

            {activeIndex !== null && activeIndex > 0 && (
              <button
                type="button"
                onClick={() => goTo(activeIndex - 1)}
                aria-label="Previous page"
                className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 border shadow-sm hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {activeIndex !== null && activeIndex < pages.length - 1 && (
              <button
                type="button"
                onClick={() => goTo(activeIndex + 1)}
                aria-label="Next page"
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 border shadow-sm hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
