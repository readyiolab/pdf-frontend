import {
  useEffect,
  useImperativeHandle,
  useRef,
  forwardRef,
  useCallback,
} from "react";
import {
  Graph,
  RubberBandHandler,
  InternalEvent,
  UndoManager,
  Clipboard,
  HierarchicalLayout,
  getDefaultPlugins,
  StencilShapeConfig,
  type Cell,
  type CellStyle,
} from "@maxgraph/core";
import "@maxgraph/core/css/common.css";
import {
  fromMaxGraph,
  toMaxGraph,
  type DiagramPage,
  type DiagramSettings,
  PAPER_SIZES,
} from "@/lib/diagram/model";
import type { ShapeDef } from "@/lib/diagram/shapes";
import { cn } from "@/lib/utils";

// maxGraph can eval style/stencil strings when allowEval is true. Keep it off
// for production (default is already false; set explicitly for defense).
StencilShapeConfig.allowEval = false;

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
};

type Props = {
  className?: string;
  settings?: DiagramSettings;
  onDirty?: () => void;
  onSelectionChange?: (info: SelectionInfo | null) => void;
  onZoomChange?: (zoom: number) => void;
  readOnly?: boolean;
};

export const DiagramCanvas = forwardRef<DiagramCanvasHandle, Props>(function DiagramCanvas(
  { className, settings, onDirty, onSelectionChange, onZoomChange, readOnly = false },
  ref
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const undoRef = useRef<UndoManager | null>(null);
  const dirtySkip = useRef(false);

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

    const undo = new UndoManager();
    const listener = (_sender: unknown, evt: { getProperty: (k: string) => unknown }) => {
      undo.undoableEditHappened(evt.getProperty("edit") as never);
      if (!dirtySkip.current) onDirty?.();
    };
    graph.getDataModel().addListener(InternalEvent.UNDO, listener as never);
    graph.getView().addListener(InternalEvent.UNDO, listener as never);

    graph.getSelectionModel().addListener(InternalEvent.CHANGE, () => emitSelection());

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
  }, [settings, readOnly]);

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
      const style: CellStyle = {
        shape: def.shape === "rounded" || def.shape === "process" ? "rectangle" : (def.shape as CellStyle["shape"]),
        rounded: def.shape === "rounded" || def.shape === "process",
        fillColor: "#dae8fc",
        strokeColor: "#6c8ebf",
        strokeWidth: 1.5,
        fontSize: 12,
        fontColor: "#333333",
        whiteSpace: "wrap",
      };
      if (def.shape === "diamond" || def.shape === "decision") style.shape = "rhombus";
      if (def.shape === "circle" || def.shape === "terminator") style.shape = "ellipse";
      if (def.shape === "text") {
        style.fillColor = "none";
        style.strokeColor = "none";
      }
      graph.insertVertex({
        parent,
        id: crypto.randomUUID(),
        value: def.label === "Text" ? "Text" : "",
        position: [x, y],
        size: [w, h],
        style,
      });
      onDirty?.();
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
    <div className={cn("diagram-canvas-root relative h-full w-full overflow-auto bg-[#e5e7eb]", className)}>
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
      <style>{`
        .diagram-canvas-root .mxGraph { background: transparent !important; }
        .diagram-canvas-root svg { background: transparent; }
      `}</style>
    </div>
  );
});
