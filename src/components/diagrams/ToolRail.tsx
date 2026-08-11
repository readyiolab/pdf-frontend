import { useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  Expand,
  LayoutTemplate,
  Maximize2,
  PanelLeft,
  PanelRight,
  PenTool,
  Plus,
  Redo2,
  Sparkles,
  Square,
  Table2,
  Trash2,
  Type,
  Undo2,
  Waypoints,
  ZoomIn,
  ZoomOut,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useDiagramToolsOptional, type DiagramTool } from "./DiagramToolsContext";
import { TablePicker } from "./TablePicker";
import { LayoutMenu } from "./LayoutMenu";
import { ThemeMenu } from "./ThemeMenu";

export type ToolRailProps = {
  zoom: number;
  onZoomChange: (z: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onAutoLayout?: () => void;
  onMagicCleanup?: () => void;
  onAiGenerate?: () => void;
  onExportPng?: () => void;
  onExportSvg?: () => void;
  onExportPdf?: () => void;
  onInsertTable?: (
    rows: number,
    cols: number,
    opts: { withTitle: boolean; withContainer: boolean }
  ) => void;
  onInsertText?: () => void;
  onInsertContainer?: () => void;
  onInsertShape?: (shape?: string) => void;
  onApplyTheme?: (themeId: string) => void;
  onToggleShapesPanel?: () => void;
  onToggleFormatPanel?: () => void;
  onToggleLeftPanel?: () => void;
  onPresent?: () => void;
  onAnalyze?: () => void;
  onExplain?: () => void;
  onVersions?: () => void;
  onFillColor?: (color: string) => void;
  onStrokeColor?: (color: string) => void;
  /** Called when a layout kind is chosen from LayoutMenu */
  onLayout?: (kind: string) => void;
  fillColor?: string;
  strokeColor?: string;
  currentTheme?: string | null;
  lastLayout?: string | null;
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  className?: string;
};

function Sep() {
  return <div className="mx-1 h-5 w-px shrink-0 bg-[#cfd8e3]" />;
}

function RailBtn({
  label,
  shortcut,
  active,
  onClick,
  children,
  disabled,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          className={cn(
            "size-7 rounded-md text-[#334155] transition-transform hover:scale-105",
            active && "bg-white shadow-sm ring-1 ring-[#93c5fd]"
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
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

function ColorSwatch({
  label,
  color,
  onChange,
}: {
  label: string;
  color: string;
  onChange?: (c: string) => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <label className="relative flex size-7 cursor-pointer items-center justify-center rounded-md transition-transform hover:scale-105 hover:bg-[#eef2f7]">
          <span
            className="size-4 rounded-[3px] border border-[#94a3b8]"
            style={{ backgroundColor: color }}
          />
          <input
            type="color"
            value={color}
            onChange={(e) => onChange?.(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={label}
          />
        </label>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

function PopoverAnchor({
  open,
  onOpenChange,
  trigger,
  children,
  align = "left",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <div className="relative">
      {trigger}
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close menu"
            onClick={() => onOpenChange(false)}
          />
          <div
            className={cn(
              "absolute top-full z-50 mt-1",
              align === "left" ? "left-0" : "right-0"
            )}
          >
            {children}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function ToolRail({
  zoom,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  onUndo,
  onRedo,
  onDelete,
  onAutoLayout,
  onMagicCleanup,
  onAiGenerate,
  onExportPng,
  onExportSvg,
  onExportPdf,
  onInsertTable,
  onInsertText,
  onInsertContainer,
  onInsertShape,
  onApplyTheme,
  onToggleShapesPanel,
  onToggleFormatPanel,
  onToggleLeftPanel,
  onPresent,
  onAnalyze,
  onExplain,
  onVersions,
  onFillColor,
  onStrokeColor,
  onLayout,
  fillColor = "#dae8fc",
  strokeColor = "#6c8ebf",
  currentTheme = "automatic",
  lastLayout,
  collapsed: collapsedProp,
  onCollapseChange,
  className,
}: ToolRailProps) {
  const tools = useDiagramToolsOptional();
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [layoutOpenLocal, setLayoutOpenLocal] = useState(false);
  const [themesOpenLocal, setThemesOpenLocal] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const collapsed = collapsedProp ?? localCollapsed;
  const setCollapsed = (v: boolean) => {
    onCollapseChange?.(v);
    if (collapsedProp === undefined) setLocalCollapsed(v);
  };

  const activeTool = tools?.activeTool ?? "select";
  const setActiveTool = (t: DiagramTool) => tools?.setActiveTool(t);

  const layoutOpen = layoutOpenLocal || !!tools?.layoutOpen;
  const themesOpen = themesOpenLocal || !!tools?.themesOpen;
  const pct = Math.round(zoom * 100);

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={200}>
        <div
          className={cn(
            "flex h-8 shrink-0 items-center justify-center border-b border-[#cfd8e3] bg-[#f1f5f9]",
            className
          )}
        >
          <RailBtn label="Expand toolbar" onClick={() => setCollapsed(false)}>
            <ChevronDown className="size-3.5" />
          </RailBtn>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          "flex h-10 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-[#cfd8e3] bg-[#f1f5f9] px-1.5",
          className
        )}
      >
        {onToggleLeftPanel ? (
          <RailBtn label="Toggle left panel" shortcut="Ctrl+Shift+P" onClick={onToggleLeftPanel}>
            <PanelLeft className="size-3.5" />
          </RailBtn>
        ) : null}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="mx-0.5 min-w-[48px] rounded-md px-1.5 py-1 text-center text-xs font-medium text-[#475569] transition hover:bg-[#e2e8f0]"
              onClick={() => onZoomChange(1)}
            >
              {pct}%
            </button>
          </TooltipTrigger>
          <TooltipContent>Zoom (click to reset)</TooltipContent>
        </Tooltip>

        <RailBtn label="Zoom out" shortcut="Ctrl+-" onClick={onZoomOut}>
          <ZoomOut className="size-3.5" />
        </RailBtn>
        <RailBtn label="Zoom in" shortcut="Ctrl+=" onClick={onZoomIn}>
          <ZoomIn className="size-3.5" />
        </RailBtn>

        <Sep />

        <RailBtn label="Undo" shortcut="Ctrl+Z" onClick={onUndo}>
          <Undo2 className="size-3.5" />
        </RailBtn>
        <RailBtn label="Redo" shortcut="Ctrl+Y" onClick={onRedo}>
          <Redo2 className="size-3.5" />
        </RailBtn>
        <RailBtn label="Delete" shortcut="Del" onClick={onDelete}>
          <Trash2 className="size-3.5" />
        </RailBtn>

        <Sep />

        <ColorSwatch label="Fill color" color={fillColor} onChange={onFillColor} />
        <ColorSwatch label="Stroke color" color={strokeColor} onChange={onStrokeColor} />

        <RailBtn
          label="Rectangle"
          shortcut="R"
          active={activeTool === "shapes"}
          onClick={() => {
            setActiveTool("shapes");
            onInsertShape?.("rectangle");
          }}
        >
          <Square className="size-3.5" />
        </RailBtn>

        <RailBtn
          label="Text"
          shortcut="T"
          active={activeTool === "text"}
          onClick={() => {
            setActiveTool("text");
            onInsertText?.();
          }}
        >
          <Type className="size-3.5" />
        </RailBtn>

        <RailBtn
          label="Connector"
          shortcut="C"
          active={activeTool === "connector"}
          onClick={() => setActiveTool("connector")}
        >
          <Waypoints className="size-3.5" />
        </RailBtn>

        <RailBtn
          label="Shapes"
          shortcut="S"
          active={activeTool === "shapes"}
          onClick={() => {
            setActiveTool("shapes");
            tools?.setShapesOpen(true);
            onToggleShapesPanel?.();
            onInsertShape?.();
          }}
        >
          <Plus className="size-3.5" />
        </RailBtn>

        <PopoverAnchor
          open={tableOpen}
          onOpenChange={setTableOpen}
          trigger={
            <RailBtn
              label="Table"
              shortcut="Ctrl+Shift+T"
              active={activeTool === "table" || tableOpen}
              onClick={() => {
                setActiveTool("table");
                setTableOpen((o) => !o);
              }}
            >
              <Table2 className="size-3.5" />
            </RailBtn>
          }
        >
          <TablePicker
            withTitle={tools?.tableOpts.withTitle}
            withContainer={tools?.tableOpts.withContainer}
            onWithTitleChange={(v) =>
              tools?.setTableOpts((prev) => ({ ...prev, withTitle: v }))
            }
            onWithContainerChange={(v) =>
              tools?.setTableOpts((prev) => ({ ...prev, withContainer: v }))
            }
            onPick={(rows, cols) => {
              const opts = {
                withTitle: tools?.tableOpts.withTitle ?? false,
                withContainer: tools?.tableOpts.withContainer ?? false,
              };
              tools?.setTableOpts((prev) => ({ ...prev, rows, cols }));
              onInsertTable?.(rows, cols, opts);
              setTableOpen(false);
            }}
          />
        </PopoverAnchor>

        <RailBtn
          label="Pen"
          shortcut="P"
          active={activeTool === "pen"}
          onClick={() => setActiveTool("pen")}
        >
          <PenTool className="size-3.5" />
        </RailBtn>

        <RailBtn
          label="AI Generate"
          shortcut="Ctrl+/"
          active={activeTool === "ai" || !!tools?.aiOpen}
          onClick={() => {
            setActiveTool("ai");
            tools?.setAiOpen(true);
            onAiGenerate?.();
          }}
        >
          <Sparkles className="size-3.5" />
        </RailBtn>

        <PopoverAnchor
          open={layoutOpen}
          onOpenChange={(v) => {
            setLayoutOpenLocal(v);
            tools?.setLayoutOpen(v);
          }}
          trigger={
            <RailBtn
              label="Layout"
              shortcut="Ctrl+L"
              active={activeTool === "layout" || layoutOpen}
              onClick={() => {
                setActiveTool("layout");
                const next = !layoutOpen;
                setLayoutOpenLocal(next);
                tools?.setLayoutOpen(next);
              }}
            >
              <LayoutTemplate className="size-3.5" />
            </RailBtn>
          }
        >
          <LayoutMenu
            lastLayout={lastLayout}
            onLayout={(kind) => {
              onLayout?.(kind);
              if (kind === "vertical-flow" || kind === "horizontal-flow") {
                onAutoLayout?.();
              }
              setLayoutOpenLocal(false);
              tools?.setLayoutOpen(false);
            }}
            onMagicCleanup={() => {
              onMagicCleanup?.();
              setLayoutOpenLocal(false);
              tools?.setLayoutOpen(false);
            }}
          />
        </PopoverAnchor>

        <PopoverAnchor
          open={themesOpen}
          onOpenChange={(v) => {
            setThemesOpenLocal(v);
            tools?.setThemesOpen(v);
          }}
          trigger={
            <RailBtn
              label="Themes"
              active={activeTool === "themes" || themesOpen}
              onClick={() => {
                setActiveTool("themes");
                const next = !themesOpen;
                setThemesOpenLocal(next);
                tools?.setThemesOpen(next);
              }}
            >
              <Palette className="size-3.5" />
            </RailBtn>
          }
        >
          <ThemeMenu
            current={currentTheme}
            onSelect={(id) => {
              onApplyTheme?.(id);
              setThemesOpenLocal(false);
              tools?.setThemesOpen(false);
            }}
          />
        </PopoverAnchor>

        <div className="ml-auto flex items-center gap-0.5">
          {onPresent ? (
            <RailBtn label="Present / Fullscreen" shortcut="F5" onClick={onPresent}>
              <Maximize2 className="size-3.5" />
            </RailBtn>
          ) : null}

          {onToggleFormatPanel ? (
            <RailBtn label="Format panel" shortcut="Ctrl+Shift+F" onClick={onToggleFormatPanel}>
              <PanelRight className="size-3.5" />
            </RailBtn>
          ) : null}

          <PopoverAnchor
            open={exportOpen}
            onOpenChange={setExportOpen}
            align="right"
            trigger={
              <RailBtn
                label="More / Export"
                active={activeTool === "export" || exportOpen}
                onClick={() => {
                  setActiveTool("export");
                  setExportOpen((o) => !o);
                }}
              >
                <Expand className="size-3.5" />
              </RailBtn>
            }
          >
            <div className="w-40 rounded-lg border border-[#cfd8e3] bg-white p-1 shadow-lg">
              {(
                [
                  { label: "Export PNG", fn: onExportPng },
                  { label: "Export SVG", fn: onExportSvg },
                  { label: "Export PDF", fn: onExportPdf },
                  { label: "Analyze", fn: onAnalyze },
                  { label: "Explain", fn: onExplain },
                  { label: "Versions", fn: onVersions },
                  { label: "Insert container", fn: onInsertContainer },
                ] as const
              )
                .filter((item) => item.fn)
                .map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="w-full rounded-md px-2.5 py-1.5 text-left text-xs text-[#334155] hover:bg-[#eef2f7]"
                    onClick={() => {
                      item.fn?.();
                      setExportOpen(false);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
            </div>
          </PopoverAnchor>

          <RailBtn label="Collapse toolbar" onClick={() => setCollapsed(true)}>
            <ChevronUp className="size-3.5" />
          </RailBtn>
        </div>
      </div>
    </TooltipProvider>
  );
}
