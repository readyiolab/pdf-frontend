import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Expand,
  LayoutTemplate,
  Maximize2,
  Minus,
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
  MousePointer2,
  Hand,
} from "lucide-react";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  useDiagramToolsOptional,
  type ConnectorStylePreset,
} from "./DiagramToolsContext";
import { RailBtn, ToolbarMenu } from "./ToolbarMenu";
import { TablePicker } from "./TablePicker";
import { LayoutMenu } from "./LayoutMenu";
import { ThemeMenu } from "./ThemeMenu";

const SHAPE_ITEMS: { id: string; label: string; shape: string }[] = [
  { id: "rect", label: "Rectangle", shape: "rectangle" },
  { id: "rounded", label: "Rounded", shape: "rounded" },
  { id: "circle", label: "Circle", shape: "ellipse" },
  { id: "diamond", label: "Diamond", shape: "diamond" },
  { id: "db", label: "Database", shape: "cylinder" },
  { id: "cloud", label: "Cloud", shape: "cloud" },
  { id: "server", label: "Server", shape: "process" },
  { id: "user", label: "User", shape: "actor" },
  { id: "api", label: "API", shape: "hexagon" },
  { id: "queue", label: "Queue", shape: "parallelogram" },
  { id: "storage", label: "Storage", shape: "document" },
  { id: "text", label: "Custom / Text", shape: "text" },
];

const PRESET_COLORS = [
  "#ffffff",
  "#dae8fc",
  "#d5e8d4",
  "#ffe6cc",
  "#f8cecc",
  "#e1d5e7",
  "#fff2cc",
  "#f5f5f5",
  "#6c8ebf",
  "#82b366",
  "#d79b00",
  "#b85450",
  "#9673a6",
  "#111827",
  "#3b82f6",
  "#ef4444",
];

