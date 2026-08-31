import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import type { DiagramCanvasHandle, SelectionInfo } from "@/components/diagrams/DiagramCanvas";
import { DiagramToolsProvider } from "@/components/diagrams/DiagramToolsContext";
import { DiagramWorkspace } from "@/components/diagrams/DiagramWorkspace";
import { useSyncDiagramTools } from "@/features/diagrams";
import {
  emptyDocument,
  type DiagramDocument,
  type DiagramPage,
  type DiagramSettings,
} from "@/lib/diagram/model";
import type { ShapeDef } from "@/lib/diagram/shapes";
import { downloadBlob, exportPdf, exportPng, exportSvg } from "@/lib/diagram/export";
import { diagramsApi } from "@/services/diagramsApi";
import type { CellStyle } from "@maxgraph/core";

function SharedDiagramInner() {
  const { token } = useParams<{ token: string }>();
  const canvasRef = useRef<DiagramCanvasHandle>(null);
  useSyncDiagramTools(canvasRef);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("Shared diagram");
  const [role, setRole] = useState<"VIEW" | "EDIT">("VIEW");
  const [doc, setDoc] = useState<DiagramDocument>(emptyDocument());
  const [activePageId, setActivePageId] = useState(doc.pages[0]!.id);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [selBounds, setSelBounds] = useState<{ x: number; y: number; w: number; h: number } | null>(
    null
  );
  const [shapesPanelOpen, setShapesPanelOpen] = useState(true);
  const [formatPanelOpen, setFormatPanelOpen] = useState(true);
  const [fillColor, setFillColor] = useState("#dae8fc");
  const [strokeColor, setStrokeColor] = useState("#6c8ebf");
  const [loadKey, setLoadKey] = useState(0);
  const graphReadyRef = useRef(false);
  const pendingLoadRef = useRef(false);
  const loadedRef = useRef(false);

  const settings: DiagramSettings = doc.settings ?? {};
  const readOnly = role === "VIEW";

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await diagramsApi.getShared(token);
        if (cancelled) return;
        setTitle(res.diagram.title);
        setRole(res.share.role);
        setDoc(res.diagram.content);
        setActivePageId(res.diagram.content.pages[0]!.id);
        loadedRef.current = false;
        setLoadKey((k) => k + 1);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Share link is invalid or expired");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const flushCanvasLoad = useCallback(() => {
    const page = doc.pages.find((p) => p.id === activePageId);
    if (!page) return;
    canvasRef.current?.loadPage(page, { fit: !loadedRef.current });
    loadedRef.current = true;
  }, [doc.pages, activePageId]);

  const handleGraphReady = useCallback(() => {
    graphReadyRef.current = true;
    if (pendingLoadRef.current) {
      pendingLoadRef.current = false;
      flushCanvasLoad();
    }
  }, [flushCanvasLoad]);

  useEffect(() => {
    if (loading) return;
    if (graphReadyRef.current) {
      flushCanvasLoad();
    } else {
      pendingLoadRef.current = true;
    }
  }, [loading, activePageId, loadKey, flushCanvasLoad]);

  const syncActivePageFromCanvas = useCallback((): DiagramDocument => {
    const active = doc.pages.find((p) => p.id === activePageId);
    const serialized = canvasRef.current?.serializePage({
      id: activePageId,
      name: active?.name ?? "Page-1",
    });
    if (!serialized) return doc;
    return {
      ...doc,
      pages: doc.pages.map((p) => (p.id === activePageId ? serialized : p)),
    };
  }, [activePageId, doc]);

  const switchPage = (id: string) => {
    if (id === activePageId) return;
    if (role === "EDIT") {
      const nextDoc = syncActivePageFromCanvas();
      setDoc(nextDoc);
      setDirty(true);
    }
    setActivePageId(id);
  };

  const save = useCallback(async () => {
    if (!token || role !== "EDIT" || saving) return;
    setSaving(true);
    try {
      const nextDoc = syncActivePageFromCanvas();
      setDoc(nextDoc);
      await diagramsApi.updateShared(token, { content: nextDoc, title });
      setDirty(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [token, role, saving, title, syncActivePageFromCanvas]);

  const doExport = async (kind: "png" | "svg" | "pdf") => {
    const graph = canvasRef.current?.getGraph();
    if (!graph) return;
    const base = title.replace(/[^\w\-]+/g, "_") || "diagram";
    if (kind === "svg") {
      downloadBlob(new Blob([exportSvg(graph)], { type: "image/svg+xml" }), `${base}.svg`);
    } else if (kind === "png") {
      downloadBlob(await exportPng(graph), `${base}.png`);
    } else {
      downloadBlob(await exportPdf(graph), `${base}.pdf`);
    }
  };

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

  const onSelectionChange = useCallback((info: SelectionInfo | null) => {
    setSelection(info);
    setSelBounds(canvasRef.current?.getSelectionBounds() ?? null);
  }, []);

  const applySettings = (patch: Partial<DiagramSettings>) => {
    setDoc((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
    setDirty(true);
  };

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error && !doc.pages.length) {
    return (
      <div className="flex h-dvh items-center justify-center text-sm text-destructive">{error}</div>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-white">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#cfd8e3] bg-[#f8fafc] px-4">
        <div>
          <h1 className="text-sm font-semibold">{title}</h1>
          <p className="text-[11px] text-[#64748b]">
            {role === "EDIT" ? "Editable share link" : "View-only share link"}
          </p>
        </div>
        {role === "EDIT" && (
          <div className="flex items-center gap-2">
            {dirty && (
              <button
                type="button"
                onClick={() => void save()}
                className="rounded bg-[#e11d48] px-2.5 py-1 text-[11px] font-medium text-white"
              >
                {saving ? "Saving…" : "Unsaved changes. Click here to save."}
              </button>
            )}
            <Button size="sm" className="h-7 rounded-md text-xs" onClick={() => void save()} disabled={saving}>
              Save
            </Button>
          </div>
        )}
      </header>

      {error ? (
        <div className="border-b border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      <DiagramWorkspace
        canvasRef={canvasRef}
        settings={settings}
        readOnly={readOnly}
        onDirty={() => role === "EDIT" && setDirty(true)}
        onGraphReady={handleGraphReady}
        pages={doc.pages}
        activePageId={activePageId}
        onSelectPage={switchPage}
        onInsertPage={
          readOnly
            ? undefined
            : () => {
                const nextDoc = syncActivePageFromCanvas();
                const page: DiagramPage = {
                  id: crypto.randomUUID(),
                  name: `Page-${nextDoc.pages.length + 1}`,
                  nodes: [],
                  edges: [],
                };
                setDoc({ ...nextDoc, pages: [...nextDoc.pages, page] });
                setActivePageId(page.id);
                setDirty(true);
              }
        }
        onRenamePage={
          readOnly
            ? undefined
            : (id, name) => {
                setDoc((d) => ({
                  ...d,
                  pages: d.pages.map((p) => (p.id === id ? { ...p, name } : p)),
                }));
                setDirty(true);
              }
        }
        onRemovePage={
          readOnly
            ? undefined
            : (id) => {
                if (doc.pages.length <= 1) return;
                const nextDoc = syncActivePageFromCanvas();
                const pages = nextDoc.pages.filter((p) => p.id !== id);
                setDoc({ ...nextDoc, pages });
                if (activePageId === id) setActivePageId(pages[0]!.id);
                setDirty(true);
              }
        }
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
        onApplyStyle={(patch: Partial<CellStyle>) => canvasRef.current?.applyStyle(patch)}
        onThemeChange={() => undefined}
        onDropShape={onDropShape}
        showAdvancedPageTabs={false}
        toolRail={{
          onUndo: () => canvasRef.current?.undo(),
          onRedo: () => canvasRef.current?.redo(),
          onDelete: () => canvasRef.current?.deleteSelection(),
          onAutoLayout: () => {
            canvasRef.current?.autoLayout();
            setDirty(true);
          },
          onMagicCleanup: () => {
            canvasRef.current?.magicCleanup();
            setDirty(true);
          },
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
          onFillColor: (c) => {
            setFillColor(c);
            canvasRef.current?.applyStyle({ fillColor: c });
          },
          onStrokeColor: (c) => {
            setStrokeColor(c);
            canvasRef.current?.applyStyle({ strokeColor: c });
          },
          onLayout: (kind) => {
            if (kind.startsWith("align-")) {
              canvasRef.current?.align(
                kind.replace("align-", "") as "left" | "center" | "right" | "top" | "middle" | "bottom"
              );
            } else if (kind === "vertical-flow") {
              canvasRef.current?.runLayout("vertical-flow");
            }
            setDirty(true);
          },
          fillColor,
          strokeColor,
          currentTheme: settings.theme ?? "automatic",
          lastLayout: null,
        }}
      />
    </div>
  );
}

export default function SharedDiagramPage() {
  return (
    <DiagramToolsProvider>
      <SharedDiagramInner />
    </DiagramToolsProvider>
  );
}
