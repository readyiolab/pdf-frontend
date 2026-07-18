import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FIELD_GROUPS, FIELD_META } from "@/lib/signing/fieldMeta";
import type { SignFieldType, SignRecipient } from "@/lib/signing/types";

/** dataTransfer key for a palette→page drag. */
export const FIELD_DRAG_TYPE = "application/x-pdfproduct-field";

interface FieldPaletteProps {
  activeRecipient: SignRecipient | undefined;
  readOnly: boolean;
  /** Click-to-place fallback: adds to the centre of the current page. */
  onQuickAdd: (type: SignFieldType) => void;
}

/**
 * The left rail of draggable field types.
 *
 * Uses native HTML5 drag-and-drop rather than dnd-kit (which the app already
 * has). dnd-kit shines for sortable lists with known drop slots; here the drop
 * target is a continuous page surface where the exact pixel matters, and the
 * native dragover event gives us those coordinates directly. Clicking a field
 * also works, for touch and keyboard users who can't drag.
 */
export function FieldPalette({ activeRecipient, readOnly, onQuickAdd }: FieldPaletteProps) {
  return (
    <aside
      className="flex w-52 shrink-0 flex-col overflow-y-auto border-r border-border bg-card"
      aria-label="Field types"
    >
      <div className="border-b border-border px-3 py-2.5">
        <p className="text-xs font-semibold text-foreground">Fields</p>
        <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
          {readOnly
            ? "This document has been sent and can no longer be edited."
            : activeRecipient
              ? "Drag onto the page, or click to place."
              : "Add a recipient first."}
        </p>
      </div>

      {activeRecipient && !readOnly && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: activeRecipient.color }}
            aria-hidden="true"
          />
          <span className="truncate text-xs font-medium">{activeRecipient.name}</span>
        </div>
      )}

      <div className="flex-1 p-2">
        {FIELD_GROUPS.map((group) => {
          const types = (Object.keys(FIELD_META) as SignFieldType[]).filter(
            (t) => FIELD_META[t].group === group.id
          );
          return (
            <div key={group.id} className="mb-3">
              <p className="px-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {types.map((type) => {
                  const meta = FIELD_META[type];
                  const Icon = meta.icon;
                  const disabled = readOnly || !activeRecipient;

                  return (
                    <Tooltip key={type}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          draggable={!disabled}
                          onDragStart={(e) => {
                            e.dataTransfer.setData(FIELD_DRAG_TYPE, type);
                            e.dataTransfer.effectAllowed = "copy";
                          }}
                          onClick={() => !disabled && onQuickAdd(type)}
                          disabled={disabled}
                          className={cn(
                            "group flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-xs transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            disabled
                              ? "cursor-not-allowed opacity-40"
                              : "cursor-grab hover:bg-muted active:cursor-grabbing"
                          )}
                        >
                          <GripVertical
                            className="size-3 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground"
                            aria-hidden="true"
                          />
                          <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span className="truncate font-medium">{meta.label}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-52">
                        {meta.hint}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
