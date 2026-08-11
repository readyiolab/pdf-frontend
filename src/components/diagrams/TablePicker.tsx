import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  withTitle?: boolean;
  withContainer?: boolean;
  onWithTitleChange?: (v: boolean) => void;
  onWithContainerChange?: (v: boolean) => void;
  onPick: (rows: number, cols: number) => void;
  maxRows?: number;
  maxCols?: number;
  className?: string;
};

export function TablePicker({
  withTitle: withTitleProp,
  withContainer: withContainerProp,
  onWithTitleChange,
  onWithContainerChange,
  onPick,
  maxRows = 10,
  maxCols = 8,
  className,
}: Props) {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const [withTitleLocal, setWithTitleLocal] = useState(false);
  const [withContainerLocal, setWithContainerLocal] = useState(false);

  const withTitle = withTitleProp ?? withTitleLocal;
  const withContainer = withContainerProp ?? withContainerLocal;

  const label = useMemo(() => {
    if (!hover) return "Select size";
    return `${hover.r}×${hover.c}`;
  }, [hover]);

  const setTitle = (v: boolean) => {
    onWithTitleChange?.(v);
    if (withTitleProp === undefined) setWithTitleLocal(v);
  };

  const setContainer = (v: boolean) => {
    onWithContainerChange?.(v);
    if (withContainerProp === undefined) setWithContainerLocal(v);
  };

  return (
    <div
      className={cn(
        "w-[220px] rounded-lg border border-[#cfd8e3] bg-white p-3 shadow-lg",
        className
      )}
      onMouseLeave={() => setHover(null)}
    >
      <div className="mb-2 flex items-center gap-3 text-xs text-[#334155]">
        <label className="inline-flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            className="size-3.5 rounded border-[#cbd5e1]"
            checked={withTitle}
            onChange={(e) => setTitle(e.target.checked)}
          />
          Title
        </label>
        <label className="inline-flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            className="size-3.5 rounded border-[#cbd5e1]"
            checked={withContainer}
            onChange={(e) => setContainer(e.target.checked)}
          />
          Container
        </label>
      </div>

      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${maxCols}, 14px)` }}
      >
        {Array.from({ length: maxRows * maxCols }, (_, i) => {
          const r = Math.floor(i / maxCols) + 1;
          const c = (i % maxCols) + 1;
          const active = hover ? r <= hover.r && c <= hover.c : false;
          return (
            <button
              key={`${r}-${c}`}
              type="button"
              aria-label={`${r} by ${c} table`}
              className={cn(
                "size-3.5 rounded-[2px] border border-[#cbd5e1] transition-colors",
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
