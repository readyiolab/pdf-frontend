import {
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Trash2,
  BringToFront,
  SendToBack,
  Plus,
  Wand2,
  LayoutTemplate,
  ImagePlus,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export { ToolRail, type ToolRailProps } from "./ToolRail";

type Props = {
  zoom: number;
  onZoomChange: (z: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onToFront: () => void;
  onToBack: () => void;
  onAutoLayout: () => void;
  onAiGenerate: () => void;
  onAiImage: () => void;
  onInsertShape?: () => void;
  className?: string;
};

function Sep() {
  return <div className="mx-1 h-5 w-px bg-[#cfd8e3]" />;
}

export function DiagramToolbar({
  zoom,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  onUndo,
  onRedo,
  onDelete,
  onToFront,
  onToBack,
  onAutoLayout,
  onAiGenerate,
  onAiImage,
  onInsertShape,
  className,
}: Props) {
  const pct = Math.round(zoom * 100);
  return (
    <div
      className={cn(
        "flex h-10 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-[#cfd8e3] bg-[#f8fafc] px-2",
        className
      )}
    >
      <ToolBtn title="Fit" onClick={() => onZoomChange(1)}>
        <Maximize2 className="size-3.5" />
      </ToolBtn>
      <Select value={String(pct)} onValueChange={(v) => onZoomChange(Number(v) / 100)}>
        <SelectTrigger className="h-7 w-[78px] rounded-md text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[50, 75, 100, 125, 150, 200].map((z) => (
            <SelectItem key={z} value={String(z)}>
              {z}%
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ToolBtn title="Zoom out" onClick={onZoomOut}>
        <ZoomOut className="size-3.5" />
      </ToolBtn>
      <ToolBtn title="Zoom in" onClick={onZoomIn}>
        <ZoomIn className="size-3.5" />
      </ToolBtn>
      <Sep />
      <ToolBtn title="Undo" onClick={onUndo}>
        <Undo2 className="size-3.5" />
      </ToolBtn>
      <ToolBtn title="Redo" onClick={onRedo}>
        <Redo2 className="size-3.5" />
      </ToolBtn>
      <Sep />
      <ToolBtn title="Delete" onClick={onDelete}>
        <Trash2 className="size-3.5" />
      </ToolBtn>
      <ToolBtn title="To front" onClick={onToFront}>
        <BringToFront className="size-3.5" />
      </ToolBtn>
      <ToolBtn title="To back" onClick={onToBack}>
        <SendToBack className="size-3.5" />
      </ToolBtn>
      <Sep />
      <ToolBtn title="Insert" onClick={onInsertShape}>
        <Plus className="size-3.5" />
      </ToolBtn>
      <ToolBtn title="Auto layout" onClick={onAutoLayout}>
        <LayoutTemplate className="size-3.5" />
      </ToolBtn>
      <Sep />
      <ToolBtn title="AI generate" onClick={onAiGenerate}>
        <Wand2 className="size-3.5" />
      </ToolBtn>
      <ToolBtn title="Image to diagram" onClick={onAiImage}>
        <ImagePlus className="size-3.5" />
      </ToolBtn>
    </div>
  );
}

function ToolBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      title={title}
      onClick={onClick}
      className="size-7 rounded-md text-[#334155]"
    >
      {children}
    </Button>
  );
}
