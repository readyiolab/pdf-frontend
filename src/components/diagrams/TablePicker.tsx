import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  onPick: (rows: number, cols: number) => void;
  maxRows?: number;
  maxCols?: number;
  className?: string;
};

/** Compact Excel-style table size grid (click to insert). */
export function TablePicker({
  onPick,
  maxRows = 8,
  maxCols = 8,
  className,
}: Props) {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);

  const label = useMemo(() => {
    if (!hover) return "Select size";
    return `${hover.c}×${hover.r}`;
  }, [hover]);

  return (
    <div
      className={cn(
        "w-[200px] rounded-lg border border-[#cfd8e3] bg-white p-3 shadow-lg",
        className
      )}
      onMouseLeave={() => setHover(null)}
    >
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${maxCols}, 16px)` }}
      >
        {Array.from({ length: maxRows * maxCols }, (_, i) => {
          const r = Math.floor(i / maxCols) + 1;
          const c = (i % maxCols) + 1;
          const active = hover ? r <= hover.r && c <= hover.c : false;
          return (
            <button
              key={`${r}-${c}`}
              type="button"
              aria-label={`${c} by ${r} table`}
              className={cn(
                "size-4 rounded-[2px] border border-[#cbd5e1] transition-colors",
                active ? "border-[#3b82f6] bg-[#93c5fd]" : "bg-white hover:bg-[#e2e8f0]"
              )}
              onMouseEnter={() => setHover({ r, c })}
              onClick={() => onPick(r, c)}
            />
          );
        })}
      </div>
      <p className="mt-2 text-center text-xs font-medium text-[#64748b]">{label}</p>
    </div>
  );
}
