import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PAPER_SIZES,
  type DiagramSettings,
  type PaperKey,
} from "@/lib/diagram/model";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  settings: DiagramSettings;
  onClose: () => void;
  onApply: (patch: Partial<DiagramSettings>) => void;
};

export function PageSetupDialog({ open, settings, onClose, onApply }: Props) {
  const [paper, setPaper] = useState<DiagramSettings["paper"]>(
    settings.paper ?? "a4-portrait"
  );
  const [gridSize, setGridSize] = useState(settings.gridSize ?? 10);
  const [background, setBackground] = useState(settings.background ?? "#ffffff");
  const [pageView, setPageView] = useState(settings.pageView !== false);
  const [customW, setCustomW] = useState(settings.pageWidth ?? 794);
  const [customH, setCustomH] = useState(settings.pageHeight ?? 1123);

  useEffect(() => {
    if (!open) return;
    setPaper(settings.paper ?? "a4-portrait");
    setGridSize(settings.gridSize ?? 10);
    setBackground(settings.background ?? "#ffffff");
    setPageView(settings.pageView !== false);
    setCustomW(settings.pageWidth ?? 794);
    setCustomH(settings.pageHeight ?? 1123);
  }, [open, settings]);

  if (!open) return null;

  const apply = () => {
    const patch: Partial<DiagramSettings> = {
      paper,
      gridSize: Math.max(1, Number(gridSize) || 10),
      background,
      pageView,
    };
    if (paper === "custom") {
      patch.pageWidth = Math.max(100, Number(customW) || 794);
      patch.pageHeight = Math.max(100, Number(customH) || 1123);
    } else if (paper && paper in PAPER_SIZES) {
      const size = PAPER_SIZES[paper as PaperKey];
      patch.pageWidth = size.w;
      patch.pageHeight = size.h;
    }
    onApply(patch);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-labelledby="page-setup-title"
        className="w-full max-w-md rounded-xl border border-[#cfd8e3] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-4 py-3">
          <h2 id="page-setup-title" className="text-sm font-semibold text-[#0f172a]">
            Page Setup
          </h2>
          <button
            type="button"
            className="rounded p-1 hover:bg-[#f1f5f9]"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Paper Size</Label>
            <select
              value={paper ?? "a4-portrait"}
              onChange={(e) => setPaper(e.target.value as DiagramSettings["paper"])}
              className="h-9 w-full rounded-md border border-[#cfd8e3] bg-white px-2 text-sm outline-none focus:border-[#93c5fd]"
            >
              {(Object.keys(PAPER_SIZES) as PaperKey[]).map((key) => (
                <option key={key} value={key}>
                  {PAPER_SIZES[key].label}
                </option>
              ))}
              <option value="custom">Custom</option>
            </select>
          </div>

          {paper === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Width (px)</Label>
                <Input
                  type="number"
                  value={customW}
                  onChange={(e) => setCustomW(Number(e.target.value))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Height (px)</Label>
                <Input
                  type="number"
                  value={customH}
                  onChange={(e) => setCustomH(Number(e.target.value))}
                  className="h-9"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Grid Size</Label>
            <Input
              type="number"
              min={1}
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Background</Label>
            <Input
              type="color"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              className="h-9 w-20 p-1"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-[#334155]">
            <input
              type="checkbox"
              checked={pageView}
              onChange={(e) => setPageView(e.target.checked)}
              className="rounded border-[#cfd8e3]"
            />
            Show page view
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#e2e8f0] px-4 py-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className={cn("bg-[#3b82f6] hover:bg-[#2563eb]")}
            onClick={apply}
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
