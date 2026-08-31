import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type {
  DiagramCanvasHandle,
  LayoutKindCanvas,
  SelectionInfo,
} from "@/components/diagrams/DiagramCanvas";
import {
  DiagramToolsProvider,
  isTypingTarget,
} from "@/components/diagrams/DiagramToolsContext";
import { MenuBar } from "@/components/diagrams/MenuBar";
import { AiChatPanel } from "@/components/diagrams/AiChatPanel";
import { AnalyzePanel } from "@/components/diagrams/AnalyzePanel";
import { VersionHistoryPanel } from "@/components/diagrams/VersionHistoryPanel";
import { ShareDialog } from "@/components/diagrams/ShareDialog";
import { PageSetupDialog } from "@/components/diagrams/PageSetupDialog";
import { DiagramWorkspace } from "@/components/diagrams/DiagramWorkspace";
import { KeyboardShortcutsDialog } from "@/components/diagrams/KeyboardShortcutsDialog";
import { TextPromptDialog } from "@/components/diagrams/TextPromptDialog";
import {
  emptyDocument,
  emptyPage,
  PAPER_SIZES,
  upgradeDocument,
  type DiagramDocument,
  type DiagramPage,
  type DiagramSettings,
  type ThemeId,
} from "@/lib/diagram/model";
import type { ShapeDef } from "@/lib/diagram/shapes";
import { downloadBlob, exportPdf, exportPng, exportSvg, printSvg } from "@/lib/diagram/export";
import { applyThemeToPage, getTheme } from "@/lib/diagram/themes";
import { analyzePageLocal } from "@/lib/diagram/analyzeLocal";
import {
  fromMermaid,
  toKubernetes,
  toMermaid,
  toOpenApi,
  toSql,
  toTerraform,
} from "@/lib/diagram/codegen";
import { useAuth } from "@/features/auth/useAuth";
import {
  diagramsApi,
  useDiagramDocument,
  useSyncDiagramTools,
  withOrgRetry,
  type DiagramIssue,
  type ExplainStep,
} from "@/features/diagrams";
import type { CellStyle } from "@maxgraph/core";

type SidePanel = "none" | "analyze" | "versions" | "explain";

