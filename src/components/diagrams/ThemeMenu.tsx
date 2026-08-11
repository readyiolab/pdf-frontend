import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DIAGRAM_THEMES, type DiagramThemeId } from "./themes";

type Props = {
  current?: string | null;
  onSelect: (themeId: string) => void;
  className?: string;
};

const FALLBACK = [
  { id: "automatic", label: "Automatic", swatches: ["#dae8fc", "#fff2cc", "#d5e8d4"] },
  { id: "classic", label: "Classic", swatches: ["#ffffff", "#000000", "#6495ed"] },
  { id: "simple", label: "Simple", swatches: ["#f5f5f5", "#90caf9", "#a5d6a7"] },
  { id: "minimal", label: "Minimal", swatches: ["#ffffff", "#111827", "#e5e7eb"] },
  { id: "sketch", label: "Sketch", swatches: ["#fffef0", "#2d2d2d", "#ffcc80"] },
  { id: "atlas", label: "Atlas", swatches: ["#e8f0fe", "#1a73e8", "#34a853"] },
];

export function ThemeMenu({ current = "automatic", onSelect, className }: Props) {
  const themes = DIAGRAM_THEMES?.length ? DIAGRAM_THEMES : FALLBACK;

  return (
    <div
      className={cn(
        "w-[200px] rounded-lg border border-[#cfd8e3] bg-white p-1.5 shadow-lg",
        className
      )}
    >
      {themes.map((theme) => {
        const active = current === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => onSelect(theme.id)}
            className={cn(
              "group flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-[#334155] transition hover:bg-[#eef2f7]",
              active && "bg-[#eef2f7]"
            )}
          >
            <span className="flex size-3.5 items-center justify-center">
              {active ? <Check className="size-3.5 text-[#2563eb]" /> : null}
            </span>
            <span className="flex-1">{theme.label}</span>
            <span className="hidden items-center gap-0.5 group-hover:flex">
              {theme.swatches.slice(0, 5).map((c) => (
                <span
                  key={`${theme.id}-${c}`}
                  className="size-2.5 rounded-[2px] border border-black/10"
                  style={{ backgroundColor: c }}
                />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export type { DiagramThemeId };
