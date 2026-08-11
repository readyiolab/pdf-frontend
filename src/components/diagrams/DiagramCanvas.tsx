import {
  useEffect,
  useImperativeHandle,
  useRef,
  forwardRef,
  useCallback,
  useState,
} from "react";
import {
  Graph,
  RubberBandHandler,
  InternalEvent,
  UndoManager,
  Clipboard,
  HierarchicalLayout,
  CompactTreeLayout,
  RadialTreeLayout,
  FastOrganicLayout,
  CircleLayout,
  ParallelEdgeLayout,
  getDefaultPlugins,
  StencilShapeConfig,
  ConnectionConstraint,
  Point,
  VertexHandlerConfig,
  SelectionHandler,
  type Cell,
  type CellStyle,
  type CellState,
} from "@maxgraph/core";
import "@maxgraph/core/css/common.css";
import {
  fromMaxGraph,
  toMaxGraph,
  shapeToMaxStyle,
  cellValueToDisplay,
  encodeEditedCellValue,
  parseCellValue,
  type DiagramPage,
  type DiagramSettings,
  PAPER_SIZES,
} from "@/lib/diagram/model";
import { allShapes, type ShapeDef } from "@/lib/diagram/shapes";
import { type StrokePoint } from "@/lib/diagram/freehand";
import { CUSTOM_SHAPE, registerDiagramCustomShapes } from "@/lib/diagram/customShapes";
import { cn } from "@/lib/utils";

registerDiagramCustomShapes();

export type CanvasToolMode =
  | "select"
  | "pan"
  | "pen"
  | "brush"
  | "eraser"
  | "connector"
  | "arrow"
  | "shape-place";

export type DefaultEdgeStyle = {
  edgeStyle: "orthogonal" | "straight" | "elbow";
  curved: boolean;
  endArrow: string;
  startArrow: string;
};

export type LayoutKindCanvas =
  | "vertical-flow"
  | "horizontal-flow"
  | "vertical-tree"
  | "horizontal-tree"
  | "radial"
  | "organic"
  | "circle"
  | "orthogonal";

// maxGraph can eval style/stencil strings when allowEval is true. Keep it off
// for production (default is already false; set explicitly for defense).
StencilShapeConfig.allowEval = false;
VertexHandlerConfig.rotationEnabled = true;

type Dir = "n" | "e" | "s" | "w";

const DIR_EXIT: Record<Dir, { exitX: number; exitY: number; entryX: number; entryY: number; dx: number; dy: number }> = {
  n: { exitX: 0.5, exitY: 0, entryX: 0.5, entryY: 1, dx: 0, dy: -140 },
  e: { exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5, dx: 160, dy: 0 },
  s: { exitX: 0.5, exitY: 1, entryX: 0.5, entryY: 0, dx: 0, dy: 140 },
  w: { exitX: 0, exitY: 0.5, entryX: 1, entryY: 0.5, dx: -160, dy: 0 },
};

const QUICK_SHAPES: { id: string; shape: string; label: string; w: number; h: number; preview: string }[] = [
  { id: "arrow", shape: "arrow", label: "Arrow", w: 100, h: 40, preview: "→" },
  { id: "rect", shape: "rectangle", label: "Rectangle", w: 120, h: 60, preview: "▭" },
  { id: "ellipse", shape: "ellipse", label: "Ellipse", w: 100, h: 60, preview: "⬭" },
  { id: "diamond", shape: "diamond", label: "Diamond", w: 100, h: 80, preview: "◇" },
];

const CARDINAL_CONSTRAINTS = [
  new ConnectionConstraint(new Point(0.5, 0), true, "N"),
  new ConnectionConstraint(new Point(1, 0.5), true, "E"),
  new ConnectionConstraint(new Point(0.5, 1), true, "S"),
  new ConnectionConstraint(new Point(0, 0.5), true, "W"),
];

function parseKindFromValue(raw: unknown): string {
  if (raw == null) return "shape";
  if (typeof raw === "object" && raw !== null && "kind" in raw) {
    return String((raw as { kind: string }).kind);
  }
  const str = String(raw);
  if (str.startsWith("{")) {
    try {
      const p = JSON.parse(str) as { kind?: string };
      if (p?.kind) return p.kind;
    } catch {
      /* ignore */
    }
  }
  return "shape";
}

function snapToGrid(n: number, grid: number) {
  return Math.round(n / grid) * grid;
}

function clientToGraph(graph: Graph, host: HTMLElement, clientX: number, clientY: number) {
  const rect = host.getBoundingClientRect();
  const scale = graph.getView().getScale();
  const tr = graph.getView().getTranslate();
  return {
    x: (clientX - rect.left) / scale - tr.x,
    y: (clientY - rect.top) / scale - tr.y,
  };
}

function edgeStyleKey(kind: DefaultEdgeStyle["edgeStyle"]): string {
  if (kind === "straight") return "none";
  if (kind === "elbow") return "elbowEdgeStyle";
  return "orthogonalEdgeStyle";
}

function applyDefaultEdgeStyle(graph: Graph, preset: DefaultEdgeStyle) {
  const style = {
    edgeStyle: edgeStyleKey(preset.edgeStyle),
    endArrow: preset.endArrow === "none" ? undefined : preset.endArrow,
    startArrow: preset.startArrow === "none" ? undefined : preset.startArrow,
    strokeColor: "#64748b",
    strokeWidth: 1.5,
    rounded: preset.edgeStyle !== "straight",
    curved: preset.curved,
  } as CellStyle;
  try {
    graph.getStylesheet().putDefaultEdgeStyle(style);
  } catch {
    /* ignore */
  }
}

function applyToolModeToGraph(
  graph: Graph,
  mode: CanvasToolMode,
  opts: { readOnly: boolean; host: HTMLElement | null }
) {
  const drawing = mode === "pen" || mode === "brush" || mode === "eraser";
  const connecting = mode === "connector" || mode === "arrow";
  const isPan = mode === "pan";
  const isShapePlace = mode === "shape-place";
  const panning = isPan || (!drawing && !connecting && !isShapePlace);
  graph.setPanning(panning);
  const connectable =
    !opts.readOnly && !drawing && !isPan && !isShapePlace && (connecting || mode === "select");
  graph.setConnectable(connectable);
  const ch = graph.getPlugin("ConnectionHandler") as { setEnabled?: (v: boolean) => void } | null;
  ch?.setEnabled?.(connectable);

  // Drawing tools must not select/move/rubberband
  const interactive = !drawing && !isShapePlace && !opts.readOnly;
  graph.setCellsMovable(interactive && !isPan);
  graph.setCellsResizable(interactive && !isPan);
  graph.setCellsEditable(interactive && mode === "select");
  const rb = graph.getPlugin("RubberBandHandler") as { setEnabled?: (v: boolean) => void } | null;
  rb?.setEnabled?.(interactive && mode === "select");

  if (opts.host) {
    if (drawing || isShapePlace) opts.host.style.cursor = "crosshair";
    else if (isPan) opts.host.style.cursor = "grab";
    else if (connecting) opts.host.style.cursor = "crosshair";
    else opts.host.style.cursor = "";
  }
}

export type SelectionInfo = {
  cells: Cell[];
  isEdge: boolean;
  isVertex: boolean;
  style: CellStyle;
};

