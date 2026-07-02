import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface WatermarkSettingsProps {
  text: string;
  fontSize: string;
  opacity: string;
  position: string;
  onTextChange: (v: string) => void;
  onFontSizeChange: (v: string) => void;
  onOpacityChange: (v: string) => void;
  onPositionChange: (v: string) => void;
  disabled?: boolean;
}

const positions = [
  { value: "top-left", label: "↖" },
  { value: "top", label: "↑" },
  { value: "top-right", label: "↗" },
  { value: "left", label: "←" },
  { value: "center", label: "⊕" },
  { value: "right", label: "→" },
  { value: "bottom-left", label: "↙" },
  { value: "bottom", label: "↓" },
  { value: "bottom-right", label: "↘" },
];

export const WatermarkSettings: React.FC<WatermarkSettingsProps> = ({
  text,
  fontSize,
  opacity,
  position,
  onTextChange,
  onFontSizeChange,
  onOpacityChange,
  onPositionChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground">Watermark Text</Label>
        <Input
          type="text"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          disabled={disabled}
          placeholder="e.g. CONFIDENTIAL"
          className="h-9 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">Font Size</Label>
          <Input
            type="number"
            min="12"
            max="120"
            value={fontSize}
            onChange={(e) => onFontSizeChange(e.target.value)}
            disabled={disabled}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">Opacity</Label>
          <Input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(e) => onOpacityChange(e.target.value)}
            disabled={disabled}
            className="h-9 w-full accent-primary cursor-pointer"
          />
          <span className="text-[10px] text-muted-foreground font-medium">{Math.round(parseFloat(opacity) * 100)}%</span>
        </div>
      </div>

      {/* Position grid */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground">Position</Label>
        <div className="grid grid-cols-3 gap-1.5 max-w-[160px]">
          {positions.map((pos) => (
            <button
              key={pos.value}
              type="button"
              onClick={() => onPositionChange(pos.value)}
              disabled={disabled}
              className={cn(
                "h-10 w-full flex items-center justify-center rounded-lg border text-sm transition-all cursor-pointer",
                position === pos.value
                  ? "border-primary bg-primary/10 text-primary font-bold"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              {pos.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
