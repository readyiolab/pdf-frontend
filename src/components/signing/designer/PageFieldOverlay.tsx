import { useState } from "react";
import { cn } from "@/lib/utils";
import type { SignFieldType, SignRecipient } from "@/lib/signing/types";
import { FieldBox } from "./FieldBox";
import { FIELD_DRAG_TYPE } from "./FieldPalette";
import type { DesignerField } from "./useFieldDesigner";

interface PageFieldOverlayProps {
  pageNumber: number;
  fields: DesignerField[];
  recipients: SignRecipient[];
  selectedIds: string[];
  /** Rendered page size in CSS pixels. */
  pageWidth: number;
  pageHeight: number;
  readOnly: boolean;
  activeRecipientId: string | null;
  onSelect: (id: string, additive: boolean) => void;
  onClearSelection: () => void;
  onBeginTransaction: () => void;
  onMove: (dx: number, dy: number, transient: boolean) => void;
  onResize: (id: string, patch: Partial<DesignerField>, transient: boolean) => void;
  onDropField: (type: SignFieldType, page: number, x: number, y: number) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
}

/**
 * The interactive layer sitting exactly over one rendered page.
 *
 * Coordinates: the drop point is converted from client pixels to a 0..1
 * fraction of THIS page's box. That's what makes placement zoom- and
 * DPI-independent — the same drop lands identically whether the user is at 50%
 * or 400%, and matches what pdf-lib will do at finalization.
 */
export function PageFieldOverlay({
  pageNumber,
  fields,
  recipients,
  selectedIds,
  pageWidth,
  pageHeight,
  readOnly,
  activeRecipientId,
  onSelect,
  onClearSelection,
  onBeginTransaction,
  onMove,
  onResize,
  onDropField,
  onContextMenu,
}: PageFieldOverlayProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (readOnly) return;

    const type = e.dataTransfer.getData(FIELD_DRAG_TYPE) as SignFieldType;
    if (!type) return;

    const rect = e.currentTarget.getBoundingClientRect();
    onDropField(type, pageNumber, (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
  };

  return (
    <div
      className={cn(
        "absolute inset-0",
        // Must not intercept text selection on the page when there's nothing to
        // drop — pointer-events stay off the container, on for the boxes.
        isDragOver && "bg-primary/5 ring-2 ring-inset ring-primary/40"
      )}
      onDragOver={(e) => {
        if (readOnly) return;
        // Required: without preventDefault the browser refuses the drop.
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        // Fires when moving onto a CHILD too; ignore those or the highlight flickers.
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
      }}
      onDrop={handleDrop}
      onPointerDown={(e) => {
        // A click on bare page (not a field) clears the selection.
        if (e.target === e.currentTarget) onClearSelection();
      }}
    >
      {fields.map((field) => (
        <FieldBox
          key={field.id}
          field={field}
          recipient={recipients.find((r) => r.id === field.recipientId)}
          isSelected={selectedIds.includes(field.id)}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          readOnly={readOnly}
          onSelect={onSelect}
          onBeginTransaction={onBeginTransaction}
          onMove={onMove}
          onResize={onResize}
          onContextMenu={onContextMenu}
        />
      ))}

      {isDragOver && activeRecipientId && (
        <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
            Drop to place on page {pageNumber}
          </span>
        </div>
      )}
    </div>
  );
}