function DiagramEditorInner() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const canvasRef = useRef<DiagramCanvasHandle>(null);
  const tools = useSyncDiagramTools(canvasRef);
  const docState = useDiagramDocument({ routeId, userId: user?.id });
  const {
    orgId,
    setOrgId,
    diagramId,
    title,
    setTitle,
    doc,
    setDoc,
    activePageId,
    setActivePageId,
    dirty,
    setDirty,
    markDirty,
    currentVersion,
    setCurrentVersion,
    loading,
    error,
    setError,
    membershipHint,
    setMembershipHint,
    retryLoad,
  } = docState;

  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [selBounds, setSelBounds] = useState<{ x: number; y: number; w: number; h: number } | null>(
    null
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [pageSetupOpen, setPageSetupOpen] = useState(false);
  const [shapesPanelOpen, setShapesPanelOpen] = useState(true);
  const [formatPanelOpen, setFormatPanelOpen] = useState(true);
  const [sidePanel, setSidePanel] = useState<SidePanel>("none");
  const [analyzeIssues, setAnalyzeIssues] = useState<DiagramIssue[]>([]);
  const [explainSteps, setExplainSteps] = useState<ExplainStep[]>([]);
  const [explainSummary, setExplainSummary] = useState<string | null>(null);
  const [presentOpen, setPresentOpen] = useState(false);
  const [presentPlaying, setPresentPlaying] = useState(false);
  const [presentSpeed, setPresentSpeed] = useState(1);
  const [lastLayout, setLastLayout] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [fillColor, setFillColor] = useState("#dae8fc");
  const [strokeColor, setStrokeColor] = useState("#6c8ebf");
  const loadedRef = useRef(false);
  const pageQueryApplied = useRef(false);
  const graphReadyRef = useRef(false);
  const pendingLoadRef = useRef(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [mermaidOpen, setMermaidOpen] = useState(false);

  const settings: DiagramSettings = doc.settings ?? {};
  const activePage = useMemo(
    () => doc.pages.find((p) => p.id === activePageId) ?? doc.pages[0]!,
    [doc.pages, activePageId]
  );

  // Reload canvas when server version or active page changes
  const contentRevision = useMemo(() => {
    return `${currentVersion ?? 0}|${activePageId}`;
  }, [currentVersion, activePageId]);

  const aiOpen = tools.aiOpen;
  const setAiOpen = tools.setAiOpen;

  useEffect(() => {
    const onInsertText = () => {
      canvasRef.current?.addShape({
        id: "text",
        label: "Text",
        shape: "text",
        w: 120,
        h: 40,
        category: "general",
        preview: "rect",
      });
      setDirty(true);
    };
    window.addEventListener("diagram-tool-insert-text", onInsertText);
    return () => window.removeEventListener("diagram-tool-insert-text", onInsertText);
  }, [setDirty]);

  const flushCanvasLoad = useCallback(
    (fit: boolean) => {
      const page = doc.pages.find((p) => p.id === activePageId);
      if (!page) return;
      canvasRef.current?.loadPage(page, { fit });
      if (fit) loadedRef.current = true;
    },
    [doc.pages, activePageId]
  );

  const handleGraphReady = useCallback(() => {
    graphReadyRef.current = true;
    if (pendingLoadRef.current) {
      pendingLoadRef.current = false;
      flushCanvasLoad(!loadedRef.current);
    }
  }, [flushCanvasLoad]);

  // Load page into canvas when ready or when document revision changes
  useEffect(() => {
    if (loading) return;
    if (graphReadyRef.current) {
      flushCanvasLoad(!loadedRef.current);
    } else {
      pendingLoadRef.current = true;
    }
  }, [loading, activePageId, diagramId, contentRevision, flushCanvasLoad]);

  const syncActivePageFromCanvas = useCallback((): DiagramDocument => {
    const serialized = canvasRef.current?.serializePage({
      id: activePage.id,
      name: activePage.name,
    });
    if (!serialized) return doc;
    return {
      ...doc,
      pages: doc.pages.map((p) => (p.id === activePage.id ? serialized : p)),
    };
  }, [activePage, doc]);

  const getLivePage = useCallback((): DiagramPage => {
    const next = syncActivePageFromCanvas();
    return next.pages.find((p) => p.id === activePageId) ?? activePage;
  }, [syncActivePageFromCanvas, activePageId, activePage]);

  const applyPageToCanvas = useCallback(
    (page: DiagramPage) => {
      const merged = { ...page, id: activePageId, name: activePage.name };
      setDoc((d) => ({
        ...d,
        pages: d.pages.map((p) => (p.id === activePageId ? merged : p)),
      }));
      setDirty(true);
      canvasRef.current?.loadPage(merged, { fit: false });
    },
    [activePageId, activePage.name]
  );

  const save = useCallback(async () => {
    if (!orgId || !diagramId || saving) return;
    setSaving(true);
    setError(null);
    try {
      const nextDoc = syncActivePageFromCanvas();
      setDoc(nextDoc);
      const { result } = await withOrgRetry(user?.id, (id) =>
        diagramsApi.update(id, diagramId, { title, content: nextDoc })
      );
      setOrgId(result.diagram.organizationId || orgId);
      setCurrentVersion(result.diagram.currentVersion ?? null);
      setDirty(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setError(msg);
      if (/not a member of this organization|do not have access to this organization/i.test(msg)) setMembershipHint(true);
    } finally {
      setSaving(false);
    }
  }, [orgId, diagramId, saving, syncActivePageFromCanvas, title, user?.id]);

  // Ctrl+S and shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
        return;
      }
      if (mod && e.key === "/") {
        e.preventDefault();
        setAiOpen(true);
        return;
      }
      if (e.key === "F5") {
        e.preventDefault();
        setPresentOpen(true);
        return;
      }
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) canvas.redo();
        else canvas.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        canvas.redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        canvas.selectAll();
        return;
      }
      if (mod && e.key.toLowerCase() === "c") {
        canvas.copy();
        return;
      }
      if (mod && e.key.toLowerCase() === "x") {
        e.preventDefault();
        canvas.cut();
        return;
      }
      if (mod && e.key.toLowerCase() === "v") {
        canvas.paste();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        canvas.duplicate();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        canvas.deleteSelection();
      }
      if (e.key === "Escape") {
        // Tool state Esc is handled by DiagramToolsProvider; only clear selection here
        // when already in select mode (provider will have switched first on same event)
        if (tools.activeTool === "select" && !tools.openMenu) {
          canvas.clearSelection();
        }
        if (presentOpen) {
          canvas.pauseFlow();
          setPresentOpen(false);
          setPresentPlaying(false);
        }
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        if (presentOpen) {
          if (e.key === "ArrowLeft") {
            canvas.stepFlowBack();
            setPresentPlaying(false);
          } else if (e.key === "ArrowRight") {
            canvas.stepFlow();
            setPresentPlaying(false);
          }
          return;
        }
        const step = e.shiftKey ? 10 : 1;
        const map: Record<string, [number, number]> = {
          ArrowUp: [0, -step],
          ArrowDown: [0, step],
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
        };
        const [dx, dy] = map[e.key]!;
        canvas.nudge(dx, dy);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, setAiOpen, presentOpen, tools.activeTool, tools.openMenu]);

  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty]);

  const confirmLeave = useCallback(() => {
    if (!dirty) return true;
    return window.confirm("You have unsaved changes. Leave without saving?");
  }, [dirty]);

  const leaveTo = useCallback(
    (path: string) => {
      if (!confirmLeave()) return;
      navigate(path);
    },
    [confirmLeave, navigate]
  );

  const switchPage = (id: string) => {
    if (id === activePageId) return;
    const nextDoc = syncActivePageFromCanvas();
    setDoc(nextDoc);
    setActivePageId(id);
    setDirty(true);
  };

  const insertPage = (afterId?: string) => {
    const nextDoc = syncActivePageFromCanvas();
    const page = emptyPage(`Page-${nextDoc.pages.length + 1}`);
    const idx = afterId
      ? nextDoc.pages.findIndex((p) => p.id === afterId)
      : nextDoc.pages.length - 1;
    const pages = [...nextDoc.pages];
    pages.splice(idx + 1, 0, page);
    setDoc({ ...nextDoc, pages });
    setActivePageId(page.id);
    setDirty(true);
  };

  const renamePage = (id: string, name: string) => {
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => (p.id === id ? { ...p, name } : p)),
    }));
    setDirty(true);
  };

  const removePage = (id: string) => {
    if (doc.pages.length <= 1) return;
    const nextDoc = syncActivePageFromCanvas();
    const pages = nextDoc.pages.filter((p) => p.id !== id);
    setDoc({ ...nextDoc, pages });
    if (activePageId === id) setActivePageId(pages[0]!.id);
    setDirty(true);
  };

  const duplicatePage = (id: string) => {
    const nextDoc = syncActivePageFromCanvas();
    const src = nextDoc.pages.find((p) => p.id === id);
    if (!src) return;
    const copy: DiagramPage = {
      ...structuredClone(src),
      id: crypto.randomUUID(),
      name: `${src.name} copy`,
    };
    const idx = nextDoc.pages.findIndex((p) => p.id === id);
    const pages = [...nextDoc.pages];
    pages.splice(idx + 1, 0, copy);
    setDoc({ ...nextDoc, pages });
    setActivePageId(copy.id);
    setDirty(true);
  };

  const deleteAllPages = () => {
    if (doc.pages.length <= 1) return;
    if (!confirm("Delete all pages except the first?")) return;
    const nextDoc = syncActivePageFromCanvas();
    const first = nextDoc.pages[0]!;
    setDoc({ ...nextDoc, pages: [first] });
    setActivePageId(first.id);
    setDirty(true);
  };

  const sortPages = () => {
    const nextDoc = syncActivePageFromCanvas();
    const pages = [...nextDoc.pages].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    );
    setDoc({ ...nextDoc, pages });
    setDirty(true);
  };

  const movePage = (id: string, dir: "left" | "right") => {
    const nextDoc = syncActivePageFromCanvas();
    const idx = nextDoc.pages.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const swap = dir === "left" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= nextDoc.pages.length) return;
    const pages = [...nextDoc.pages];
    [pages[idx], pages[swap]] = [pages[swap]!, pages[idx]!];
    setDoc({ ...nextDoc, pages });
    setDirty(true);
  };

  const openPageInNewWindow = (id: string) => {
    if (!diagramId) {
      toast.error("Save the diagram first");
      return;
    }
    const url = `${window.location.origin}/diagrams/${diagramId}?page=${encodeURIComponent(id)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    if (loading || pageQueryApplied.current) return;
    const pageId = searchParams.get("page");
    if (!pageId) {
      pageQueryApplied.current = true;
      return;
    }
    if (doc.pages.some((p) => p.id === pageId)) {
      setActivePageId(pageId);
    }
    pageQueryApplied.current = true;
  }, [loading, searchParams, doc.pages]);

  const onDropShape = (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-diagram-shape");
    if (!raw) return;
    try {
      const shape = JSON.parse(raw) as ShapeDef;
      canvasRef.current?.addShapeAtClient(shape, e.clientX, e.clientY);
      setDirty(true);
    } catch {
      /* ignore */
    }
  };

  const applySettings = (patch: Partial<DiagramSettings>) => {
    setDoc((d) => {
      const next = { ...d.settings, ...patch };
      if (patch.paper && patch.paper !== "custom") {
        const size = PAPER_SIZES[patch.paper as keyof typeof PAPER_SIZES];
        if (size) {
          next.pageWidth = size.w;
          next.pageHeight = size.h;
        }
      }
      return { ...d, settings: next };
    });
    setDirty(true);
  };

  const applyStyle = (patch: Partial<CellStyle>) => {
    canvasRef.current?.applyStyle(patch);
  };

  const onSelectionChange = useCallback((info: SelectionInfo | null) => {
    setSelection(info);
    setSelBounds(canvasRef.current?.getSelectionBounds() ?? null);
  }, []);

  const doExport = async (kind: "png" | "svg" | "pdf") => {
    const graph = canvasRef.current?.getGraph();
    if (!graph) return;
    const base = title.replace(/[^\w\-]+/g, "_") || "diagram";
    if (kind === "svg") {
      const svg = exportSvg(graph);
      downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${base}.svg`);
    } else if (kind === "png") {
      downloadBlob(await exportPng(graph), `${base}.png`);
    } else {
      downloadBlob(await exportPdf(graph), `${base}.pdf`);
    }
  };

  const downloadText = (filename: string, text: string, mime = "text/plain") => {
    downloadBlob(new Blob([text], { type: mime }), filename);
  };

  const exportCode = (kind: "mermaid" | "sql" | "terraform" | "k8s" | "openapi") => {
    const page = getLivePage();
    const base = title.replace(/[^\w\-]+/g, "_") || "diagram";
    if (kind === "mermaid") downloadText(`${base}.mmd`, toMermaid(page), "text/plain");
    else if (kind === "sql") downloadText(`${base}.sql`, toSql(page), "text/sql");
    else if (kind === "terraform") downloadText(`${base}.tf`, toTerraform(page), "text/plain");
    else if (kind === "k8s") downloadText(`${base}.yaml`, toKubernetes(page), "text/yaml");
    else downloadText(`${base}.openapi.yaml`, toOpenApi(page), "text/yaml");
  };

  const importMermaidFromText = (text: string) => {
    if (!text.trim()) return;
    try {
      const imported = fromMermaid(text);
      const live = getLivePage();
      const idMap = new Map<string, string>();
      const nodes = imported.nodes.map((n) => {
        const id = crypto.randomUUID();
        idMap.set(n.id, id);
        return {
          ...n,
          id,
          x: n.x + 40,
          y: n.y + 40,
        };
      });
      const edges = imported.edges.map((e) => ({
        ...e,
        id: crypto.randomUUID(),
        source: idMap.get(e.source) || e.source,
        target: idMap.get(e.target) || e.target,
      }));
      const merged: DiagramPage = {
        ...live,
        nodes: [...live.nodes, ...nodes],
        edges: [...live.edges, ...edges],
      };
      applyPageToCanvas(merged);
      toast.success(`Imported ${nodes.length} nodes from Mermaid`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mermaid import failed");
    }
  };

  const applyTheme = (themeId: string) => {
    const live = getLivePage();
    const themed = applyThemeToPage(live, themeId);
    const theme = getTheme(themeId);
    setDoc((d) => ({
      ...d,
      settings: {
        ...d.settings,
        theme: themeId as ThemeId,
        background: theme.background,
      },
      pages: d.pages.map((p) =>
        p.id === activePageId ? { ...themed, id: activePageId, name: p.name } : p
      ),
    }));
    setDirty(true);
    canvasRef.current?.loadPage({ ...themed, id: activePageId, name: activePage.name }, { fit: false });
  };

  const runLayoutKind = (kind: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (kind === "last") {
      if (lastLayout) runLayoutKind(lastLayout);
      return;
    }
    if (kind.startsWith("align-")) {
      const dir = kind.replace("align-", "") as "left" | "center" | "right" | "top" | "middle" | "bottom";
      canvas.align(dir);
      setDirty(true);
      return;
    }
    if (kind === "distribute-h") {
      canvas.distribute("h");
      setDirty(true);
      return;
    }
    if (kind === "distribute-v") {
      canvas.distribute("v");
      setDirty(true);
      return;
    }
    const map: Record<string, LayoutKindCanvas> = {
      "vertical-flow": "vertical-flow",
      "horizontal-flow": "horizontal-flow",
      "vertical-tree": "vertical-tree",
      "horizontal-tree": "horizontal-tree",
      "radial-tree": "radial",
      radial: "radial",
      organic: "organic",
      circle: "circle",
      orthogonal: "orthogonal",
    };
    const mapped = map[kind];
    if (mapped) {
      canvas.runLayout(mapped);
      setLastLayout(kind);
      setDirty(true);
    }
  };

  const runAnalyze = async () => {
    const page = getLivePage();
    const local = analyzePageLocal(page);
    setAnalyzeIssues(local);
    setSidePanel("analyze");
    if (!orgId || !diagramId) return;
    try {
      const { issues } = await diagramsApi.aiAnalyze(orgId, diagramId, page);
      const merged = [...local];
      for (const issue of issues ?? []) {
        if (!merged.some((m) => m.message === issue.message && m.kind === issue.kind)) {
          merged.push(issue);
        }
      }
      setAnalyzeIssues(merged);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI analyze failed");
    }
  };

  const runExplain = async () => {
    if (!orgId || !diagramId) {
      toast.error("Save the diagram first");
      return;
    }
    try {
      const page = getLivePage();
      const { steps, summary } = await diagramsApi.aiExplain(orgId, diagramId, page);
      setExplainSteps(steps ?? []);
      setExplainSummary(summary ?? null);
      setSidePanel("explain");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Explain failed");
    }
  };

  const mergeScopedEdit = (full: DiagramPage, edited: DiagramPage): DiagramPage => {
    const nodeMap = new Map(full.nodes.map((n) => [n.id, n]));
    for (const n of edited.nodes) nodeMap.set(n.id, n);
    const edgeMap = new Map(full.edges.map((e) => [e.id, e]));
    for (const e of edited.edges) edgeMap.set(e.id, e);
    return {
      ...full,
      nodes: Array.from(nodeMap.values()),
      edges: Array.from(edgeMap.values()),
    };
  };

  const scopedSelectionPage = (page: DiagramPage, selectedIds: string[]): DiagramPage => {
    const seeds = new Set(selectedIds);
    const neighbors = new Set(seeds);
    for (const e of page.edges) {
      if (seeds.has(e.source) || seeds.has(e.target)) {
        neighbors.add(e.source);
        neighbors.add(e.target);
      }
    }
    return {
      ...page,
      nodes: page.nodes.filter((n) => neighbors.has(n.id)),
      edges: page.edges.filter((e) => neighbors.has(e.source) && neighbors.has(e.target)),
    };
  };

  const runSelectionAiEdit = async (action: string, text?: string) => {
    if (!orgId || !diagramId || !selection?.cells.length) return;
    const instruction =
      text ||
      ({
        "improve-labels": "Improve labels for clarity and consistency",
        simplify: "Simplify this selection while keeping meaning",
        "add-detail": "Add useful detail and annotations",
        restyle: "Restyle for a cleaner professional look",
      }[action] ?? action);
    const full = getLivePage();
    const ids = selection.cells.map((c) => c.getId() || "").filter(Boolean);
    const scoped = scopedSelectionPage(full, ids);
    try {
      const { page } = await diagramsApi.aiEdit(orgId, diagramId, instruction, scoped);
      applyPageToCanvas(mergeScopedEdit(full, page));
      toast.success("AI edit applied to selection");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI edit failed");
    }
  };

  const insertAiDocument = (document: DiagramDocument, mode: "replace" | "append" | "newPage") => {
    const upgraded = upgradeDocument(document);
    if (mode === "replace") {
      const page = upgraded.pages[0]!;
      applyPageToCanvas(page);
      requestAnimationFrame(() => canvasRef.current?.autoLayout());
      return;
    }
    if (mode === "newPage") {
      const nextDoc = syncActivePageFromCanvas();
      const page = {
        ...upgraded.pages[0]!,
        id: crypto.randomUUID(),
        name: `AI-${nextDoc.pages.length + 1}`,
      };
      setDoc({ ...nextDoc, pages: [...nextDoc.pages, page] });
      setActivePageId(page.id);
      setDirty(true);
      return;
    }
    // append
    const live = getLivePage();
    const incoming = upgraded.pages[0]!;
    const idMap = new Map<string, string>();
    const nodes = incoming.nodes.map((n) => {
      const id = crypto.randomUUID();
      idMap.set(n.id, id);
      return { ...n, id, x: n.x + 60, y: n.y + 60 };
    });
    const edges = incoming.edges.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      source: idMap.get(e.source) || e.source,
      target: idMap.get(e.target) || e.target,
    }));
    applyPageToCanvas({
      ...live,
      nodes: [...live.nodes, ...nodes],
      edges: [...live.edges, ...edges],
    });
  };

  const restoreVersion = async (version: number) => {
    if (!orgId || !diagramId) return;
    if (!confirm(`Restore version ${version}? Unsaved changes will be lost.`)) return;
    try {
      const { diagram } = await diagramsApi.restoreVersion(orgId, diagramId, version);
      const content = upgradeDocument(diagram.content ?? emptyDocument());
      setDoc(content);
      setActivePageId(content.pages[0]!.id);
      setTitle(diagram.title);
      setCurrentVersion(diagram.currentVersion ?? version);
      setDirty(false);
      loadedRef.current = false;
      toast.success(`Restored v${version}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    }
  };

  const menus = [
    {
      id: "file",
      label: "File",
      items: [
        { type: "item" as const, label: "New", onClick: () => leaveTo("/diagrams/new") },
        { type: "item" as const, label: "Open…", onClick: () => leaveTo("/diagrams/studio") },
        { type: "sep" as const },
        { type: "item" as const, label: "Save", shortcut: "Ctrl+S", onClick: () => void save() },
        {
          type: "item" as const,
          label: "Save As…",
          disabled: !diagramId || !orgId,
          onClick: async () => {
            if (!orgId || !diagramId) return;
            try {
              // Flush unsaved canvas into the current diagram first, then duplicate
              const nextDoc = syncActivePageFromCanvas();
              setDoc(nextDoc);
              await withOrgRetry(user?.id, (id) =>
                diagramsApi.update(id, diagramId, { title, content: nextDoc })
              );
              setDirty(false);
              const { result } = await withOrgRetry(user?.id, (id) =>
                diagramsApi.duplicate(id, diagramId)
              );
              navigate(`/diagrams/${result.diagram.id}`);
              toast.success("Diagram duplicated");
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "Save As failed");
            }
          },
        },
        { type: "sep" as const },
        { type: "item" as const, label: "Page Setup…", onClick: () => setPageSetupOpen(true) },
        { type: "sep" as const },
        { type: "item" as const, label: "Export as PNG…", onClick: () => void doExport("png") },
        { type: "item" as const, label: "Export as SVG…", onClick: () => void doExport("svg") },
        { type: "item" as const, label: "Export as PDF…", onClick: () => void doExport("pdf") },
        { type: "sep" as const },
        { type: "item" as const, label: "Export Mermaid…", onClick: () => exportCode("mermaid") },
        { type: "item" as const, label: "Export SQL…", onClick: () => exportCode("sql") },
        { type: "item" as const, label: "Export Terraform…", onClick: () => exportCode("terraform") },
        { type: "item" as const, label: "Export Kubernetes…", onClick: () => exportCode("k8s") },
        { type: "item" as const, label: "Export OpenAPI…", onClick: () => exportCode("openapi") },
        { type: "sep" as const },
        { type: "item" as const, label: "Import Mermaid…", onClick: () => setMermaidOpen(true) },
        {
          type: "item" as const,
          label: "Print…",
          onClick: () => {
            const g = canvasRef.current?.getGraph();
            if (g) printSvg(g);
          },
        },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      items: [
        { type: "item" as const, label: "Undo", shortcut: "Ctrl+Z", onClick: () => canvasRef.current?.undo() },
        { type: "item" as const, label: "Redo", shortcut: "Ctrl+Shift+Z", onClick: () => canvasRef.current?.redo() },
        { type: "sep" as const },
        { type: "item" as const, label: "Cut", shortcut: "Ctrl+X", onClick: () => canvasRef.current?.cut() },
        { type: "item" as const, label: "Copy", shortcut: "Ctrl+C", onClick: () => canvasRef.current?.copy() },
        { type: "item" as const, label: "Paste", shortcut: "Ctrl+V", onClick: () => canvasRef.current?.paste() },
        {
          type: "item" as const,
          label: "Duplicate",
          shortcut: "Ctrl+D",
          onClick: () => canvasRef.current?.duplicate(),
        },
        { type: "item" as const, label: "Delete", onClick: () => canvasRef.current?.deleteSelection() },
        { type: "sep" as const },
        {
          type: "item" as const,
          label: "Select All",
          shortcut: "Ctrl+A",
          onClick: () => canvasRef.current?.selectAll(),
        },
        {
          type: "item" as const,
          label: "Group",
          onClick: () => canvasRef.current?.groupSelection(),
        },
        {
          type: "item" as const,
          label: "Ungroup",
          onClick: () => canvasRef.current?.ungroupSelection(),
        },
      ],
    },
    {
      id: "view",
      label: "View",
      items: [
        { type: "item" as const, label: "Zoom In", onClick: () => canvasRef.current?.zoomIn() },
        { type: "item" as const, label: "Zoom Out", onClick: () => canvasRef.current?.zoomOut() },
        { type: "item" as const, label: "Reset Zoom", onClick: () => canvasRef.current?.setZoom(1) },
        { type: "sep" as const },
        {
          type: "item" as const,
          label: settings.grid === false ? "Show Grid" : "Hide Grid",
          onClick: () => applySettings({ grid: settings.grid === false }),
        },
        {
          type: "item" as const,
          label: settings.pageView === false ? "Show Page View" : "Hide Page View",
          onClick: () => applySettings({ pageView: settings.pageView === false }),
        },
        {
          type: "item" as const,
          label: focusMode ? "Exit Focus Mode" : "Focus Mode",
          onClick: () => {
            const next = !focusMode;
            setFocusMode(next);
            canvasRef.current?.setFocusMode(next);
          },
        },
        {
          type: "item" as const,
          label: presentOpen ? "Exit Present" : "Present",
          onClick: () => {
            if (presentOpen) {
              canvasRef.current?.pauseFlow();
              setPresentPlaying(false);
            }
            setPresentOpen((v) => !v);
          },
        },
      ],
    },
    {
      id: "arrange",
      label: "Arrange",
      items: [
        { type: "item" as const, label: "Bring to Front", onClick: () => canvasRef.current?.bringToFront() },
        { type: "item" as const, label: "Send to Back", onClick: () => canvasRef.current?.sendToBack() },
        { type: "sep" as const },
        { type: "item" as const, label: "Align Left", onClick: () => canvasRef.current?.align("left") },
        { type: "item" as const, label: "Align Center", onClick: () => canvasRef.current?.align("center") },
        { type: "item" as const, label: "Align Right", onClick: () => canvasRef.current?.align("right") },
        { type: "item" as const, label: "Align Top", onClick: () => canvasRef.current?.align("top") },
        { type: "item" as const, label: "Align Middle", onClick: () => canvasRef.current?.align("middle") },
        { type: "item" as const, label: "Align Bottom", onClick: () => canvasRef.current?.align("bottom") },
        { type: "sep" as const },
        {
          type: "item" as const,
          label: "Distribute Horizontally",
          onClick: () => canvasRef.current?.distribute("h"),
        },
        {
          type: "item" as const,
          label: "Distribute Vertically",
          onClick: () => canvasRef.current?.distribute("v"),
        },
        { type: "sep" as const },
        {
          type: "item" as const,
          label: "Auto Layout",
          onClick: () => {
            canvasRef.current?.autoLayout();
            setLastLayout("vertical-flow");
          },
        },
        {
          type: "item" as const,
          label: "Magic Cleanup",
          onClick: () => canvasRef.current?.magicCleanup(),
        },
      ],
    },
    {
      id: "extras",
      label: "Extras",
      items: [
        {
          type: "item" as const,
          label: "AI Generate…",
          onClick: () => setAiOpen(true),
        },
        {
          type: "item" as const,
          label: "AI Edit…",
          onClick: () => setAiOpen(true),
        },
        {
          type: "item" as const,
          label: "Image to Diagram…",
          onClick: () => setAiOpen(true),
        },
        { type: "sep" as const },
        { type: "item" as const, label: "Analyze…", onClick: () => void runAnalyze() },
        { type: "item" as const, label: "Explain…", onClick: () => void runExplain() },
        {
          type: "item" as const,
          label: "Version History…",
          onClick: () => setSidePanel("versions"),
        },
      ],
    },
    {
      id: "help",
      label: "Help",
      items: [
        {
          type: "item" as const,
          label: "Keyboard shortcuts",
          onClick: () => setShortcutsOpen(true),
        },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-white text-[#0f172a]">
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-[#cfd8e3] bg-[#f8fafc] px-3">
        <Link
          to="/diagrams"
          className="flex size-7 items-center justify-center rounded-md bg-[#f97316] text-xs font-bold text-white"
          title="Diagram Studio"
          onClick={(e) => {
            if (!confirmLeave()) e.preventDefault();
          }}
        >
          D
        </Link>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
          className="max-w-[240px] truncate border-0 bg-transparent text-sm font-medium outline-none"
        />
        <MenuBar menus={menus} />
        <div className="ml-auto flex items-center gap-2">
          {dirty ? (
            <button
              type="button"
              onClick={() => void save()}
              className="rounded bg-[#e11d48] px-2.5 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-[#be123c]"
            >
              {saving ? "Saving…" : "Unsaved changes. Click here to save."}
            </button>
          ) : savedFlash ? (
            <span className="rounded bg-[#dcfce7] px-2.5 py-1 text-[11px] font-medium text-[#166534]">
              All changes saved
            </span>
          ) : null}
          <Button
            size="sm"
            className="h-7 rounded-md bg-[#2563eb] text-xs hover:bg-[#1d4ed8]"
            onClick={() => setShareOpen(true)}
            disabled={!diagramId}
          >
            <UserPlus className="size-3.5" />
            Share
          </Button>
        </div>
      </div>

      {(error || membershipHint) && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          {error}
          {membershipHint ? (
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => void retryLoad()}
            >
              Retry with your organization
            </button>
          ) : null}
        </div>
      )}

      <DiagramWorkspace
        canvasRef={canvasRef}
        settings={settings}
        onDirty={markDirty}
        onGraphReady={handleGraphReady}
        pages={doc.pages}
        activePageId={activePageId}
        onSelectPage={switchPage}
        onInsertPage={insertPage}
        onRenamePage={renamePage}
        onRemovePage={removePage}
        onDuplicatePage={duplicatePage}
        onDeleteAllPages={deleteAllPages}
        onSortPages={sortPages}
        onMovePage={movePage}
        onOpenInNewWindow={openPageInNewWindow}
        shapesPanelOpen={shapesPanelOpen}
        formatPanelOpen={formatPanelOpen}
        onToggleShapesPanel={() => setShapesPanelOpen((v) => !v)}
        onToggleFormatPanel={() => setFormatPanelOpen((v) => !v)}
        selection={selection}
        selBounds={selBounds}
        onSelectionChange={onSelectionChange}
        zoom={zoom}
        onZoomChange={setZoom}
        onApplySettings={applySettings}
        onApplyStyle={applyStyle}
        onThemeChange={applyTheme}
        onPageSetup={() => setPageSetupOpen(true)}
        onDropShape={onDropShape}
        presentOpen={presentOpen}
        presentPlaying={presentPlaying}
        presentSpeed={presentSpeed}
        onPresentPlay={() => {
          canvasRef.current?.playFlow();
          setPresentPlaying(true);
        }}
        onPresentPause={() => {
          canvasRef.current?.pauseFlow();
          setPresentPlaying(false);
        }}
        onPresentRestart={() => {
          canvasRef.current?.restartFlow();
          setPresentPlaying(true);
        }}
        onPresentStep={() => {
          canvasRef.current?.stepFlow();
          setPresentPlaying(false);
        }}
        onPresentStepBack={() => {
          canvasRef.current?.stepFlowBack();
          setPresentPlaying(false);
        }}
        onPresentSpeed={(s) => {
          setPresentSpeed(s);
          canvasRef.current?.setFlowSpeed(s);
        }}
        onPresentExit={() => {
          canvasRef.current?.pauseFlow();
          setPresentPlaying(false);
          setPresentOpen(false);
        }}
        onSelectionAiEdit={(action, text) => void runSelectionAiEdit(action, text)}
        toolRail={{
          onUndo: () => canvasRef.current?.undo(),
          onRedo: () => canvasRef.current?.redo(),
          onDelete: () => canvasRef.current?.deleteSelection(),
          onAutoLayout: () => {
            canvasRef.current?.autoLayout();
            setLastLayout("vertical-flow");
          },
          onMagicCleanup: () => canvasRef.current?.magicCleanup(),
          onAiGenerate: () => setAiOpen(true),
          onExportPng: () => void doExport("png"),
          onExportSvg: () => void doExport("svg"),
          onExportPdf: () => void doExport("pdf"),
          onInsertTable: (rows, cols, opts) => {
            canvasRef.current?.insertTable(rows, cols, {
              title: opts.withTitle,
              container: opts.withContainer,
            });
            setDirty(true);
          },
          onInsertText: () => {
            canvasRef.current?.addShape({
              id: "text",
              label: "Text",
              shape: "text",
              w: 120,
              h: 40,
              category: "general",
              preview: "rect",
            });
            setDirty(true);
          },
          onInsertContainer: () => {
            canvasRef.current?.insertContainer("Container");
            setDirty(true);
          },
          onApplyTheme: applyTheme,
          onPresent: () => setPresentOpen(true),
          onAnalyze: () => void runAnalyze(),
          onExplain: () => void runExplain(),
          onVersions: () => setSidePanel("versions"),
          onFillColor: (c) => {
            setFillColor(c);
            canvasRef.current?.applyStyle({ fillColor: c });
          },
          onStrokeColor: (c) => {
            setStrokeColor(c);
            canvasRef.current?.applyStyle({ strokeColor: c });
          },
          onLayout: runLayoutKind,
          fillColor,
          strokeColor,
          currentTheme: settings.theme ?? "automatic",
          lastLayout,
        }}
        sidePanels={
          <>
            {sidePanel === "analyze" ? (
              <AnalyzePanel
                open
                issues={analyzeIssues}
                onClose={() => setSidePanel("none")}
                onFocus={(ids) => canvasRef.current?.focusNodes(ids)}
                onRerun={() => void runAnalyze()}
              />
            ) : null}
            {sidePanel === "versions" && orgId && diagramId ? (
              <VersionHistoryPanel
                open
                organizationId={orgId}
                diagramId={diagramId}
                currentVersion={currentVersion}
                onClose={() => setSidePanel("none")}
                onRestore={(v) => void restoreVersion(v)}
              />
            ) : null}
            {sidePanel === "explain" ? (
              <aside className="flex h-full w-[280px] shrink-0 flex-col border-l border-[#cfd8e3] bg-[#f8fafc]">
                <header className="flex h-11 items-center justify-between border-b border-[#e2e8f0] px-3">
                  <h2 className="text-sm font-semibold">Explain</h2>
                  <Button type="button" variant="ghost" size="icon-xs" onClick={() => setSidePanel("none")}>
                    ×
                  </Button>
                </header>
                {explainSummary ? (
                  <p className="border-b border-[#e2e8f0] px-3 py-2 text-xs text-[#475569]">{explainSummary}</p>
                ) : null}
                <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
                  {explainSteps.map((step) => (
                    <button
                      key={step.index}
                      type="button"
                      className="w-full rounded-md border border-[#e2e8f0] bg-white p-2.5 text-left hover:border-[#93c5fd]"
                      onClick={() => canvasRef.current?.focusNodes(step.nodeIds ?? [])}
                    >
                      <p className="text-xs font-semibold text-[#0f172a]">
                        {step.index}. {step.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#64748b]">{step.detail}</p>
                    </button>
                  ))}
                  {!explainSteps.length ? (
                    <p className="p-2 text-xs text-[#94a3b8]">No steps yet</p>
                  ) : null}
                </div>
              </aside>
            ) : null}
            {orgId && aiOpen ? (
              <AiChatPanel
                open={aiOpen}
                onClose={() => setAiOpen(false)}
                organizationId={orgId}
                diagramId={diagramId}
                currentPage={getLivePage()}
                onInsertDocument={insertAiDocument}
                onInsertPage={(page) => applyPageToCanvas(page)}
                onEditedPage={(page) => applyPageToCanvas(page)}
              />
            ) : null}
          </>
        }
      />

      <PageSetupDialog
        open={pageSetupOpen}
        settings={settings}
        onClose={() => setPageSetupOpen(false)}
        onApply={(patch) => {
          applySettings(patch);
          setPageSetupOpen(false);
        }}
      />

      {orgId && diagramId && (
        <ShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          organizationId={orgId}
          diagramId={diagramId}
        />
      )}

      <KeyboardShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <TextPromptDialog
        open={mermaidOpen}
        title="Import Mermaid flowchart"
        placeholder="Paste Mermaid flowchart (TD/LR)…"
        onClose={() => setMermaidOpen(false)}
        onSubmit={importMermaidFromText}
      />
    </div>
  );
}

export default function DiagramEditorPage() {
  return (
    <DiagramToolsProvider>
      <DiagramEditorInner />
    </DiagramToolsProvider>
  );
}
