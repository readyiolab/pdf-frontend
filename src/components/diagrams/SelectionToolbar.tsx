import { useState } from "react";
import {
  Copy,
  Link2,
  Lock,
  MoreHorizontal,
  Sparkles,
  Trash2,
  Boxes,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  visible: boolean;
  x: number;
  y: number;
  onConnect?: () => void;
  onDuplicate?: () => void;
  onStyle?: () => void;
  onAiAction?: (action: string, text?: string) => void;
  onDelete?: () => void;
  onLock?: () => void;
  onGroup?: () => void;
  className?: string;
};

const AI_QUICK = [
  { id: "improve-labels", label: "Improve labels" },
  { id: "simplify", label: "Simplify" },
  { id: "add-detail", label: "Add detail" },
  { id: "restyle", label: "Restyle" },
];

export function SelectionToolbar({
  visible,
  x,
  y,
  onConnect,
  onDuplicate,
  onStyle,
  onAiAction,
  onDelete,
  onLock,
  onGroup,
  className,
}: Props) {
  const [aiOpen, setAiOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [aiText, setAiText] = useState("");

  if (!visible) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(
          "pointer-events-auto absolute z-40 flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-lg border border-[#cfd8e3] bg-white px-1 py-0.5 shadow-md",
          className
        )}
        style={{ left: x, top: y - 8 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Tb label="Connect" onClick={onConnect}>
          <Link2 className="size-3.5" />
          <span className="text-[11px]">Connect</span>
        </Tb>

        <div className="relative">
          <Tb
            label="AI Edit"
            active={aiOpen}
            onClick={() => {
              setAiOpen((o) => !o);
              setMoreOpen(false);
            }}
          >
            <Sparkles className="size-3.5 text-amber-500" />
            <span className="text-[11px]">AI Edit</span>
          </Tb>
          {aiOpen ? (
            <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-[#cfd8e3] bg-white p-2 shadow-lg">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                Quick actions
              </p>
              <div className="mb-2 flex flex-wrap gap-1">
                {AI_QUICK.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="rounded-full border border-[#e2e8f0] px-2 py-0.5 text-[11px] text-[#334155] hover:bg-[#eef2f7]"
                    onClick={() => {
                      onAiAction?.(a.id);
                      setAiOpen(false);
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                <Input
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  placeholder="Describe an edit…"
                  className="h-7 rounded-md text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && aiText.trim()) {
                      onAiAction?.("custom", aiText.trim());
                      setAiText("");
                      setAiOpen(false);
                    }
                  }}
                />
                <Button
                  type="button"
                  size="xs"
                  className="rounded-md"
                  disabled={!aiText.trim()}
                  onClick={() => {
                    onAiAction?.("custom", aiText.trim());
                    setAiText("");
                    setAiOpen(false);
                  }}
                >
                  Go
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <Tb label="Style" onClick={onStyle}>
          <Palette className="size-3.5" />
          <span className="text-[11px]">Style</span>
        </Tb>

        <Tb label="Duplicate" onClick={onDuplicate}>
          <Copy className="size-3.5" />
          <span className="text-[11px]">Duplicate</span>
        </Tb>

        <div className="relative">
          <Tb
            label="More"
            active={moreOpen}
            onClick={() => {
              setMoreOpen((o) => !o);
              setAiOpen(false);
            }}
          >
            <MoreHorizontal className="size-3.5" />
            <span className="text-[11px]">More</span>
          </Tb>
          {moreOpen ? (
            <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-[#cfd8e3] bg-white p-1 shadow-lg">
              <MoreItem
                icon={<Boxes className="size-3.5" />}
                label="Group"
                onClick={() => {
                  onGroup?.();
                  setMoreOpen(false);
                }}
              />
              <MoreItem
                icon={<Lock className="size-3.5" />}
                label="Lock"
                onClick={() => {
                  onLock?.();
                  setMoreOpen(false);
                }}
              />
              <MoreItem
                icon={<Trash2 className="size-3.5 text-destructive" />}
                label="Delete"
                onClick={() => {
                  onDelete?.();
                  setMoreOpen(false);
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </TooltipProvider>
  );
}

function Tb({
  label,
  onClick,
  children,
  active,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={onClick}
          className={cn(
            "h-7 gap-1 rounded-md px-2 text-[#334155] hover:scale-[1.02]",
            active && "bg-[#eef2f7] ring-1 ring-[#93c5fd]"
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function MoreItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-[#334155] hover:bg-[#eef2f7]"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
