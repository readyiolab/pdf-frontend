import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ConvertSettingsProps {
  tool: string;
  dpi?: string;
  direction?: string;
  onDpiChange?: (dpi: string) => void;
  onDirectionChange?: (dir: string) => void;
  disabled?: boolean;
}

export const ConvertSettings: React.FC<ConvertSettingsProps> = ({
  tool,
  dpi = "150",
  onDpiChange,
  disabled = false,
}) => {
  if (tool === "pdfToJpg") {
    return (
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground">
          Image Quality (DPI)
        </Label>
        <Input
          type="number"
          min="72"
          max="600"
          value={dpi}
          onChange={(e) => onDpiChange?.(e.target.value)}
          disabled={disabled}
          className="h-9 text-sm"
        />
        <p className="text-[10px] text-muted-foreground">
          Higher DPI = better quality but larger files. 150 is recommended for general use.
        </p>
      </div>
    );
  }

  if (tool === "jpgToPdf") {
    return (
      <div className="rounded-xl border bg-muted/50 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Images will be automatically arranged and converted to a single PDF document. Drag to reorder if needed.
        </p>
      </div>
    );
  }

  if (tool === "officeConvert") {
    return (
      <div className="rounded-xl border bg-muted/50 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Upload a Word (.docx), Excel (.xlsx), or PowerPoint (.pptx) file to convert it into a PDF.
        </p>
      </div>
    );
  }

  return null;
};
