import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import {
  DEFAULT_CATEGORY_IDS,
  SHAPE_CATEGORIES,
  type ShapeDef,
} from "@/lib/diagram/shapes";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function ShapeThumb({ preview }: { preview: ShapeDef["preview"] }) {
  const common = "stroke-[#4b5563] stroke-[1.5] fill-[#f8fafc]";
  switch (preview) {
    case "rounded":
      return <rect x="4" y="8" width="28" height="20" rx="5" className={common} />;
    case "ellipse":
      return <ellipse cx="18" cy="18" rx="14" ry="10" className={common} />;
    case "diamond":
      return <polygon points="18,4 32,18 18,32 4,18" className={common} />;
    case "hex":
      return <polygon points="10,6 26,6 32,18 26,30 10,30 4,18" className={common} />;
    case "cyl":
      return (
        <>
          <ellipse cx="18" cy="8" rx="12" ry="4" className={common} />
          <path d="M6 8 v16 a12 4 0 0 0 24 0 V8" className={common} fill="none" />
          <ellipse cx="18" cy="24" rx="12" ry="4" className={common} />
        </>
      );
    case "cloud":
      return (
        <path
          d="M10 24c-4 0-6-3-6-6s3-5 6-5c1-4 5-6 9-5 3-3 8-2 9 2 3 0 5 3 4 6-1 3-4 4-6 4H10z"
          className={common}
        />
      );
    case "actor":
      return (
        <>
          <circle cx="18" cy="8" r="4" className={common} />
          <path d="M18 12 v10 M12 16 h12 M18 22 l-5 8 M18 22 l5 8" className="stroke-[#4b5563] stroke-[1.5] fill-none" />
        </>
      );
    case "tri":
      return <polygon points="18,5 32,30 4,30" className={common} />;
    case "arrow":
      return <polygon points="4,12 22,12 22,6 32,18 22,30 22,24 4,24" className={common} />;
    case "line":
      return <line x1="4" y1="18" x2="32" y2="18" className="stroke-[#4b5563] stroke-[2]" />;
    case "doc":
      return <path d="M8 6 h18 v16 c-4 3-8 3-12 0 c-3 2-6 2-6 0 V6z" className={common} />;
    case "note":
      return <path d="M8 6 h14 l6 6 v16 H8 V6z M22 6 v6 h6" className={common} />;
    case "dellipse":
      return (
        <>
          <ellipse cx="18" cy="18" rx="14" ry="10" className={common} />
          <ellipse cx="18" cy="18" rx="10" ry="6" className={common} fill="none" />
        </>
      );
    case "swimlane":
      return (
        <>
          <rect x="4" y="6" width="28" height="24" className={common} />
          <line x1="4" y1="14" x2="32" y2="14" className="stroke-[#4b5563]" />
        </>
      );
    case "parallelogram":
      return <polygon points="10,8 32,8 26,28 4,28" className={common} />;
    default:
      return <rect x="4" y="8" width="28" height="20" className={common} />;
  }
}

type Props = {
  onAddShape: (shape: ShapeDef) => void;
  className?: string;
};

export function ShapePanel({ onAddShape, className }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({ general: true, flowchart: true });
  const [enabled, setEnabled] = useState<Set<string>>(new Set(DEFAULT_CATEGORY_IDS));
  const [moreOpen, setMoreOpen] = useState(false);

  const categories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SHAPE_CATEGORIES.map((cat) => ({
      ...cat,
      shapes: cat.shapes.filter(
        (s) => !q || s.label.toLowerCase().includes(q) || s.shape.toLowerCase().includes(q)
      ),
    })).filter((cat) => {
      if (q) return cat.shapes.length > 0;
      return enabled.has(cat.id);
    });
  }, [query, enabled]);

  const toggleCat = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  return (
    <aside className={cn("flex h-full w-[220px] shrink-0 flex-col border-r border-[#cfd8e3] bg-[#f5f7fa]", className)}>
      <div className="border-b border-[#cfd8e3] p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type / to search"
            className="h-8 rounded-md border-[#cfd8e3] bg-white pl-7 text-xs"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {categories.map((cat) => {
          const isOpen = open[cat.id] ?? Boolean(cat.defaultOpen);
          return (
            <div key={cat.id} className="mb-1">
              <button
                type="button"
                onClick={() => toggleCat(cat.id)}
                className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-[#475569] hover:bg-[#e8eef5]"
              >
                {isOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                {cat.label}
              </button>
              {isOpen && (
                <div className="grid grid-cols-3 gap-1 p-1">
                  {cat.shapes.map((shape) => (
                    <button
                      key={shape.id}
                      type="button"
                      title={shape.label}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/x-diagram-shape", JSON.stringify(shape));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => onAddShape(shape)}
                      className="flex flex-col items-center gap-0.5 rounded border border-transparent p-1 hover:border-[#93c5fd] hover:bg-white"
                    >
                      <svg viewBox="0 0 36 36" className="size-9">
                        <ShapeThumb preview={shape.preview} />
                      </svg>
                      <span className="max-w-full truncate text-[9px] text-[#64748b]">{shape.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-[#cfd8e3] p-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-full rounded-md text-xs"
          onClick={() => setMoreOpen((v) => !v)}
        >
          More Shapes…
        </Button>
        {moreOpen && (
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded border border-[#cfd8e3] bg-white p-2">
            {SHAPE_CATEGORIES.map((cat) => (
              <label key={cat.id} className="flex items-center gap-2 text-xs text-[#334155]">
                <input
                  type="checkbox"
                  checked={enabled.has(cat.id)}
                  onChange={(e) => {
                    setEnabled((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(cat.id);
                      else next.delete(cat.id);
                      return next;
                    });
                  }}
                />
                {cat.label}
              </label>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
