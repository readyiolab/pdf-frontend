import { type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useDiagramToolsOptional, type ToolbarMenuId } from "./DiagramToolsContext";

export function RailBtn({
  label,
  shortcut,
  active,
  emphasis,
  onClick,
  children,
  disabled,
  hasMenu,
  menuOpen,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  /** Stronger lit treatment (e.g. connector mode stays obvious after menu closes). */
  emphasis?: boolean;
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
  hasMenu?: boolean;
  menuOpen?: boolean;
}) {
  const showTooltip = !menuOpen;

  const btn = (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      disabled={disabled}
      data-toolbar-trigger=""
      aria-label={label}
      aria-expanded={hasMenu ? Boolean(menuOpen) : undefined}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "relative size-7 rounded-md text-[#334155] transition-colors duration-100 hover:bg-[#e2e8f0]",
        active && "bg-white text-[#1d4ed8] shadow-sm ring-1 ring-[#93c5fd]",
        emphasis &&
          "bg-[#dbeafe] text-[#1e40af] shadow-sm ring-2 ring-[#3b82f6] ring-offset-1 ring-offset-[#f1f5f9] [&_svg]:fill-current [&_svg]:stroke-[2.25]"
      )}
    >
      {children}
      {hasMenu ? (
        <ChevronDown
          className={cn(
            "pointer-events-none absolute bottom-0.5 right-0.5 size-1.5 text-[#94a3b8]",
            menuOpen && "text-[#3b82f6]"
          )}
        />
      ) : null}
    </Button>
  );

  if (!showTooltip) return btn;

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="bottom" className="flex items-center gap-2">
        <span>{label}</span>
        {shortcut ? (
          <kbd className="rounded bg-background/20 px-1.5 py-0.5 font-mono text-[10px]">
            {shortcut}
          </kbd>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

type ToolbarMenuProps = {
  id: ToolbarMenuId;
  label: string;
  shortcut?: string;
  icon: ReactNode;
  /** Highlight trigger when this drawing tool is active */
  toolActive?: boolean;
  align?: "left" | "right";
  children: ReactNode;
  className?: string;
  /** Fires when the menu is toggled open (not when closed). */
  onOpen?: () => void;
};

/** Click-to-open exclusive menu anchored under a rail button. */
export function ToolbarMenu({
  id,
  label,
  shortcut,
  icon,
  toolActive,
  align = "left",
  children,
  className,
  onOpen,
}: ToolbarMenuProps) {
  const tools = useDiagramToolsOptional();
  const open = tools?.openMenu === id;
  const active = Boolean(toolActive) || open;

  return (
    <div className={cn("relative", className)} data-toolbar-menu={id}>
      <RailBtn
        label={label}
        shortcut={shortcut}
        active={active}
        emphasis={Boolean(toolActive) && !open}
        hasMenu
        menuOpen={open}
        onClick={() => {
          const willOpen = tools?.openMenu !== id;
          tools?.toggleMenu(id);
          if (willOpen) onOpen?.();
        }}
      >
        {icon}
      </RailBtn>
      <div
        className={cn(
          "absolute top-full z-50 mt-1 transition-all duration-150",
          align === "left" ? "left-0" : "right-0",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        )}
        aria-hidden={!open}
      >
        {open ? children : null}
      </div>
    </div>
  );
}
