import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

/** Primary drawing / interaction tool (only one active). */
export type DrawingTool =
  | "select"
  | "pan"
  | "pen"
  | "brush"
  | "pencil"
  | "marker"
  | "eraser"
  | "connector"
  | "arrow"
  | "shape-place";

/** @deprecated Use DrawingTool — kept as alias for gradual migration */
export type DiagramTool = DrawingTool | "table" | "text" | "shapes" | "ai" | "layout" | "themes" | "colors" | "export" | "title" | "container";

export type ToolbarMenuId =
  | "shapes"
  | "table"
  | "pen"
  | "connector"
  | "layout"
  | "themes"
  | "colors"
  | "export";

export type PenOptions = { size: number; color: string; opacity: number };
export type TableOptions = {
  rows: number;
  cols: number;
  withTitle: boolean;
  withContainer: boolean;
};

export type ConnectorStylePreset = {
  edgeStyle: "orthogonal" | "straight" | "elbow";
  curved: boolean;
  endArrow: "classic" | "block" | "open" | "oval" | "diamond" | "none";
  startArrow: "classic" | "block" | "open" | "oval" | "diamond" | "none";
};

type DiagramToolsContextValue = {
  activeTool: DrawingTool;
  setActiveTool: Dispatch<SetStateAction<DrawingTool>>;
  setDrawingTool: (tool: DrawingTool, opts?: { keepMenu?: boolean | ToolbarMenuId }) => void;
  openMenu: ToolbarMenuId | null;
  setOpenMenu: (id: ToolbarMenuId | null) => void;
  toggleMenu: (id: ToolbarMenuId) => void;
  closeMenu: () => void;
  pendingShape: string | null;
  setPendingShape: Dispatch<SetStateAction<string | null>>;
  pen: PenOptions;
  setPen: Dispatch<SetStateAction<PenOptions>>;
  brush: PenOptions;
  setBrush: Dispatch<SetStateAction<PenOptions>>;
  eraser: { size: number };
  setEraser: Dispatch<SetStateAction<{ size: number }>>;
  tableOpts: TableOptions;
  setTableOpts: Dispatch<SetStateAction<TableOptions>>;
  connectorStyle: ConnectorStylePreset;
  setConnectorStyle: Dispatch<SetStateAction<ConnectorStylePreset>>;
  colorTarget: "fill" | "stroke";
  setColorTarget: Dispatch<SetStateAction<"fill" | "stroke">>;
  aiOpen: boolean;
  setAiOpen: Dispatch<SetStateAction<boolean>>;
  /** True when a drawing tool that should show the pen strip is active */
  showPenStrip: boolean;
};

const DiagramToolsContext = createContext<DiagramToolsContextValue | null>(null);

const DEFAULT_PEN: PenOptions = { size: 2, color: "#111827", opacity: 1 };
const DEFAULT_BRUSH: PenOptions = { size: 8, color: "#3b82f6", opacity: 0.35 };
const DEFAULT_ERASER = { size: 14 };
const DEFAULT_TABLE: TableOptions = {
  rows: 3,
  cols: 3,
  withTitle: false,
  withContainer: false,
};
const DEFAULT_CONNECTOR: ConnectorStylePreset = {
  edgeStyle: "orthogonal",
  curved: false,
  endArrow: "classic",
  startArrow: "none",
};

const DRAWING_TOOLS = new Set<DrawingTool>([
  "select",
  "pan",
  "pen",
  "brush",
  "pencil",
  "marker",
  "eraser",
  "connector",
  "arrow",
  "shape-place",
]);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true']"));
}

function isDrawingTool(t: string): t is DrawingTool {
  return DRAWING_TOOLS.has(t as DrawingTool);
}

