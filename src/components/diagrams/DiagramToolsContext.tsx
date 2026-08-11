import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export type DiagramTool =
  | "select"
  | "table"
  | "title"
  | "text"
  | "container"
  | "shapes"
  | "connector"
  | "arrow"
  | "pen"
  | "brush"
  | "eraser"
  | "layout"
  | "colors"
  | "themes"
  | "ai"
  | "export";

export type PenOptions = { size: number; color: string; opacity: number };
export type TableOptions = {
  rows: number;
  cols: number;
  withTitle: boolean;
  withContainer: boolean;
};

type DiagramToolsContextValue = {
  activeTool: DiagramTool;
  setActiveTool: Dispatch<SetStateAction<DiagramTool>>;
  pen: PenOptions;
  setPen: Dispatch<SetStateAction<PenOptions>>;
  brush: PenOptions;
  setBrush: Dispatch<SetStateAction<PenOptions>>;
  tableOpts: TableOptions;
  setTableOpts: Dispatch<SetStateAction<TableOptions>>;
  shapesOpen: boolean;
  setShapesOpen: Dispatch<SetStateAction<boolean>>;
  layoutOpen: boolean;
  setLayoutOpen: Dispatch<SetStateAction<boolean>>;
  themesOpen: boolean;
  setThemesOpen: Dispatch<SetStateAction<boolean>>;
  aiOpen: boolean;
  setAiOpen: Dispatch<SetStateAction<boolean>>;
};

const DiagramToolsContext = createContext<DiagramToolsContextValue | null>(null);

const DEFAULT_PEN: PenOptions = { size: 2, color: "#111827", opacity: 1 };
const DEFAULT_BRUSH: PenOptions = { size: 8, color: "#3b82f6", opacity: 0.35 };
const DEFAULT_TABLE: TableOptions = {
  rows: 3,
  cols: 3,
  withTitle: false,
  withContainer: false,
};

export function DiagramToolsProvider({ children }: { children: ReactNode }) {
  const [activeTool, setActiveTool] = useState<DiagramTool>("select");
  const [pen, setPen] = useState<PenOptions>(DEFAULT_PEN);
  const [brush, setBrush] = useState<PenOptions>(DEFAULT_BRUSH);
  const [tableOpts, setTableOpts] = useState<TableOptions>(DEFAULT_TABLE);
  const [shapesOpen, setShapesOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [themesOpen, setThemesOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const value = useMemo(
    () => ({
      activeTool,
      setActiveTool,
      pen,
      setPen,
      brush,
      setBrush,
      tableOpts,
      setTableOpts,
      shapesOpen,
      setShapesOpen,
      layoutOpen,
      setLayoutOpen,
      themesOpen,
      setThemesOpen,
      aiOpen,
      setAiOpen,
    }),
    [
      activeTool,
      pen,
      brush,
      tableOpts,
      shapesOpen,
      layoutOpen,
      themesOpen,
      aiOpen,
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