const CONNECTOR_PRESETS: {
  id: string;
  label: string;
  style: ConnectorStylePreset;
}[] = [
  {
    id: "straight",
    label: "Straight",
    style: { edgeStyle: "straight", curved: false, endArrow: "classic", startArrow: "none" },
  },
  {
    id: "curved",
    label: "Curved",
    style: { edgeStyle: "straight", curved: true, endArrow: "classic", startArrow: "none" },
  },
  {
    id: "elbow",
    label: "Elbow",
    style: { edgeStyle: "elbow", curved: false, endArrow: "classic", startArrow: "none" },
  },
  {
    id: "orthogonal",
    label: "Orthogonal",
    style: { edgeStyle: "orthogonal", curved: false, endArrow: "classic", startArrow: "none" },
  },
  {
    id: "arrow",
    label: "Arrow",
    style: { edgeStyle: "orthogonal", curved: false, endArrow: "block", startArrow: "none" },
  },
  {
    id: "bidirectional",
    label: "Bidirectional",
    style: { edgeStyle: "orthogonal", curved: false, endArrow: "classic", startArrow: "classic" },
  },
];

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
  onApplyTheme,
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
  const [hexDraft, setHexDraft] = useState(fillColor);

  const collapsed = collapsedProp ?? localCollapsed;
  const setCollapsed = (v: boolean) => {
    onCollapseChange?.(v);
    if (collapsedProp === undefined) setLocalCollapsed(v);
  };

  const activeTool = tools?.activeTool ?? "select";
  const pct = Math.round(zoom * 100);
  const colorValue = tools?.colorTarget === "stroke" ? strokeColor : fillColor;

  const pickShape = (shape: string) => {
    tools?.setPendingShape(shape);
    tools?.setDrawingTool("shape-place");
    tools?.closeMenu();
  };

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={300}>
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
    <TooltipProvider delayDuration={300}>
      <div className={cn("relative flex shrink-0 flex-col", className)}>
        <div className="flex h-10 items-center gap-0.5 overflow-x-auto border-b border-[#cfd8e3] bg-[#f1f5f9] px-1.5">
          {onToggleLeftPanel ? (
            <RailBtn label="Toggle left panel" shortcut="Ctrl+Shift+P" onClick={onToggleLeftPanel}>
              <PanelLeft className="size-3.5" />
            </RailBtn>
          ) : null}

          <RailBtn
            label="Select"
            shortcut="V"
            active={activeTool === "select"}
            onClick={() => tools?.setDrawingTool("select")}
          >
            <MousePointer2 className="size-3.5" />
          </RailBtn>
          <RailBtn
            label="Pan"
            shortcut="H"
            active={activeTool === "pan"}
            onClick={() => tools?.setDrawingTool("pan")}
          >
            <Hand className="size-3.5" />
          </RailBtn>

          <Sep />

          <button
            type="button"
            className="mx-0.5 min-w-[48px] rounded-md px-1.5 py-1 text-center text-xs font-medium text-[#475569] transition hover:bg-[#e2e8f0]"
            onClick={() => onZoomChange(1)}
            title="Reset zoom"
          >
            {pct}%
          </button>
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
          <RailBtn label="Redo" shortcut="Ctrl+Shift+Z" onClick={onRedo}>
            <Redo2 className="size-3.5" />
          </RailBtn>
          <RailBtn label="Delete" shortcut="Del" onClick={onDelete}>
            <Trash2 className="size-3.5" />
          </RailBtn>

          <Sep />

          <ToolbarMenu
            id="colors"
            label="Colors"
            icon={<span className="size-3.5 rounded-[3px] border border-[#94a3b8]" style={{ background: colorValue }} />}
          >
            <div className="w-52 rounded-lg border border-[#cfd8e3] bg-white p-3 shadow-lg" data-toolbar-menu="colors">
              <div className="mb-2 flex gap-1 text-[10px] font-medium uppercase tracking-wide text-[#64748b]">
                <button
                  type="button"
                  className={cn(
                    "rounded px-2 py-0.5",
                    tools?.colorTarget === "fill" ? "bg-[#eff6ff] text-[#1d4ed8]" : "hover:bg-[#f1f5f9]"
                  )}
                  onClick={() => tools?.setColorTarget("fill")}
                >
                  Fill
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded px-2 py-0.5",
                    tools?.colorTarget === "stroke" ? "bg-[#eff6ff] text-[#1d4ed8]" : "hover:bg-[#f1f5f9]"
                  )}
                  onClick={() => tools?.setColorTarget("stroke")}
                >
                  Stroke
                </button>
              </div>
              <div className="mb-2 grid grid-cols-8 gap-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="size-5 rounded border border-[#cbd5e1]"
                    style={{ background: c }}
                    title={c}
                    onClick={() => {
                      if (tools?.colorTarget === "stroke") onStrokeColor?.(c);
                      else onFillColor?.(c);
                      setHexDraft(c);
                      tools?.closeMenu();
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(hexDraft) ? hexDraft : "#ffffff"}
                  onChange={(e) => {
                    setHexDraft(e.target.value);
                    if (tools?.colorTarget === "stroke") onStrokeColor?.(e.target.value);
                    else onFillColor?.(e.target.value);
                  }}
                  className="size-7 cursor-pointer rounded border border-[#cbd5e1] bg-white p-0.5"
                />
                <input
                  type="text"
                  value={hexDraft}
                  onChange={(e) => setHexDraft(e.target.value)}
                  onBlur={() => {
                    if (/^#[0-9a-fA-F]{6}$/.test(hexDraft)) {
                      if (tools?.colorTarget === "stroke") onStrokeColor?.(hexDraft);
                      else onFillColor?.(hexDraft);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && /^#[0-9a-fA-F]{6}$/.test(hexDraft)) {
                      if (tools?.colorTarget === "stroke") onStrokeColor?.(hexDraft);
                      else onFillColor?.(hexDraft);
                      tools?.closeMenu();
                    }
                  }}
                  className="h-7 flex-1 rounded border border-[#cbd5e3] px-2 font-mono text-xs"
                  placeholder="#hex"
                />
              </div>
            </div>
          </ToolbarMenu>

          <RailBtn
            label="Rectangle"
            shortcut="R"
            active={activeTool === "shape-place" && tools?.pendingShape === "rectangle"}
            onClick={() => pickShape("rectangle")}
          >
            <Square className="size-3.5" />
          </RailBtn>

          <RailBtn
            label="Text"
            shortcut="T"
            onClick={() => {
              tools?.setDrawingTool("select");
              onInsertText?.();
            }}
          >
            <Type className="size-3.5" />
          </RailBtn>

          <ToolbarMenu
            id="connector"
            label="Connector"
            shortcut="L"
            toolActive={activeTool === "connector" || activeTool === "arrow"}
            icon={<Waypoints className="size-3.5" />}
            onOpen={() => tools?.setDrawingTool("connector", { keepMenu: "connector" })}
          >
            <div className="w-44 rounded-lg border border-[#cfd8e3] bg-white p-1 shadow-lg" data-toolbar-menu="connector">
              {CONNECTOR_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-[#334155] hover:bg-[#eef2f7]"
                  onClick={() => {
                    tools?.setConnectorStyle(p.style);
                    tools?.setDrawingTool(p.id === "arrow" ? "arrow" : "connector");
                    tools?.closeMenu();
                  }}
                >
                  <Minus className="size-3.5 opacity-60" />
                  {p.label}
                </button>
              ))}
              <div className="my-1 h-px bg-[#e2e8f0]" />
              <button
                type="button"
                className="w-full rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-[#1d4ed8] hover:bg-[#eff6ff]"
                onClick={() => {
                  tools?.setDrawingTool("connector");
                  tools?.closeMenu();
                }}
              >
                Activate connector mode
              </button>
            </div>
          </ToolbarMenu>

          <ToolbarMenu
            id="shapes"
            label="Shapes"
            shortcut="S"
            toolActive={activeTool === "shape-place"}
            icon={<Plus className="size-3.5" />}
          >
            <div
              className="grid w-[220px] grid-cols-3 gap-1 rounded-lg border border-[#cfd8e3] bg-white p-2 shadow-lg"
              data-toolbar-menu="shapes"
            >
              {SHAPE_ITEMS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="flex flex-col items-center gap-1 rounded-md px-1.5 py-2 text-[10px] text-[#334155] hover:bg-[#eef2f7]"
                  onClick={() => pickShape(s.shape)}
                >
                  <span className="flex size-7 items-center justify-center rounded border border-[#cbd5e1] bg-[#f8fafc] text-[11px]">
                    {s.label.slice(0, 1)}
                  </span>
                  {s.label}
                </button>
              ))}
            </div>
          </ToolbarMenu>

          <ToolbarMenu
            id="table"
            label="Table"
            shortcut="Ctrl+Shift+T"
            icon={<Table2 className="size-3.5" />}
          >
            <div data-toolbar-menu="table">
              <TablePicker
                onPick={(rows, cols) => {
                  onInsertTable?.(rows, cols, { withTitle: false, withContainer: false });
                  tools?.setDrawingTool("select");
                  tools?.closeMenu();
                }}
              />
            </div>
          </ToolbarMenu>

          <RailBtn
            label="Pen"
            shortcut="P"
            active={
              activeTool === "pen" ||
              activeTool === "brush" ||
              activeTool === "pencil" ||
              activeTool === "marker" ||
              activeTool === "eraser"
            }
            onClick={() => tools?.setDrawingTool("pen")}
          >
            <PenTool className="size-3.5" />
          </RailBtn>

          <RailBtn
            label="AI Generate"
            shortcut="Ctrl+/"
            active={!!tools?.aiOpen}
            onClick={() => {
              tools?.closeMenu();
              tools?.setAiOpen(true);
              onAiGenerate?.();
            }}
          >
            <Sparkles className="size-3.5" />
          </RailBtn>

          <ToolbarMenu id="layout" label="Layout" shortcut="Ctrl+L" icon={<LayoutTemplate className="size-3.5" />}>
            <div data-toolbar-menu="layout">
              <LayoutMenu
                lastLayout={lastLayout}
                onLayout={(kind) => {
                  onLayout?.(kind);
                  if (kind === "vertical-flow" || kind === "horizontal-flow") {
                    onAutoLayout?.();
                  }
                  tools?.closeMenu();
                }}
                onMagicCleanup={() => {
                  onMagicCleanup?.();
                  tools?.closeMenu();
                }}
              />
            </div>
          </ToolbarMenu>

          <ToolbarMenu id="themes" label="Themes" icon={<Palette className="size-3.5" />}>
            <div data-toolbar-menu="themes">
              <ThemeMenu
                current={currentTheme}
                onSelect={(id) => {
                  onApplyTheme?.(id);
                  tools?.closeMenu();
                }}
              />
            </div>
          </ToolbarMenu>

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

            <ToolbarMenu
              id="export"
              label="More / Export"
              align="right"
              icon={<Expand className="size-3.5" />}
            >
              <div className="w-40 rounded-lg border border-[#cfd8e3] bg-white p-1 shadow-lg" data-toolbar-menu="export">
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
                        tools?.closeMenu();
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
              </div>
            </ToolbarMenu>

            <RailBtn label="Collapse toolbar" onClick={() => setCollapsed(true)}>
              <ChevronUp className="size-3.5" />
            </RailBtn>
          </div>
        </div>

        {tools?.showPenStrip ? <PenStrip /> : null}
      </div>
    </TooltipProvider>
  );
}