export function DiagramToolsProvider({ children }: { children: ReactNode }) {
  const [activeTool, setActiveToolRaw] = useState<DrawingTool>("select");
  const [openMenu, setOpenMenuState] = useState<ToolbarMenuId | null>(null);
  const [pendingShape, setPendingShape] = useState<string | null>(null);
  const [pen, setPen] = useState<PenOptions>(DEFAULT_PEN);
  const [brush, setBrush] = useState<PenOptions>(DEFAULT_BRUSH);
  const [eraser, setEraser] = useState(DEFAULT_ERASER);
  const [tableOpts, setTableOpts] = useState<TableOptions>(DEFAULT_TABLE);
  const [connectorStyle, setConnectorStyle] = useState<ConnectorStylePreset>(DEFAULT_CONNECTOR);
  const [colorTarget, setColorTarget] = useState<"fill" | "stroke">("fill");
  const [aiOpen, setAiOpen] = useState(false);

  const setActiveTool = useCallback((action: SetStateAction<DrawingTool>) => {
    setActiveToolRaw((prev) => {
      const next = typeof action === "function" ? action(prev) : action;
      return isDrawingTool(next) ? next : "select";
    });
  }, []);

  const closeMenu = useCallback(() => setOpenMenuState(null), []);

  const setOpenMenu = useCallback((id: ToolbarMenuId | null) => {
    setOpenMenuState(id);
  }, []);

  const toggleMenu = useCallback((id: ToolbarMenuId) => {
    setOpenMenuState((prev) => (prev === id ? null : id));
  }, []);

  const setDrawingTool = useCallback(
    (tool: DrawingTool, opts?: { keepMenu?: boolean | ToolbarMenuId }) => {
      setActiveToolRaw(tool);
      if (opts?.keepMenu === true) {
        // leave openMenu unchanged
      } else if (typeof opts?.keepMenu === "string") {
        setOpenMenuState(opts.keepMenu);
      } else {
        setOpenMenuState(null);
      }
      if (tool !== "shape-place") setPendingShape(null);
    },
    []
  );

  // Outside click closes menus
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest("[data-toolbar-menu]") || el.closest("[data-toolbar-trigger]")) return;
      setOpenMenuState(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openMenu]);

  // Esc closes menu or returns to select
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (openMenu) {
          setOpenMenuState(null);
          return;
        }
        setDrawingTool("select");
        return;
      }

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z" && e.shiftKey) {
        // redo handled by editor; don't steal here
        return;
      }

      if (mod) {
        if (e.key.toLowerCase() === "t" && e.shiftKey) {
          e.preventDefault();
          setOpenMenuState((prev) => (prev === "table" ? null : "table"));
          return;
        }
        return;
      }

      const k = e.key.toLowerCase();
      if (k === "v") {
        e.preventDefault();
        setDrawingTool("select");
      } else if (k === "h") {
        e.preventDefault();
        setDrawingTool("pan");
      } else if (k === "r") {
        e.preventDefault();
        setPendingShape("rectangle");
        setDrawingTool("shape-place");
      } else if (k === "t") {
        e.preventDefault();
        // text insert is editor-owned; emit via custom event
        window.dispatchEvent(new CustomEvent("diagram-tool-insert-text"));
        setDrawingTool("select");
      } else if (k === "p") {
        e.preventDefault();
        setDrawingTool("pen");
      } else if (k === "l") {
        e.preventDefault();
        setDrawingTool("connector");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openMenu, setDrawingTool]);

  // Opening AI dock closes toolbar menus
  useEffect(() => {
    if (aiOpen) setOpenMenuState(null);
  }, [aiOpen]);

  const showPenStrip =
    activeTool === "pen" ||
    activeTool === "brush" ||
    activeTool === "pencil" ||
    activeTool === "marker" ||
    activeTool === "eraser";

  const value = useMemo(
    () => ({
      activeTool,
      setActiveTool,
      setDrawingTool,
      openMenu,
      setOpenMenu,
      toggleMenu,
      closeMenu,
      pendingShape,
      setPendingShape,
      pen,
      setPen,
      brush,
      setBrush,
      eraser,
      setEraser,
      tableOpts,
      setTableOpts,
      connectorStyle,
      setConnectorStyle,
      colorTarget,
      setColorTarget,
      aiOpen,
      setAiOpen,
      showPenStrip,
    }),
    [
      activeTool,
      setActiveTool,
      setDrawingTool,
      openMenu,
      setOpenMenu,
      toggleMenu,
      closeMenu,
      pendingShape,
      pen,
      brush,
      eraser,
      tableOpts,
      connectorStyle,
      colorTarget,
      aiOpen,
      showPenStrip,
    ]
  );

  return (
    <DiagramToolsContext.Provider value={value}>{children}</DiagramToolsContext.Provider>
  );
}

export function useDiagramTools() {
  const ctx = useContext(DiagramToolsContext);
  if (!ctx) {
    throw new Error("useDiagramTools must be used within DiagramToolsProvider");
  }
  return ctx;
}

/** Soft access — returns null when provider is absent. */
export function useDiagramToolsOptional() {
  return useContext(DiagramToolsContext);
}

export { isTypingTarget };
