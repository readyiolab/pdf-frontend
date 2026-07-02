import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SplitRange {
  from: string;
  to: string;
}

interface SplitSettingsProps {
  onOptionsChange: (options: Record<string, any>) => void;
  disabled?: boolean;
  pageCount?: number;
}

export const SplitSettings: React.FC<SplitSettingsProps> = ({
  onOptionsChange,
  disabled = false,
  pageCount,
}) => {
  const [mode, setMode] = useState<"custom" | "fixed" | "smart">("custom");
  const [ranges, setRanges] = useState<SplitRange[]>([{ from: "1", to: "2" }]);
  const [fixedInterval, setFixedInterval] = useState("1");
  const [mergeRanges, setMergeRanges] = useState(false);

  const updateOptions = (
    currentMode: string,
    currentRanges: SplitRange[],
    currentFixed: string,
    currentMerge: boolean
  ) => {
    if (currentMode === "custom") {
      const rangeStrings = currentRanges
        .filter((r) => r.from && r.to)
        .map((r) => `${r.from}-${r.to}`);
      onOptionsChange({ ranges: rangeStrings, mergeRanges: currentMerge });
    } else if (currentMode === "fixed") {
      onOptionsChange({ splitEvery: parseInt(currentFixed, 10) || 1 });
    } else {
      onOptionsChange({ mode: "smart" });
    }
  };

  const handleModeChange = (newMode: "custom" | "fixed" | "smart") => {
    setMode(newMode);
    updateOptions(newMode, ranges, fixedInterval, mergeRanges);
  };

  const addRange = () => {
    const lastRange = ranges[ranges.length - 1];
    const nextFrom = lastRange ? (parseInt(lastRange.to, 10) + 1).toString() : "1";
    const nextTo = pageCount
      ? Math.min(parseInt(nextFrom, 10) + 1, pageCount).toString()
      : (parseInt(nextFrom, 10) + 1).toString();
    const newRanges = [...ranges, { from: nextFrom, to: nextTo }];
    setRanges(newRanges);
    updateOptions(mode, newRanges, fixedInterval, mergeRanges);
  };

  const removeRange = (index: number) => {
    if (ranges.length <= 1) return;
    const newRanges = ranges.filter((_, i) => i !== index);
    setRanges(newRanges);
    updateOptions(mode, newRanges, fixedInterval, mergeRanges);
  };

  const updateRange = (index: number, field: "from" | "to", value: string) => {
    const newRanges = ranges.map((r, i) =>
      i === index ? { ...r, [field]: value } : r
    );
    setRanges(newRanges);
    updateOptions(mode, newRanges, fixedInterval, mergeRanges);
  };

  const modes = [
    { key: "custom" as const, label: "Custom Range", desc: "Select specific page ranges" },
    { key: "fixed" as const, label: "Fixed Split", desc: "Split every N pages" },
    { key: "smart" as const, label: "Smart", desc: "Auto-detect sections" },
  ];

  return (
    <div className="space-y-5">
      {/* Mode selector */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground">Split Mode</Label>
        <div className="grid grid-cols-3 gap-2">
          {modes.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => handleModeChange(m.key)}
              disabled={disabled}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all cursor-pointer",
                mode === m.key
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-card hover:bg-muted"
              )}
            >
              <span className={cn(
                "text-xs font-bold",
                mode === m.key ? "text-primary" : "text-foreground"
              )}>
                {m.label}
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight">
                {m.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom range builder */}
      {mode === "custom" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground">
              Page Ranges
              {pageCount ? ` (${pageCount} pages total)` : ""}
            </Label>
          </div>

          <div className="space-y-2">
            {ranges.map((range, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl border bg-card p-2.5 animate-fade-in"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="number"
                    min="1"
                    max={pageCount || undefined}
                    value={range.from}
                    onChange={(e) => updateRange(i, "from", e.target.value)}
                    disabled={disabled}
                    placeholder="From"
                    className="h-8 text-xs text-center"
                  />
                  <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <Input
                    type="number"
                    min="1"
                    max={pageCount || undefined}
                    value={range.to}
                    onChange={(e) => updateRange(i, "to", e.target.value)}
                    disabled={disabled}
                    placeholder="To"
                    className="h-8 text-xs text-center"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRange(i)}
                  disabled={disabled || ranges.length <= 1}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 flex-shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRange}
            disabled={disabled}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary/30 bg-primary/5 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Range
          </button>

          {/* Merge toggle */}
          <label className="flex items-center gap-2.5 rounded-xl border bg-card p-3 cursor-pointer hover:bg-muted transition-colors">
            <input
              type="checkbox"
              checked={mergeRanges}
              onChange={(e) => {
                setMergeRanges(e.target.checked);
                updateOptions(mode, ranges, fixedInterval, e.target.checked);
              }}
              disabled={disabled}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <span className="text-xs font-semibold text-foreground">Merge all ranges into one PDF</span>
              <span className="text-[10px] text-muted-foreground block">Combine all selected ranges into a single output file</span>
            </div>
          </label>
        </div>
      )}

      {/* Fixed split */}
      {mode === "fixed" && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">
            Split every N pages
          </Label>
          <Input
            type="number"
            min="1"
            value={fixedInterval}
            onChange={(e) => {
              setFixedInterval(e.target.value);
              updateOptions(mode, ranges, e.target.value, mergeRanges);
            }}
            disabled={disabled}
            placeholder="e.g. 1"
            className="h-9 text-sm"
          />
          <p className="text-[10px] text-muted-foreground">
            Each output PDF will contain {fixedInterval || "1"} page{parseInt(fixedInterval) !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Smart split info */}
      {mode === "smart" && (
        <div className="rounded-xl border bg-muted/50 p-4 text-center">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Smart split will automatically detect logical sections based on bookmarks and content structure.
          </p>
        </div>
      )}
    </div>
  );
};