function PenStrip() {
  const tools = useDiagramToolsOptional();
  if (!tools) return null;
  const mode = tools.activeTool;
  const opts =
    mode === "brush" || mode === "marker"
      ? tools.brush
      : tools.pen;
  const setOpts =
    mode === "brush" || mode === "marker" ? tools.setBrush : tools.setPen;

  const chips: { id: typeof tools.activeTool; label: string }[] = [
    { id: "pen", label: "Pen" },
    { id: "brush", label: "Brush" },
    { id: "pencil", label: "Pencil" },
    { id: "marker", label: "Marker" },
    { id: "eraser", label: "Eraser" },
  ];

  return (
    <div className="flex h-9 items-center gap-1 border-b border-[#e2e8f0] bg-white px-2">
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          className={cn(
            "rounded-md px-2 py-1 text-[11px] font-medium text-[#475569] transition hover:bg-[#f1f5f9]",
            mode === c.id && "bg-[#eff6ff] text-[#1d4ed8] ring-1 ring-[#bfdbfe]"
          )}
          onClick={() => {
            if (c.id === "pencil") {
              tools.setPen({ size: 1.5, color: "#334155", opacity: 1 });
              tools.setDrawingTool("pencil");
            } else if (c.id === "marker") {
              tools.setBrush({ size: 14, color: "#f59e0b", opacity: 0.4 });
              tools.setDrawingTool("marker");
            } else {
              tools.setDrawingTool(c.id);
            }
          }}
        >
          {c.label}
        </button>
      ))}
      <Sep />
      <label className="flex items-center gap-1 text-[11px] text-[#64748b]">
        Color
        <input
          type="color"
          value={opts.color}
          onChange={(e) => setOpts((p) => ({ ...p, color: e.target.value }))}
          className="size-6 cursor-pointer rounded border border-[#cbd5e1] p-0.5"
        />
      </label>
      <label className="flex items-center gap-1 text-[11px] text-[#64748b]">
        Size
        <input
          type="range"
          min={1}
          max={24}
          value={opts.size}
          onChange={(e) => setOpts((p) => ({ ...p, size: Number(e.target.value) }))}
          className="w-16"
        />
      </label>
      <label className="flex items-center gap-1 text-[11px] text-[#64748b]">
        Opacity
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={opts.opacity}
          onChange={(e) => setOpts((p) => ({ ...p, opacity: Number(e.target.value) }))}
          className="w-16"
        />
      </label>
      <button
        type="button"
        className="ml-auto rounded-md px-2 py-1 text-[11px] font-semibold text-[#1d4ed8] hover:bg-[#eff6ff]"
        onClick={() => tools.setDrawingTool("select")}
      >
        Select (Esc)
      </button>
    </div>
  );
}
