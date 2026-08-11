import type { ReactNode } from "react";
import {
  AlignHorizontalDistributeCenter,
  AlignLeft,
  Circle,
  GitBranch,
  Network,
  Sparkles,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type LayoutKind =
  | "last"
  | "vertical-flow"
  | "horizontal-flow"
  | "vertical-tree"
  | "horizontal-tree"
  | "radial-tree"
  | "organic"
  | "circle"
  | "orthogonal"
  | "align-left"
  | "align-center"
  | "align-right"
  | "align-top"
  | "align-middle"
  | "align-bottom"
  | "distribute-h"
  | "distribute-v";

type Props = {
  onLayout: (kind: string) => void;
  onMagicCleanup?: () => void;
  lastLayout?: string | null;
  className?: string;
};

function Item({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-[#334155] transition hover:bg-[#eef2f7]",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent"
      )}
    >
      {icon ?? <span className="size-3.5" />}
      <span>{label}</span>
    </button>
  );
}

function Sep() {
  return <div className="my-1 h-px bg-[#e2e8f0]" />;
}

export function LayoutMenu({
  onLayout,
  onMagicCleanup,
  lastLayout,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "w-[220px] rounded-lg border border-[#cfd8e3] bg-white p-1.5 shadow-lg",
        className
      )}
    >
      <Item
        label={lastLayout ? `Run Last Layout (${lastLayout})` : "Run Last Layout"}
        disabled={!lastLayout}
        onClick={() => onLayout("last")}
      />
      <Sep />
      <Item
        label="Vertical Flow"
        icon={<Workflow className="size-3.5 rotate-90" />}
        onClick={() => onLayout("vertical-flow")}
      />
      <Item
        label="Horizontal Flow"
        icon={<Workflow className="size-3.5" />}
        onClick={() => onLayout("horizontal-flow")}
      />
      <Sep />
      <Item
        label="Vertical Tree"
        icon={<GitBranch className="size-3.5" />}
        onClick={() => onLayout("vertical-tree")}
      />
      <Item
        label="Horizontal Tree"
        icon={<GitBranch className="size-3.5 -rotate-90" />}
        onClick={() => onLayout("horizontal-tree")}
      />
      <Item
        label="Radial Tree"
        icon={<Network className="size-3.5" />}
        onClick={() => onLayout("radial-tree")}
      />
      <Sep />
      <Item
        label="Organic"
        icon={<Network className="size-3.5 opacity-70" />}
        onClick={() => onLayout("organic")}
      />
      <Item
        label="Circle"
        icon={<Circle className="size-3.5" />}
        onClick={() => onLayout("circle")}
      />
      <Sep />
      <Item
        label="Orthogonal Routing"
        icon={<Workflow className="size-3.5" />}
        onClick={() => onLayout("orthogonal")}
      />
      <Item
        label="Magic Cleanup ✨"
        icon={<Sparkles className="size-3.5 text-amber-500" />}
        onClick={() => onMagicCleanup?.() ?? onLayout("magic-cleanup")}
      />
      <Sep />
      <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
        Align
      </p>
      <Item
        label="Align Left"
        icon={<AlignLeft className="size-3.5" />}
        onClick={() => onLayout("align-left")}
      />
      <Item label="Align Center" onClick={() => onLayout("align-center")} />
      <Item label="Align Right" onClick={() => onLayout("align-right")} />
      <Item label="Align Top" onClick={() => onLayout("align-top")} />
      <Item label="Align Middle" onClick={() => onLayout("align-middle")} />
      <Item label="Align Bottom" onClick={() => onLayout("align-bottom")} />
      <Sep />
      <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
        Distribute
      </p>
      <Item
        label="Distribute Horizontally"
        icon={<AlignHorizontalDistributeCenter className="size-3.5" />}
        onClick={() => onLayout("distribute-h")}
      />
      <Item label="Distribute Vertically" onClick={() => onLayout("distribute-v")} />
    </div>
  );
}
