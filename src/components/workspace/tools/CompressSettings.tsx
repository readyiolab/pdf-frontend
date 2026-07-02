import React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Minimize, Image, FileText } from "lucide-react";

interface CompressSettingsProps {
  value: string;
  onChange: (quality: string) => void;
  disabled?: boolean;
}

const qualities = [
  {
    value: "low",
    label: "Maximum",
    desc: "Smallest file size, lower quality",
    ratio: "~70% smaller",
    icon: Minimize,
    color: "text-emerald-500",
  },
  {
    value: "medium",
    label: "Balanced",
    desc: "Good quality with reduced size",
    ratio: "~40% smaller",
    icon: FileText,
    color: "text-blue-500",
  },
  {
    value: "high",
    label: "Minimal",
    desc: "Highest quality, less compression",
    ratio: "~15% smaller",
    icon: Image,
    color: "text-amber-500",
  },
];

export const CompressSettings: React.FC<CompressSettingsProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-3">
      <Label className="text-xs font-semibold text-muted-foreground">Compression Level</Label>
      <div className="grid gap-2">
        {qualities.map((q) => {
          const Icon = q.icon;
          const isSelected = value === q.value;
          return (
            <button
              key={q.value}
              type="button"
              onClick={() => onChange(q.value)}
              disabled={disabled}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-card hover:bg-muted"
              )}
            >
              <div className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0",
                isSelected ? "bg-primary/10" : "bg-muted"
              )}>
                <Icon className={cn("h-4 w-4", isSelected ? "text-primary" : q.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-xs font-bold",
                    isSelected ? "text-primary" : "text-foreground"
                  )}>
                    {q.label} Compression
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground">{q.ratio}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{q.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
