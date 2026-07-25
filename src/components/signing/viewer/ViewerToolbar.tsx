import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  PanelLeft,
  RotateCw,
  Scaling,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { FitMode } from "./PdfViewer";

interface ViewerToolbarProps {
  currentPage: number;
  pageCount: number;
  scale: number;
  fitMode: FitMode;
  showThumbnails: boolean;
  onPageChange: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitChange: (mode: FitMode) => void;
  onRotate: () => void;
  onToggleThumbnails: () => void;
  onSearch: (term: string) => void;
  searchTerm: string;
  searchHitCount: number;
  currentHit: number;
  onNextHit: () => void;
  onPrevHit: () => void;
  className?: string;
}

/** Keyboard shortcuts surfaced in tooltips so they're discoverable, not folklore. */
function Shortcut({ keys }: { keys: string }) {
  return (
    <kbd className="ml-2 rounded border border-white/20 px-1 py-px font-mono text-[10px] opacity-80">
      {keys}
    </kbd>
  );
}

export function ViewerToolbar({
  currentPage,
  pageCount,
  scale,
  fitMode,
  showThumbnails,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onFitChange,
  onRotate,
  onToggleThumbnails,
  onSearch,
  searchTerm,
  searchHitCount,
  currentHit,
  onNextHit,
  onPrevHit,
  className,
}: ViewerToolbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  // Local so typing in the box doesn't fight the parent's committed page number
  // while a page render is in flight.
  const [pageInput, setPageInput] = useState(String(currentPage));

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const commitPage = () => {
    const parsed = Number(pageInput);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= pageCount) {
      onPageChange(parsed);
    } else {
      setPageInput(String(currentPage)); // reject silently, restore truth
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 border-b border-border bg-card/80 px-2 py-1.5 backdrop-blur-sm",
        className
      )}
      role="toolbar"
      aria-label="Document viewer controls"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleThumbnails}
            aria-pressed={showThumbnails}
            aria-label="Toggle page thumbnails"
          >
            <PanelLeft className={cn("transition-colors", showThumbnails && "text-primary")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Page thumbnails <Shortcut keys="T" />
        </TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <div className="flex items-center gap-1">
        <Input
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          onBlur={commitPage}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitPage();
              e.currentTarget.blur();
            }
          }}
          className="h-8 w-12 text-center text-xs tabular-nums"
          aria-label={`Page number, of ${pageCount}`}
        />
        <span className="text-xs text-muted-foreground tabular-nums">/ {pageCount || "–"}</span>
      </div>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={onZoomOut} aria-label="Zoom out">
            <ZoomOut />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Zoom out <Shortcut keys="Ctrl −" />
        </TooltipContent>
      </Tooltip>

      <span className="min-w-[3.25rem] text-center text-xs font-medium tabular-nums text-muted-foreground">
        {Math.round(scale * 100)}%
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={onZoomIn} aria-label="Zoom in">
            <ZoomIn />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Zoom in <Shortcut keys="Ctrl +" />
        </TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />

      <div className="hidden items-center gap-1 sm:flex">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onFitChange("width")}
            aria-pressed={fitMode === "width"}
            aria-label="Fit to width"
          >
            <Scaling className={cn(fitMode === "width" && "text-primary")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Fit width <Shortcut keys="W" />
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onFitChange("page")}
            aria-pressed={fitMode === "page"}
            aria-label="Fit whole page"
          >
            <Maximize2 className={cn(fitMode === "page" && "text-primary")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Fit page <Shortcut keys="P" />
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={onRotate} aria-label="Rotate 90 degrees clockwise">
            <RotateCw />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Rotate <Shortcut keys="R" />
        </TooltipContent>
      </Tooltip>
      </div>

      <div className="ml-auto flex items-center gap-1">
        {searchOpen ? (
          <div className="flex animate-fade-in items-center gap-1">
            <Input
              autoFocus
              value={searchTerm}
              onChange={(e) => onSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.shiftKey ? onPrevHit : onNextHit)();
                if (e.key === "Escape") {
                  onSearch("");
                  setSearchOpen(false);
                }
              }}
              placeholder="Search document…"
              className="h-8 w-44 text-xs"
              aria-label="Search in document"
            />
            <span className="min-w-[3.5rem] text-center text-xs tabular-nums text-muted-foreground">
              {searchTerm ? (searchHitCount ? `${currentHit + 1}/${searchHitCount}` : "0/0") : ""}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onPrevHit}
              disabled={!searchHitCount}
              aria-label="Previous match"
            >
              <ChevronUp />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onNextHit}
              disabled={!searchHitCount}
              aria-label="Next match"
            >
              <ChevronDown />
            </Button>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSearchOpen(true)}
                aria-label="Search in document"
              >
                <Search />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Search <Shortcut keys="Ctrl F" />
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