export type DiagramCanvasHandle = {
  getGraph: () => Graph | null;
  loadPage: (page: DiagramPage) => void;
  serializePage: (meta: Pick<DiagramPage, "id" | "name">) => DiagramPage | null;
  addShape: (def: ShapeDef, at?: { x: number; y: number }) => void;
  addConnectedShape: (
    fromCellId: string,
    dir: Dir,
    shape: string
  ) => void;
  deleteSelection: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  setZoom: (factor: number) => void;
  getZoom: () => number;
  bringToFront: () => void;
  sendToBack: () => void;
  selectAll: () => void;
  clearSelection: () => void;
  applyStyle: (patch: Partial<CellStyle>) => void;
  align: (dir: "left" | "center" | "right" | "top" | "middle" | "bottom") => void;
  distribute: (axis: "h" | "v") => void;
  autoLayout: () => void;
  copy: () => void;
  cut: () => void;
  paste: () => void;
  duplicate: () => void;
  nudge: (dx: number, dy: number) => void;
  setReadOnly: (ro: boolean) => void;
  runLayout: (kind: LayoutKindCanvas) => void;
  magicCleanup: () => void;
  insertTable: (
    rows: number,
    cols: number,
    opts?: { title?: boolean; container?: boolean }
  ) => void;
  insertContainer: (title?: string) => void;
  insertFreehand: (
    points: Array<[number, number] | [number, number, number]>,
    style: { size: number; color: string; opacity: number; brush: "pen" | "brush" }
  ) => void;
  setToolMode: (mode: CanvasToolMode) => void;
  setPendingShape: (shape: string | null) => void;
  setDefaultEdgeStyle: (style: DefaultEdgeStyle) => void;
  setPenStyle: (style: {
    size: number;
    color: string;
    opacity: number;
    brush?: "pen" | "brush";
  }) => void;
  focusNodes: (ids: string[]) => void;
  setFocusMode: (on: boolean, seedIds?: string[]) => void;
  playFlow: () => void;
  pauseFlow: () => void;
  restartFlow: () => void;
  stepFlow: () => void;
  stepFlowBack: () => void;
  setFlowSpeed: (s: number) => void;
  getSelectionBounds: () => { x: number; y: number; w: number; h: number } | null;
  lockSelection: (locked: boolean) => void;
  groupSelection: () => void;
  ungroupSelection: () => void;
};

