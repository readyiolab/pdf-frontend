import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RotateSettingsProps {
  angle: string;
  pages: string;
  onAngleChange: (angle: string) => void;
  onPagesChange: (pages: string) => void;
  disabled?: boolean;
}

const angles = [
  { value: "90", label: "90°", desc: "Clockwise" },
  { value: "180", label: "180°", desc: "Upside down" },
  { value: "270", label: "270°", desc: "Counter-clockwise" },
];

export const RotateSettings: React.FC<RotateSettingsProps> = ({
  angle,
  pages,
  onAngleChange,
  onPagesChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground">Rotation Angle</Label>
        <div className="grid grid-cols-3 gap-2">
          {angles.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => onAngleChange(a.value)}
              disabled={disabled}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all cursor-pointer",
                angle === a.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-card hover:bg-muted"
              )}
            >
              <RotateCw
                className={cn(
                  "h-5 w-5 transition-transform duration-500",
                  angle === a.value ? "text-primary" : "text-muted-foreground"
                )}
                style={{ transform: `rotate(${parseInt(a.value)}deg)` }}
              />
              <span className={cn(
                "text-xs font-bold",
                angle === a.value ? "text-primary" : "text-foreground"
              )}>
                {a.label}
              </span>
              <span className="text-[10px] text-muted-foreground">{a.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground">
          Target Pages
        </Label>
        <Input
          type="text"
          value={pages}
          onChange={(e) => onPagesChange(e.target.value)}
          placeholder="All pages (or e.g. 1, 3, 5)"
          disabled={disabled}
          className="h-9 text-sm"
        />
        <p className="text-[10px] text-muted-foreground">
          Leave empty to rotate all pages, or enter specific page numbers separated by commas
        </p>
      </div>
    </div>
  );
};