type HoverUi = {
  cellId: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

type Props = {
  className?: string;
  settings?: DiagramSettings;
  onDirty?: () => void;
  onSelectionChange?: (info: SelectionInfo | null) => void;
  onZoomChange?: (zoom: number) => void;
  onShapePlaced?: () => void;
  readOnly?: boolean;
};

function resolveShapeDef(shapeName: string): ShapeDef {
  const found = allShapes().find((s) => s.shape === shapeName || s.id === shapeName);
  if (found) return found;
  return {
    id: shapeName,
    label: shapeName === "text" ? "Text" : shapeName.charAt(0).toUpperCase() + shapeName.slice(1),
    shape: shapeName,
    w: 120,
    h: shapeName === "text" ? 40 : 60,
    category: "general",
    preview: "rect",
  };
}

export const DiagramCanvas = forwardRef<DiagramCanvasHandle, Props>(function DiagramCanvas(
  { className, settings, onDirty, onSelectionChange, onZoomChange, onShapePlaced, readOnly = false },
  ref
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const undoRef = useRef<UndoManager | null>(null);
  const dirtySkip = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;

  const [hoverUi, setHoverUi] = useState<HoverUi | null>(null);
  const [paletteDir, setPaletteDir] = useState<Dir | null>(null);
  const [paletteHover, setPaletteHover] = useState<string | null>(null);
  const [toolModeUi, setToolModeUi] = useState<CanvasToolMode>("select");
  const [strokePreview, setStrokePreview] = useState<{
    d: string;
    color: string;
    opacity: number;
    size: number;
    left: number;
    top: number;
    width: number;
    height: number;
    vbW: number;
    vbH: number;
  } | null>(null);
  const paletteDirRef = useRef<Dir | null>(null);
  paletteDirRef.current = paletteDir;

  const toolModeRef = useRef<CanvasToolMode>("select");
  const pendingShapeRef = useRef<string | null>(null);
  const defaultEdgeStyleRef = useRef<DefaultEdgeStyle>({
    edgeStyle: "orthogonal",
    curved: false,
    endArrow: "classic",
    startArrow: "none",
  });
  const onShapePlacedRef = useRef(onShapePlaced);
  onShapePlacedRef.current = onShapePlaced;
  const penStyleRef = useRef({ size: 2, color: "#111827", opacity: 1, brush: "pen" as "pen" | "brush" });
  const freehandPtsRef = useRef<StrokePoint[]>([]);
  const freehandDrawingRef = useRef(false);
  const connectingRef = useRef(false);
  const focusModeRef = useRef(false);
  const focusSeedRef = useRef<string[]>([]);
  const flowTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flowIndexRef = useRef(0);
  const flowSpeedRef = useRef(1);
  const flowEdgesRef = useRef<Cell[]>([]);
  const flowOrigStylesRef = useRef<Map<string, CellStyle>>(new Map());
  const onDirtyRef = useRef(onDirty);
  onDirtyRef.current = onDirty;

  const emitSelection = useCallback(() => {
    const graph = graphRef.current;
    if (!graph || !onSelectionChange) return;
    const cells = graph.getSelectionCells();
    if (!cells.length) {
      onSelectionChange(null);
      return;
    }
    const cell = cells[0];
    onSelectionChange({
      cells,
      isEdge: cell.isEdge(),
      isVertex: cell.isVertex(),
      style: { ...(cell.getStyle() ?? {}) },
    });
  }, [onSelectionChange]);

  const updateHoverFromCell = useCallback((cell: Cell | null) => {
    const graph = graphRef.current;
    const root = rootRef.current;
    const mode = toolModeRef.current;
    // Quick-add / waypoint UI only in select (quick-add) or connector (waypoints)
    if (mode !== "select" && mode !== "connector" && mode !== "arrow") {
      setHoverUi(null);
      setPaletteDir(null);
      return;
    }
    if (!graph || !root || !cell || !cell.isVertex() || readOnlyRef.current) {
      setHoverUi(null);
      setPaletteDir(null);
      return;
    }
    if (settingsRef.current?.connectionArrows === false && mode === "select") {
      setHoverUi(null);
      setPaletteDir(null);
      return;
    }
    const state = graph.getView().getState(cell);
    if (!state) {
      setHoverUi(null);
      return;
    }
    const rootRect = root.getBoundingClientRect();
    // state.x/y are in graph view coords relative to container
    setHoverUi({
      cellId: cell.getId() || "",
      left: state.x,
      top: state.y,
      width: state.width,
      height: state.height,
    });
    void rootRect;
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    InternalEvent.disableContextMenu(host);
    const plugins = getDefaultPlugins();
    if (!plugins.includes(RubberBandHandler)) plugins.push(RubberBandHandler);
    const graph = new Graph(host, undefined, plugins);
    graph.setPanning(true);
    graph.setConnectable(!readOnly);
    graph.setCellsEditable(!readOnly);
    graph.setCellsResizable(!readOnly);
    graph.setCellsMovable(!readOnly);
    graph.setAllowDanglingEdges(false);
    graph.setDisconnectOnMove(false);
    graph.setGridEnabled(settings?.grid !== false);
    graph.setGridSize(settings?.gridSize ?? 10);
    graph.setTooltips(true);
    graph.getView().setTranslate(40, 40);
    graph.getView().setAllowEval(false);

    // Never show raw JSON payloads as labels (table/freehand/container)
    graph.convertValueToString = (cell: Cell) => cellValueToDisplay(cell.getValue());
    const baseIsHtmlLabel = graph.isHtmlLabel.bind(graph);
    graph.isHtmlLabel = (cell: Cell) => {
      const kind = parseCellValue(cell.getValue()).kind;
      if (kind === "table") return true;
      return baseIsHtmlLabel(cell);
    };
    const baseCellLabelChanged = graph.cellLabelChanged.bind(graph);
    graph.cellLabelChanged = (cell: Cell, value: unknown, autoSize?: boolean) => {
      const next = encodeEditedCellValue(cell.getValue(), String(value ?? ""));
      baseCellLabelChanged(cell, next, Boolean(autoSize));
    };

    // Cardinal connection points (draw.io-style)
    graph.getAllConnectionConstraints = (terminal: CellState | null, _source: boolean) => {
      if (settingsRef.current?.connectionPoints === false) return null;
      if (!terminal?.cell?.isVertex()) return null;
      return CARDINAL_CONSTRAINTS;
    };

    const selectionHandler = graph.getPlugin("SelectionHandler") as SelectionHandler | null;
    if (selectionHandler) {
      selectionHandler.guidesEnabled = settingsRef.current?.guides !== false;
    }

    const undo = new UndoManager();
    const listener = (_sender: unknown, evt: { getProperty: (k: string) => unknown }) => {
      undo.undoableEditHappened(evt.getProperty("edit") as never);
      if (!dirtySkip.current) onDirty?.();
    };
    graph.getDataModel().addListener(InternalEvent.UNDO, listener as never);
    graph.getView().addListener(InternalEvent.UNDO, listener as never);

    const refreshHover = () => {
      if (paletteDirRef.current) return;
      const sel = graph.getSelectionCells().find((c) => c.isVertex());
      if (sel) updateHoverFromCell(sel);
    };

    graph.getSelectionModel().addListener(InternalEvent.CHANGE, () => {
      emitSelection();
      const sel = graph.getSelectionCells();
      const v = sel.find((c) => c.isVertex()) ?? null;
      updateHoverFromCell(v);
    });

    graph.getView().addListener(InternalEvent.SCALE, refreshHover as never);
    graph.getView().addListener(InternalEvent.TRANSLATE, refreshHover as never);
    graph.getDataModel().addListener(InternalEvent.CHANGE, refreshHover as never);

    const mouseListener = {
      mouseDown: (_sender: unknown, me: { getCell: () => Cell | null; getEvent: () => MouseEvent }) => {
        if (readOnlyRef.current) return;
        const mode = toolModeRef.current;
        const evt = me.getEvent();

        if (mode === "shape-place" && pendingShapeRef.current) {
          const shapeName = pendingShapeRef.current;
          const pt = clientToGraph(graph, host, evt.clientX, evt.clientY);
          const def = resolveShapeDef(shapeName);
          const w = def.w ?? 120;
          const h = def.h ?? 60;
          const grid = graph.getGridSize();
          const x = snapToGrid(pt.x - w / 2, grid);
          const y = snapToGrid(pt.y - h / 2, grid);
          const mapped = shapeToMaxStyle(def.shape);
          const style: CellStyle = {
            ...mapped,
            fillColor: mapped.fillColor ?? "#dae8fc",
            strokeColor: mapped.strokeColor ?? "#6c8ebf",
            strokeWidth: 1.5,
            fontSize: 12,
            fontColor: "#333333",
            whiteSpace: "wrap",
          };
          graph.getDataModel().beginUpdate();
          try {
            const cell = graph.insertVertex({
              parent: graph.getDefaultParent(),
              id: crypto.randomUUID(),
              value: def.shape === "text" ? "Text" : "",
              position: [x, y],
              size: [w, h],
              style,
            });
            graph.setSelectionCell(cell);
          } finally {
            graph.getDataModel().endUpdate();
          }
          pendingShapeRef.current = null;
          toolModeRef.current = "select";
          setToolModeUi("select");
          applyToolModeToGraph(graph, "select", { readOnly: readOnlyRef.current, host });
          onDirtyRef.current?.();
          onShapePlacedRef.current?.();
          evt.preventDefault?.();
          return;
        }

        if (mode === "connector" || mode === "arrow") {
          connectingRef.current = true;
        }

        if (mode !== "pen" && mode !== "brush" && mode !== "eraser") return;
        if (mode === "eraser") {
          const cell = me.getCell();
          if (cell?.isVertex() && parseKindFromValue(cell.getValue()) === "freehand") {
            graph.removeCells([cell]);
            onDirtyRef.current?.();
          }
          return;
        }
        freehandDrawingRef.current = true;
        freehandPtsRef.current = [];
        setStrokePreview(null);
        const pt = clientToGraph(graph, host, evt.clientX, evt.clientY);
        freehandPtsRef.current.push({ x: pt.x, y: pt.y, pressure: 0.5 });
        me.getEvent().preventDefault?.();
        // Prevent maxGraph selection on pen down
        InternalEvent.consume(me.getEvent());
      },
      mouseUp: () => {
        connectingRef.current = false;
        if (!freehandDrawingRef.current) return;
        freehandDrawingRef.current = false;
        setStrokePreview(null);
        const pts = freehandPtsRef.current;
        freehandPtsRef.current = [];
        if (pts.length < 2) return;
        const mode = toolModeRef.current;
        const brush = mode === "brush" ? "brush" : "pen";
        const style = { ...penStyleRef.current, brush };
        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);
        const pad = style.size + 4;
        const minX = Math.min(...xs) - pad;
        const minY = Math.min(...ys) - pad;
        const maxX = Math.max(...xs) + pad;
        const maxY = Math.max(...ys) + pad;
        const relPts = pts.map(
          (p) => [p.x - minX, p.y - minY, p.pressure ?? 0.5] as [number, number, number]
        );
        const payload = JSON.stringify({
          kind: "freehand",
          label: "",
          freehand: {
            points: relPts,
            size: style.size,
            color: style.color,
            opacity: style.opacity,
            brush,
          },
        });
        graph.getDataModel().beginUpdate();
        try {
          const cell = graph.insertVertex({
            parent: graph.getDefaultParent(),
            id: crypto.randomUUID(),
            value: payload,
            position: [minX, minY],
            size: [Math.max(8, maxX - minX), Math.max(8, maxY - minY)],
            style: {
              shape: CUSTOM_SHAPE.freehand,
              fillColor: "none",
              strokeColor: style.color,
              strokeWidth: Math.max(1, style.size),
              opacity: Math.round(style.opacity * 100),
              fontSize: 1,
              fontColor: "none",
              diagramKind: "freehand",
            } as CellStyle,
          });
          graph.setSelectionCells([]);
          void cell;
        } finally {
          graph.getDataModel().endUpdate();
        }
        onDirtyRef.current?.();
      },
      mouseMove: (_sender: unknown, me: { getCell: () => Cell | null; getEvent: () => MouseEvent }) => {
        if (readOnlyRef.current) return;
        if (freehandDrawingRef.current) {
          const evt = me.getEvent();
          const pt = clientToGraph(graph, host, evt.clientX, evt.clientY);
          freehandPtsRef.current.push({ x: pt.x, y: pt.y, pressure: 0.5 });
          const pts = freehandPtsRef.current;
          if (pts.length >= 2) {
            const style = penStyleRef.current;
            const xs = pts.map((p) => p.x);
            const ys = pts.map((p) => p.y);
            const pad = style.size + 4;
            const minX = Math.min(...xs) - pad;
            const minY = Math.min(...ys) - pad;
            const maxX = Math.max(...xs) + pad;
            const maxY = Math.max(...ys) + pad;
            const rel = pts.map((p) => ({
              x: p.x - minX,
              y: p.y - minY,
              pressure: p.pressure,
            }));
            const d =
              rel.length < 2
                ? ""
                : `M ${rel[0]!.x.toFixed(2)} ${rel[0]!.y.toFixed(2)}` +
                  rel
                    .slice(1)
                    .map((p) => ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
                    .join("");
            const scale = graph.getView().getScale();
            const tr = graph.getView().getTranslate();
            const vbW = Math.max(1, maxX - minX);
            const vbH = Math.max(1, maxY - minY);
            setStrokePreview({
              d,
              color: style.color,
              opacity: style.opacity,
              size: style.size,
              left: (minX + tr.x) * scale,
              top: (minY + tr.y) * scale,
              width: vbW * scale,
              height: vbH * scale,
              vbW,
              vbH,
            });
          }
          return;
        }
        if (paletteDirRef.current) return;
        const mode = toolModeRef.current;
        if (mode !== "select" && mode !== "connector" && mode !== "arrow") {
          setHoverUi(null);
          setPaletteDir(null);
          return;
        }
        // In connector mode, only show waypoints while hovering a vertex (or connecting)
        if ((mode === "connector" || mode === "arrow") && !connectingRef.current) {
          const cell = me.getCell();
          if (cell?.isVertex()) updateHoverFromCell(cell);
          else {
            setHoverUi(null);
            setPaletteDir(null);
          }
          return;
        }
        if (mode !== "select") return;
        const cell = me.getCell();
        if (cell?.isVertex()) updateHoverFromCell(cell);
        else if (!graph.getSelectionCells().some((c) => c.isVertex())) {
          setHoverUi(null);
          setPaletteDir(null);
        }
      },
    };
    graph.addMouseListener(mouseListener as never);

    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      if (e.deltaY < 0) graph.zoomIn();
      else graph.zoomOut();
      onZoomChange?.(graph.getView().getScale());
    };
    host.addEventListener("wheel", onWheel, { passive: false });

    graphRef.current = graph;
    undoRef.current = undo;

    return () => {
      host.removeEventListener("wheel", onWheel);
      graph.removeMouseListener(mouseListener as never);
      if (flowTimerRef.current) {
        clearInterval(flowTimerRef.current);
        flowTimerRef.current = null;
      }
      graph.destroy();
      graphRef.current = null;
      undoRef.current = null;
    };
    // intentionally mount once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.setGridEnabled(settings?.grid !== false);
    graph.setGridSize(settings?.gridSize ?? 10);
    graph.setConnectable(!readOnly);
    graph.setCellsEditable(!readOnly);
    graph.setCellsResizable(!readOnly);
    graph.setCellsMovable(!readOnly);
    const selectionHandler = graph.getPlugin("SelectionHandler") as SelectionHandler | null;
    if (selectionHandler) {
      selectionHandler.guidesEnabled = settings?.guides !== false;
    }
    if (paperRef.current) {
      const paper = settings?.paper ?? "a4-portrait";
      const size =
        paper === "custom"
          ? {
              w: settings?.pageWidth ?? PAPER_SIZES["a4-portrait"].w,
              h: settings?.pageHeight ?? PAPER_SIZES["a4-portrait"].h,
            }
          : PAPER_SIZES[paper as keyof typeof PAPER_SIZES] ?? PAPER_SIZES["a4-portrait"];
      paperRef.current.style.width = `${size.w}px`;
      paperRef.current.style.height = `${size.h}px`;
      paperRef.current.style.background = settings?.background ?? "#ffffff";
      paperRef.current.style.display = settings?.pageView === false ? "none" : "block";
    }
    if (settings?.connectionArrows === false) {
      setHoverUi(null);
      setPaletteDir(null);
    }
  }, [settings, readOnly]);

  const insertConnected = useCallback(
    (fromCellId: string, dir: Dir, shapeName: string) => {
      const graph = graphRef.current;
      if (!graph || readOnlyRef.current) return;
      const source = graph.getDataModel().getCell(fromCellId);
      if (!source?.isVertex()) return;
      const geo = source.getGeometry();
      if (!geo) return;
      const meta = DIR_EXIT[dir];
      const qs = QUICK_SHAPES.find((s) => s.shape === shapeName) ?? QUICK_SHAPES[1]!;
      const w = qs.w;
      const h = qs.h;
      const x = geo.x + (geo.width - w) / 2 + meta.dx;
      const y = geo.y + (geo.height - h) / 2 + meta.dy;
      const parent = graph.getDefaultParent();
      const style: CellStyle = {
        shape:
          shapeName === "diamond"
            ? "rhombus"
            : shapeName === "arrow"
              ? "arrow"
              : (shapeName as CellStyle["shape"]),
        fillColor: "#dae8fc",
        strokeColor: "#6c8ebf",
        strokeWidth: 1.5,
        fontSize: 12,
        fontColor: "#333333",
        whiteSpace: "wrap",
      };
      graph.getDataModel().beginUpdate();
      try {
        const target = graph.insertVertex({
          parent,
          id: crypto.randomUUID(),
          value: "",
          position: [x, y],
          size: [w, h],
          style,
        });
        graph.insertEdge({
          parent,
          id: crypto.randomUUID(),
          value: "",
          source,
          target,
          style: {
            edgeStyle: "orthogonalEdgeStyle",
            endArrow: "classic",
            strokeColor: "#64748b",
            strokeWidth: 1.5,
            rounded: true,
            exitX: meta.exitX,
            exitY: meta.exitY,
            entryX: meta.entryX,
            entryY: meta.entryY,
          },
        });
        graph.setSelectionCell(target);
      } finally {
        graph.getDataModel().endUpdate();
      }
      onDirty?.();
      setPaletteDir(null);
      updateHoverFromCell(graph.getSelectionCell());
    },
    [onDirty, updateHoverFromCell]
  );

  useImperativeHandle(ref, () => ({
    getGraph: () => graphRef.current,
    loadPage: (page) => {
      const graph = graphRef.current;
      if (!graph) return;
      dirtySkip.current = true;
      toMaxGraph(graph, page);
      dirtySkip.current = false;
      emitSelection();
    },
    serializePage: (meta) => {
      const graph = graphRef.current;
      if (!graph) return null;
      return fromMaxGraph(graph, meta);
    },
    addShape: (def, at) => {
      const graph = graphRef.current;
      if (!graph || readOnly) return;
      const parent = graph.getDefaultParent();
      const w = def.w ?? 120;
      const h = def.h ?? 60;
      const x = at?.x ?? 80 + Math.random() * 40;
      const y = at?.y ?? 80 + Math.random() * 40;
      const mapped = shapeToMaxStyle(def.shape);
      const style: CellStyle = {
        ...mapped,
        fillColor: mapped.fillColor ?? "#dae8fc",
        strokeColor: mapped.strokeColor ?? "#6c8ebf",
        strokeWidth: 1.5,
        fontSize: 12,
        fontColor: "#333333",
        whiteSpace: "wrap",
      };
      graph.insertVertex({
        parent,
        id: crypto.randomUUID(),
        value: def.label === "Text" || def.shape === "text" ? "Text" : "",
        position: [x, y],
        size: [w, h],
        style,
      });
      onDirty?.();
    },
    addConnectedShape: (fromCellId, dir, shape) => {
      insertConnected(fromCellId, dir, shape);
    },
    deleteSelection: () => {
      const graph = graphRef.current;
      if (!graph || readOnly) return;
      graph.removeCells(graph.getSelectionCells());
      onDirty?.();
    },
    undo: () => undoRef.current?.undo(),
    redo: () => undoRef.current?.redo(),
    canUndo: () => Boolean(undoRef.current?.canUndo()),
    canRedo: () => Boolean(undoRef.current?.canRedo()),
    zoomIn: () => {
      graphRef.current?.zoomIn();
      onZoomChange?.(graphRef.current?.getView().getScale() ?? 1);
    },
    zoomOut: () => {
      graphRef.current?.zoomOut();
      onZoomChange?.(graphRef.current?.getView().getScale() ?? 1);
    },
    setZoom: (factor) => {
      graphRef.current?.getView().setScale(factor);
      onZoomChange?.(factor);
    },
    getZoom: () => graphRef.current?.getView().getScale() ?? 1,
    bringToFront: () => {
      const graph = graphRef.current;
      if (!graph) return;
      graph.orderCells(false, graph.getSelectionCells());
      onDirty?.();
    },
    sendToBack: () => {
      const graph = graphRef.current;
      if (!graph) return;
      graph.orderCells(true, graph.getSelectionCells());
      onDirty?.();
    },
    selectAll: () => {
      const graph = graphRef.current;
      if (!graph) return;
      graph.selectAll(graph.getDefaultParent());
    },
    clearSelection: () => graphRef.current?.clearSelection(),
    applyStyle: (patch) => {
      const graph = graphRef.current;
      if (!graph || readOnly) return;
      const cells = graph.getSelectionCells();
      if (!cells.length) return;
      graph.getDataModel().beginUpdate();
      try {
        for (const cell of cells) {
          const next = { ...(cell.getStyle() ?? {}), ...patch };
          graph.getDataModel().setStyle(cell, next);
        }
      } finally {
        graph.getDataModel().endUpdate();
      }
      emitSelection();
      onDirty?.();
    },
    align: (dir) => {
      const graph = graphRef.current;
      if (!graph || readOnly) return;
      const cells = graph.getSelectionCells().filter((c) => c.isVertex());
      if (cells.length < 2) return;
      const geos = cells.map((c) => c.getGeometry()!).filter(Boolean);
      graph.getDataModel().beginUpdate();
      try {
        if (dir === "left") {
          const min = Math.min(...geos.map((g) => g.x));
          cells.forEach((c, i) => {
            const g = geos[i].clone();
            g.x = min;
            graph.getDataModel().setGeometry(c, g);
          });
        } else if (dir === "right") {
          const max = Math.max(...geos.map((g) => g.x + g.width));
          cells.forEach((c, i) => {
            const g = geos[i].clone();
            g.x = max - g.width;
            graph.getDataModel().setGeometry(c, g);
          });
        } else if (dir === "center") {
          const cx =
            (Math.min(...geos.map((g) => g.x)) + Math.max(...geos.map((g) => g.x + g.width))) / 2;
          cells.forEach((c, i) => {
            const g = geos[i].clone();
            g.x = cx - g.width / 2;
            graph.getDataModel().setGeometry(c, g);
          });
        } else if (dir === "top") {
          const min = Math.min(...geos.map((g) => g.y));
          cells.forEach((c, i) => {
            const g = geos[i].clone();
            g.y = min;
            graph.getDataModel().setGeometry(c, g);
          });
        } else if (dir === "bottom") {
          const max = Math.max(...geos.map((g) => g.y + g.height));
          cells.forEach((c, i) => {
            const g = geos[i].clone();
            g.y = max - g.height;
            graph.getDataModel().setGeometry(c, g);
          });
        } else if (dir === "middle") {
          const cy =
            (Math.min(...geos.map((g) => g.y)) + Math.max(...geos.map((g) => g.y + g.height))) / 2;
          cells.forEach((c, i) => {
            const g = geos[i].clone();
            g.y = cy - g.height / 2;
            graph.getDataModel().setGeometry(c, g);
          });
        }
      } finally {
        graph.getDataModel().endUpdate();
      }
      onDirty?.();
    },
    distribute: (axis) => {
      const graph = graphRef.current;
      if (!graph || readOnly) return;
      const cells = graph
        .getSelectionCells()
        .filter((c) => c.isVertex())
        .sort((a, b) => {
          const ga = a.getGeometry()!;
          const gb = b.getGeometry()!;
          return axis === "h" ? ga.x - gb.x : ga.y - gb.y;
        });
      if (cells.length < 3) return;
      const first = cells[0].getGeometry()!;
      const last = cells[cells.length - 1].getGeometry()!;
      graph.getDataModel().beginUpdate();
      try {
        if (axis === "h") {
          const span = last.x - first.x;
          const step = span / (cells.length - 1);
          cells.forEach((c, i) => {
            if (i === 0 || i === cells.length - 1) return;
            const g = c.getGeometry()!.clone();
            g.x = first.x + step * i;
            graph.getDataModel().setGeometry(c, g);
          });
        } else {
          const span = last.y - first.y;
          const step = span / (cells.length - 1);
          cells.forEach((c, i) => {
            if (i === 0 || i === cells.length - 1) return;
            const g = c.getGeometry()!.clone();
            g.y = first.y + step * i;
            graph.getDataModel().setGeometry(c, g);
          });
        }
      } finally {
        graph.getDataModel().endUpdate();
      }
      onDirty?.();
    },
    autoLayout: () => {
      const graph = graphRef.current;
      if (!graph || readOnly) return;
      const layout = new HierarchicalLayout(graph);
      layout.orientation = "north";
      layout.intraCellSpacing = 40;
      layout.interRankCellSpacing = 60;
      graph.getDataModel().beginUpdate();
      try {
        layout.execute(graph.getDefaultParent());
      } finally {
        graph.getDataModel().endUpdate();
      }
      onDirty?.();
    },
    copy: () => {
      const graph = graphRef.current;
      if (!graph) return;
      Clipboard.copy(graph, graph.getSelectionCells());
    },
    cut: () => {
      const graph = graphRef.current;
      if (!graph || readOnly) return;
      Clipboard.cut(graph, graph.getSelectionCells());
      onDirty?.();
    },
    paste: () => {
      const graph = graphRef.current;
      if (!graph || readOnly) return;
      Clipboard.paste(graph);
      onDirty?.();
    },
    duplicate: () => {
      const graph = graphRef.current;
      if (!graph || readOnly) return;
      const cells = graph.getSelectionCells();
      if (!cells.length) return;
      Clipboard.copy(graph, cells);
      Clipboard.paste(graph);
      onDirty?.();
    },
    nudge: (dx, dy) => {
      const graph = graphRef.current;
      if (!graph || readOnly) return;
      const cells = graph.getSelectionCells().filter((c) => c.isVertex());
      if (!cells.length) return;
      graph.getDataModel().beginUpdate();
      try {
        for (const c of cells) {
          const g = c.getGeometry()?.clone();
          if (!g) continue;
          g.x += dx;
          g.y += dy;
          graph.getDataModel().setGeometry(c, g);
        }
      } finally {
        graph.getDataModel().endUpdate();
      }
      onDirty?.();
    },
    setReadOnly: (ro) => {
      const graph = graphRef.current;
      if (!graph) return;
      graph.setConnectable(!ro);
      graph.setCellsEditable(!ro);
      graph.setCellsResizable(!ro);
      graph.setCellsMovable(!ro);
    },
    runLayout: (kind) => {
      const graph = graphRef.current;
      if (!graph || readOnly) return;
      const parent = graph.getDefaultParent();
      graph.getDataModel().beginUpdate();
      try {
        if (kind === "vertical-flow" || kind === "horizontal-flow") {
          const layout = new HierarchicalLayout(graph);
          layout.orientation = kind === "horizontal-flow" ? "west" : "north";
          layout.intraCellSpacing = 40;
          layout.interRankCellSpacing = 60;
          layout.execute(parent);
        } else if (kind === "vertical-tree" || kind === "horizontal-tree") {
          const layout = new CompactTreeLayout(graph, kind === "horizontal-tree");
          layout.execute(parent);
        } else if (kind === "radial") {
          const layout = new RadialTreeLayout(graph);
          layout.execute(parent);
        } else if (kind === "organic") {
          const layout = new FastOrganicLayout(graph);
          layout.execute(parent);
        } else if (kind === "circle") {
          const layout = new CircleLayout(graph);
          layout.execute(parent);
        } else if (kind === "orthogonal") {
          try {
            const parallel = new ParallelEdgeLayout(graph);
            parallel.execute(parent);
          } catch {
            /* optional */
          }
          const edges = graph.getChildEdges(parent);
          for (const edge of edges) {
            const style = { ...(edge.getStyle() ?? {}), edgeStyle: "orthogonalEdgeStyle", rounded: true };
            graph.getDataModel().setStyle(edge, style);
          }
        }
      } finally {
        graph.getDataModel().endUpdate();
      }
      onDirty?.();
    },
    magicCleanup: () => {
      const graph = graphRef.current;
      if (!graph || readOnly) return;
      const grid = graph.getGridSize() || 10;
      const parent = graph.getDefaultParent();
      const vertices = graph.getChildVertices(parent);
      graph.getDataModel().beginUpdate();
      try {
        // Snap to grid
        for (const cell of vertices) {
          const g = cell.getGeometry()?.clone();
          if (!g) continue;
          g.x = snapToGrid(g.x, grid);
          g.y = snapToGrid(g.y, grid);
          g.width = snapToGrid(g.width, grid) || g.width;
          g.height = snapToGrid(g.height, grid) || g.height;
          graph.getDataModel().setGeometry(cell, g);
        }
        // Normalize widths of similar shapes (same shape + similar height)
        const buckets = new Map<string, Cell[]>();
        for (const cell of vertices) {
          const style = cell.getStyle() ?? {};
          const g = cell.getGeometry();
          if (!g) continue;
          const key = `${style.shape ?? "rectangle"}:${Math.round(g.height / 10) * 10}`;
          const list = buckets.get(key) ?? [];
          list.push(cell);
          buckets.set(key, list);
        }
        for (const list of buckets.values()) {
          if (list.length < 2) continue;
          const widths = list.map((c) => c.getGeometry()!.width);
          const avg = widths.reduce((a, b) => a + b, 0) / widths.length;
          const target = snapToGrid(avg, grid) || avg;
          for (const cell of list) {
            const g = cell.getGeometry()!.clone();
            if (Math.abs(g.width - target) < 40) {
              g.width = target;
              graph.getDataModel().setGeometry(cell, g);
            }
          }
        }
        const layout = new HierarchicalLayout(graph);
        layout.orientation = "north";
        layout.intraCellSpacing = 40;
        layout.interRankCellSpacing = 60;
        layout.execute(parent);
        try {
          new ParallelEdgeLayout(graph).execute(parent);
        } catch {
          /* optional */
        }
      } finally {
        graph.getDataModel().endUpdate();
      }
      onDirty?.();
    },
    insertTable: (rows, cols, opts) => {
      const graph = graphRef.current;
      if (!graph || readOnly) return;
      const r = Math.max(1, Math.min(20, rows));
      const c = Math.max(1, Math.min(20, cols));
      const cellW = 80;
      const cellH = 28;
      const titleH = opts?.title ? 32 : 0;
      const pad = 8;
      const w = c * cellW + pad * 2;
      const h = titleH + r * cellH + pad * 2;
      const x = 80 + Math.random() * 40;
      const y = 80 + Math.random() * 40;
      const cells = [];
      for (let ri = 0; ri < r; ri++) {
        for (let ci = 0; ci < c; ci++) {
          cells.push({ r: ri, c: ci, text: ri === 0 ? `Col ${ci + 1}` : "" });
        }
      }
      const title = opts?.title ? "Table" : "";
      const payload = JSON.stringify({
        kind: "table",
        label: title,
        table: { rows: r, cols: c, cells },
        container: opts?.container ? { title: "Table", childIds: [] } : undefined,
      });
      graph.getDataModel().beginUpdate();
      try {
        const parent = graph.getDefaultParent();
        const vertex = graph.insertVertex({
          parent,
          id: crypto.randomUUID(),
          value: payload,
          position: [x, y],
          size: [w, Math.max(h, 60)],
          style: {
            shape: opts?.container ? "swimlane" : "rectangle",
            rounded: false,
            fillColor: "#ffffff",
            strokeColor: "#6c8ebf",
            strokeWidth: 1.5,
            fontSize: 11,
            fontColor: "#334155",
            align: "left",
            verticalAlign: "top",
            whiteSpace: "wrap",
            overflow: "fill",
            spacing: 4,
            editable: false,
            startSize: opts?.title || opts?.container ? 28 : undefined,
            diagramKind: "table",
          } as CellStyle,
        });
        graph.setSelectionCell(vertex);
      } finally {
        graph.getDataModel().endUpdate();
      }
      onDirty?.();
    },
    insertContainer: (title = "Container") => {
      const graph = graphRef.current;
      if (!graph || readOnly) return;
      const payload = JSON.stringify({
        kind: "container",
        label: title,
        container: { title, collapsed: false, childIds: [] },
      });
      graph.getDataModel().beginUpdate();
      try {
        const cell = graph.insertVertex({
          parent: graph.getDefaultParent(),
          id: crypto.randomUUID(),
          value: payload,
          position: [100 + Math.random() * 40, 100 + Math.random() * 40],
          size: [280, 180],
          style: {
            shape: "swimlane",
            startSize: 28,
            fillColor: "#f8fafc",
            strokeColor: "#64748b",
            strokeWidth: 1.5,
            fontSize: 12,
            fontColor: "#0f172a",
            fontStyle: 1,
            whiteSpace: "wrap",
            diagramKind: "container",
          } as CellStyle,
        });
        graph.setSelectionCell(cell);
      } finally {
        graph.getDataModel().endUpdate();
      }
      onDirty?.();
    },
    insertFreehand: (points, style) => {
      const graph = graphRef.current;
      if (!graph || readOnly || !points.length) return;
      const xs = points.map((p) => p[0]);
      const ys = points.map((p) => p[1]);
      const pad = style.size + 4;
      const minX = Math.min(...xs) - pad;
      const minY = Math.min(...ys) - pad;
      const maxX = Math.max(...xs) + pad;
      const maxY = Math.max(...ys) + pad;
      const relPts = points.map((p) => {
        if (p.length >= 3) return [p[0]! - minX, p[1]! - minY, p[2]!] as [number, number, number];
        return [p[0]! - minX, p[1]! - minY] as [number, number];
      });
      const payload = JSON.stringify({
        kind: "freehand",
        label: "",
        freehand: {
          points: relPts,
          size: style.size,
          color: style.color,
          opacity: style.opacity,
          brush: style.brush,
        },
      });
      graph.insertVertex({
        parent: graph.getDefaultParent(),
        id: crypto.randomUUID(),
        value: payload,
        position: [minX, minY],
        size: [Math.max(8, maxX - minX), Math.max(8, maxY - minY)],
        style: {
          shape: CUSTOM_SHAPE.freehand,
          fillColor: "none",
          strokeColor: style.color,
          strokeWidth: Math.max(1, style.size),
          opacity: Math.round(style.opacity * 100),
          fontSize: 1,
          fontColor: "none",
          diagramKind: "freehand",
        } as CellStyle,
      });
      onDirty?.();
    },
    setToolMode: (mode) => {
      toolModeRef.current = mode;
      setToolModeUi(mode);
      const graph = graphRef.current;
      if (!graph) return;
      applyToolModeToGraph(graph, mode, { readOnly: readOnlyRef.current, host: hostRef.current });
      if (mode !== "select") {
        setPaletteDir(null);
      }
      if (mode !== "select" && mode !== "connector" && mode !== "arrow") {
        setHoverUi(null);
        setPaletteDir(null);
      }
      if (mode === "connector" || mode === "arrow") {
        applyDefaultEdgeStyle(graph, defaultEdgeStyleRef.current);
      }
    },
    setPendingShape: (shape) => {
      pendingShapeRef.current = shape;
    },
    setDefaultEdgeStyle: (style) => {
      defaultEdgeStyleRef.current = style;
      const graph = graphRef.current;
      if (graph) applyDefaultEdgeStyle(graph, style);
    },
    setPenStyle: (style) => {
      penStyleRef.current = {
        size: style.size,
        color: style.color,
        opacity: style.opacity,
        brush: style.brush ?? penStyleRef.current.brush,
      };
    },
    focusNodes: (ids) => {
      const graph = graphRef.current;
      if (!graph || !ids.length) return;
      const cells = ids
        .map((id) => graph.getDataModel().getCell(id))
        .filter((c): c is Cell => Boolean(c));
      if (!cells.length) return;
      graph.setSelectionCells(cells);
      graph.scrollCellToVisible(cells[0]!);
    },
    setFocusMode: (on, seedIds) => {
      const graph = graphRef.current;
      if (!graph) return;
      focusModeRef.current = on;
      focusSeedRef.current = seedIds ?? [];
      const parent = graph.getDefaultParent();
      const vertices = graph.getChildVertices(parent);
      const edges = graph.getChildEdges(parent);
      if (!on) {
        graph.getDataModel().beginUpdate();
        try {
          for (const cell of [...vertices, ...edges]) {
            const style = { ...(cell.getStyle() ?? {}), opacity: 100 };
            graph.getDataModel().setStyle(cell, style);
          }
        } finally {
          graph.getDataModel().endUpdate();
        }
        return;
      }
      const seeds = new Set(seedIds ?? []);
      if (!seeds.size) {
        for (const c of graph.getSelectionCells()) {
          const id = c.getId();
          if (id) seeds.add(id);
        }
      }
      const highlight = new Set(seeds);
      for (const edge of edges) {
        const s = edge.getTerminal(true)?.getId();
        const t = edge.getTerminal(false)?.getId();
        if (s && seeds.has(s)) {
          highlight.add(s);
          if (t) highlight.add(t);
          highlight.add(edge.getId() || "");
        } else if (t && seeds.has(t)) {
          highlight.add(t);
          if (s) highlight.add(s);
          highlight.add(edge.getId() || "");
        }
      }
      graph.getDataModel().beginUpdate();
      try {
        for (const cell of [...vertices, ...edges]) {
          const id = cell.getId() || "";
          const opacity = highlight.has(id) ? 100 : 20;
          graph.getDataModel().setStyle(cell, { ...(cell.getStyle() ?? {}), opacity });
        }
      } finally {
        graph.getDataModel().endUpdate();
      }
    },
    playFlow: () => {
      const graph = graphRef.current;
      if (!graph) return;
      if (flowTimerRef.current) clearInterval(flowTimerRef.current);
      const edges = graph.getChildEdges(graph.getDefaultParent());
      flowEdgesRef.current = edges;
      flowOrigStylesRef.current = new Map(
        edges.map((e) => [e.getId() || "", { ...(e.getStyle() ?? {}) }])
      );
      if (!edges.length) return;
      const tick = () => {
        const g = graphRef.current;
        if (!g) return;
        const list = flowEdgesRef.current;
        if (!list.length) return;
        // reset previous
        for (const e of list) {
          const id = e.getId() || "";
          const orig = flowOrigStylesRef.current.get(id);
          if (orig) g.getDataModel().setStyle(e, { ...orig });
        }
        const idx = flowIndexRef.current % list.length;
        const edge = list[idx]!;
        const style = {
          ...(edge.getStyle() ?? {}),
          strokeColor: "#2563eb",
          strokeWidth: 3,
        };
        g.getDataModel().setStyle(edge, style);
        flowIndexRef.current = idx + 1;
        if (flowIndexRef.current >= list.length) flowIndexRef.current = 0;
      };
      tick();
      const ms = Math.max(150, 800 / flowSpeedRef.current);
      flowTimerRef.current = setInterval(tick, ms);
    },
    pauseFlow: () => {
      if (flowTimerRef.current) {
        clearInterval(flowTimerRef.current);
        flowTimerRef.current = null;
      }
    },
    restartFlow: () => {
      flowIndexRef.current = 0;
      const graph = graphRef.current;
      if (graph) {
        for (const e of flowEdgesRef.current) {
          const id = e.getId() || "";
          const orig = flowOrigStylesRef.current.get(id);
          if (orig) graph.getDataModel().setStyle(e, { ...orig });
        }
      }
      if (flowTimerRef.current) {
        clearInterval(flowTimerRef.current);
        flowTimerRef.current = null;
      }
      const g = graphRef.current;
      if (!g) return;
      const edges = g.getChildEdges(g.getDefaultParent());
      flowEdgesRef.current = edges;
      flowOrigStylesRef.current = new Map(
        edges.map((e) => [e.getId() || "", { ...(e.getStyle() ?? {}) }])
      );
      const tick = () => {
        const graph2 = graphRef.current;
        if (!graph2) return;
        const list = flowEdgesRef.current;
        for (const e of list) {
          const id = e.getId() || "";
          const orig = flowOrigStylesRef.current.get(id);
          if (orig) graph2.getDataModel().setStyle(e, { ...orig });
        }
        if (!list.length) return;
        const idx = flowIndexRef.current % list.length;
        const edge = list[idx]!;
        graph2.getDataModel().setStyle(edge, {
          ...(edge.getStyle() ?? {}),
          strokeColor: "#2563eb",
          strokeWidth: 3,
        });
        flowIndexRef.current = (idx + 1) % list.length;
      };
      tick();
      flowTimerRef.current = setInterval(tick, Math.max(150, 800 / flowSpeedRef.current));
    },
    stepFlow: () => {
      const graph = graphRef.current;
      if (!graph) return;
      if (flowTimerRef.current) {
        clearInterval(flowTimerRef.current);
        flowTimerRef.current = null;
      }
      let list = flowEdgesRef.current;
      if (!list.length) {
        list = graph.getChildEdges(graph.getDefaultParent());
        flowEdgesRef.current = list;
        flowOrigStylesRef.current = new Map(
          list.map((e) => [e.getId() || "", { ...(e.getStyle() ?? {}) }])
        );
      }
      if (!list.length) return;
      for (const e of list) {
        const id = e.getId() || "";
        const orig = flowOrigStylesRef.current.get(id);
        if (orig) graph.getDataModel().setStyle(e, { ...orig });
      }
      const idx = flowIndexRef.current % list.length;
      const edge = list[idx]!;
      graph.getDataModel().setStyle(edge, {
        ...(edge.getStyle() ?? {}),
        strokeColor: "#2563eb",
        strokeWidth: 3,
      });
      flowIndexRef.current = (idx + 1) % list.length;
    },
    stepFlowBack: () => {
      const graph = graphRef.current;
      if (!graph) return;
      if (flowTimerRef.current) {
        clearInterval(flowTimerRef.current);
        flowTimerRef.current = null;
      }
      let list = flowEdgesRef.current;
      if (!list.length) {
        list = graph.getChildEdges(graph.getDefaultParent());
        flowEdgesRef.current = list;
        flowOrigStylesRef.current = new Map(
          list.map((e) => [e.getId() || "", { ...(e.getStyle() ?? {}) }])
        );
      }
      if (!list.length) return;
      for (const e of list) {
        const id = e.getId() || "";
        const orig = flowOrigStylesRef.current.get(id);
        if (orig) graph.getDataModel().setStyle(e, { ...orig });
      }
      // flowIndex points to *next* after last highlight; step back twice worth of logic:
      // go to previous highlight index
      const nextIdx = flowIndexRef.current % list.length;
      const prevIdx = (nextIdx - 2 + list.length * 2) % list.length;
      const edge = list[prevIdx]!;
      graph.getDataModel().setStyle(edge, {
        ...(edge.getStyle() ?? {}),
        strokeColor: "#2563eb",
        strokeWidth: 3,
      });
      flowIndexRef.current = (prevIdx + 1) % list.length;
    },
    setFlowSpeed: (s) => {
      flowSpeedRef.current = Math.max(0.25, Math.min(3, s));
      if (flowTimerRef.current) {
        clearInterval(flowTimerRef.current);
        const tick = () => {
          const g = graphRef.current;
          if (!g) return;
          const list = flowEdgesRef.current;
          for (const e of list) {
            const id = e.getId() || "";
            const orig = flowOrigStylesRef.current.get(id);
            if (orig) g.getDataModel().setStyle(e, { ...orig });
          }
          if (!list.length) return;
          const idx = flowIndexRef.current % list.length;
          const edge = list[idx]!;
          g.getDataModel().setStyle(edge, {
            ...(edge.getStyle() ?? {}),
            strokeColor: "#2563eb",
            strokeWidth: 3,
          });
          flowIndexRef.current = (idx + 1) % list.length;
        };
        flowTimerRef.current = setInterval(tick, Math.max(150, 800 / flowSpeedRef.current));
      }
    },
    getSelectionBounds: () => {
      const graph = graphRef.current;
      const root = rootRef.current;
      if (!graph || !root) return null;
      const cells = graph.getSelectionCells().filter((c) => c.isVertex());
      if (!cells.length) return null;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const cell of cells) {
        const state = graph.getView().getState(cell);
        if (!state) continue;
        minX = Math.min(minX, state.x);
        minY = Math.min(minY, state.y);
        maxX = Math.max(maxX, state.x + state.width);
        maxY = Math.max(maxY, state.y + state.height);
      }
      if (!Number.isFinite(minX)) return null;
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    },
    lockSelection: (locked) => {
      const graph = graphRef.current;
      if (!graph || readOnly) return;
      const cells = graph.getSelectionCells();
      graph.getDataModel().beginUpdate();
      try {
        for (const cell of cells) {
          const style = {
            ...(cell.getStyle() ?? {}),
            diagramLocked: locked ? "1" : "0",
          } as CellStyle;
          graph.getDataModel().setStyle(cell, style);
          cell.setConnectable(!locked);
          if (locked) {
            // prevent move via style editable flag when possible
            (style as Record<string, unknown>).movable = false;
          }
        }
      } finally {
        graph.getDataModel().endUpdate();
      }
      onDirty?.();
    },
    groupSelection: () => {
      const graph = graphRef.current;
      if (!graph || readOnly) return;
      const cells = graph.getSelectionCells().filter((c) => c.isVertex());
      if (cells.length < 2) return;
      try {
        const group = graph.groupCells(null as unknown as Cell, 8, cells);
        graph.setSelectionCell(group);
        onDirty?.();
      } catch {
        /* grouping may fail without group cell */
      }
    },
    ungroupSelection: () => {
      const graph = graphRef.current;
      if (!graph || readOnly) return;
      try {
        const cells = graph.ungroupCells(graph.getSelectionCells());
        if (cells?.length) graph.setSelectionCells(cells);
        onDirty?.();
      } catch {
        /* ignore */
      }
    },
  }));

  const paper = settings?.paper ?? "a4-portrait";
  const size =
    paper === "custom"
      ? {
          w: settings?.pageWidth ?? PAPER_SIZES["a4-portrait"].w,
          h: settings?.pageHeight ?? PAPER_SIZES["a4-portrait"].h,
        }
      : PAPER_SIZES[paper as keyof typeof PAPER_SIZES] ?? PAPER_SIZES["a4-portrait"];

  return (
    <div
      ref={rootRef}
      className={cn("diagram-canvas-root relative h-full w-full overflow-auto bg-[#e5e7eb]", className)}
    >
      <div
        ref={paperRef}
        className="pointer-events-none absolute left-10 top-10 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.08)]"
        style={{
          width: size.w,
          height: size.h,
          background: settings?.background ?? "#ffffff",
          backgroundImage:
            settings?.grid === false
              ? "none"
              : `linear-gradient(#cfe2f5 1px, transparent 1px), linear-gradient(90deg, #cfe2f5 1px, transparent 1px)`,
          backgroundSize: `${settings?.gridSize ?? 10}px ${settings?.gridSize ?? 10}px`,
          display: settings?.pageView === false ? "none" : "block",
        }}
        aria-hidden
      />
      <div ref={hostRef} className="absolute inset-0 min-h-full min-w-full" />

      {strokePreview ? (
        <svg
          className="pointer-events-none absolute z-30 overflow-visible"
          style={{
            left: strokePreview.left,
            top: strokePreview.top,
            width: strokePreview.width,
            height: strokePreview.height,
          }}
          viewBox={`0 0 ${strokePreview.vbW} ${strokePreview.vbH}`}
          aria-hidden
        >
          <path
            d={strokePreview.d}
            fill="none"
            stroke={strokePreview.color}
            strokeOpacity={strokePreview.opacity}
            strokeWidth={strokePreview.size}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}

      {hoverUi &&
        !readOnly &&
        (toolModeUi === "select" || toolModeUi === "connector" || toolModeUi === "arrow") &&
        (toolModeUi !== "select" || settings?.connectionArrows !== false) && (
        <div
          className="pointer-events-none absolute z-20"
          style={{
            left: hoverUi.left,
            top: hoverUi.top,
            width: hoverUi.width,
            height: hoverUi.height,
          }}
        >
          {(["n", "e", "s", "w"] as Dir[]).map((dir) => {
            const pos =
              dir === "n"
                ? { left: "50%", top: 0, transform: "translate(-50%, -130%)" }
                : dir === "s"
                  ? { left: "50%", top: "100%", transform: "translate(-50%, 30%)" }
                  : dir === "e"
                    ? { left: "100%", top: "50%", transform: "translate(30%, -50%)" }
                    : { left: 0, top: "50%", transform: "translate(-130%, -50%)" };
            const connectorMode = toolModeUi === "connector" || toolModeUi === "arrow";
            return (
              <button
                key={dir}
                type="button"
                title={connectorMode ? "Connection point" : "Add connected shape"}
                className={cn(
                  "pointer-events-auto absolute flex items-center justify-center shadow-sm",
                  connectorMode
                    ? "size-2.5 rounded-full border-2 border-white bg-[#3b82f6]"
                    : "size-5 rounded-sm bg-[#93c5fd]/80 text-[10px] text-[#1e3a8a] hover:bg-[#60a5fa]"
                )}
                style={pos}
                onMouseEnter={() => {
                  if (!connectorMode) setPaletteDir(dir);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!connectorMode) setPaletteDir(dir);
                }}
              >
                {connectorMode ? null : dir === "n" ? "▲" : dir === "s" ? "▼" : dir === "e" ? "▶" : "◀"}
              </button>
            );
          })}

          {paletteDir && toolModeUi === "select" && (
            <div
              className="pointer-events-auto absolute z-30 flex items-start gap-1"
              style={
                paletteDir === "e" || paletteDir === "n"
                  ? { left: "100%", top: "50%", transform: "translate(28px, -50%)" }
                  : paletteDir === "w"
                    ? { right: "100%", top: "50%", transform: "translate(-28px, -50%)" }
                    : { left: "50%", top: "100%", transform: "translate(-50%, 28px)" }
              }
              onMouseLeave={() => {
                setPaletteDir(null);
                setPaletteHover(null);
              }}
            >
              <div className="flex flex-col gap-0.5 rounded-md border border-[#cbd5e1] bg-[#f1f5f9] p-1 shadow-md">
                {QUICK_SHAPES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    title={s.label}
                    className={cn(
                      "flex size-7 items-center justify-center rounded text-sm text-[#334155] hover:bg-white",
                      paletteHover === s.id && "bg-white ring-1 ring-[#94a3b8]"
                    )}
                    onMouseEnter={() => setPaletteHover(s.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      insertConnected(hoverUi.cellId, paletteDir, s.shape);
                    }}
                  >
                    {s.preview}
                  </button>
                ))}
              </div>
              {paletteHover && (
                <div className="flex size-14 items-center justify-center rounded-md border border-[#cbd5e1] bg-[#f8fafc] text-2xl text-[#64748b] shadow-md">
                  {QUICK_SHAPES.find((s) => s.id === paletteHover)?.preview}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        .diagram-canvas-root .mxGraph { background: transparent !important; }
        .diagram-canvas-root svg { background: transparent; }
      `}</style>
    </div>
  );
});
