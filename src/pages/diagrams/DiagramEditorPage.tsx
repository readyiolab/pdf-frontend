import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DiagramCanvas, type DiagramCanvasHandle, type SelectionInfo } from "@/components/diagrams/DiagramCanvas";
import { ShapePanel } from "@/components/diagrams/ShapePanel";
import { FormatPanel } from "@/components/diagrams/FormatPanel";
import { MenuBar } from "@/components/diagrams/MenuBar";
import { DiagramToolbar } from "@/components/diagrams/Toolbar";
import { PageTabs } from "@/components/diagrams/PageTabs";
import { AiPanel } from "@/components/diagrams/AiPanel";
import { ShareDialog } from "@/components/diagrams/ShareDialog";
import { PageSetupDialog } from "@/components/diagrams/PageSetupDialog";
import {
  emptyDocument,
  emptyPage,
  PAPER_SIZES,
  type DiagramDocument,
  type DiagramPage,
  type DiagramSettings,
} from "@/lib/diagram/model";
import type { ShapeDef } from "@/lib/diagram/shapes";
import { downloadBlob, exportPdf, exportPng, exportSvg, printSvg } from "@/lib/diagram/export";
import { lettersApi } from "@/services/lettersApi";
import {
  diagramsApi,
  getDiagramOrgId,
  setDiagramOrgId,
} from "@/services/diagramsApi";
import type { CellStyle } from "@maxgraph/core";

export default function DiagramEditorPage() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNew = !routeId || routeId === "new";

  const canvasRef = useRef<DiagramCanvasHandle>(null);
  const [orgId, setOrgId] = useState<string | null>(getDiagramOrgId());
  const [diagramId, setDiagramId] = useState<string | null>(isNew ? null : routeId!);
  const [title, setTitle] = useState("Untitled Diagram");
  const [doc, setDoc] = useState<DiagramDocument>(() => emptyDocument());
  const [activePageId, setActivePageId] = useState(() => emptyDocument().pages[0]!.id);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [pageSetupOpen, setPageSetupOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMode, setAiMode] = useState<"generate" | "edit" | "image">("generate");
  const loadedRef = useRef(false);
  const pageQueryApplied = useRef(false);

  const settings: DiagramSettings = doc.settings ?? {};
  const activePage = useMemo(
    () => doc.pages.find((p) => p.id === activePageId) ?? doc.pages[0]!,
    [doc.pages, activePageId]
  );

  const markDirty = useCallback(() => setDirty(true), []);

  // Bootstrap + load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let oid = getDiagramOrgId();
        if (!oid) {
          const boot = await lettersApi.bootstrap();
          oid = boot.org.organization.id as string;
          setDiagramOrgId(oid);
        }
        if (!oid) throw new Error("Organization is required");
        if (cancelled) return;
        setOrgId(oid);

        if (isNew) {
          const created = await diagramsApi.create(oid, { title: "Untitled Diagram" });
          if (cancelled) return;
          setDiagramId(created.diagram.id);
          navigate(`/diagrams/${created.diagram.id}`, { replace: true });
          const content = created.diagram.content ?? emptyDocument();
          setDoc(content);
          setActivePageId(content.pages[0]!.id);
          setTitle(created.diagram.title);
          setLoading(false);
          return;
        }

        setLoading(true);
        const { diagram } = await diagramsApi.get(oid, routeId!);
        if (cancelled) return;
        const content = diagram.content ?? emptyDocument();
        setDoc(content);
        setActivePageId(content.pages[0]!.id);
        setTitle(diagram.title);
        setDiagramId(diagram.id);
        setDirty(false);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load diagram");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  // Load page into canvas when ready
  useEffect(() => {
    if (loading) return;
    const page = doc.pages.find((p) => p.id === activePageId);
    if (!page) return;
    // slight delay so canvas mounts
    const t = setTimeout(() => {
      canvasRef.current?.loadPage(page);
      loadedRef.current = true;
    }, 50);
    return () => clearTimeout(t);
  }, [loading, activePageId, diagramId]);

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

  const save = useCallback(async () => {
    if (!orgId || !diagramId || saving) return;
    setSaving(true);
    setError(null);
    try {
      const nextDoc = syncActivePageFromCanvas();
      setDoc(nextDoc);
      await diagramsApi.update(orgId, diagramId, { title, content: nextDoc });
      setDirty(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }, [orgId, diagramId, saving, syncActivePageFromCanvas, title]);

  // Ctrl+S and shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
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
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        canvas.deleteSelection();
      }
      if (e.key === "Escape") canvas.clearSelection();
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
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
  }, [save]);

  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty]);

  /** BrowserRouter does not support useBlocker — confirm before in-app leaves. */
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
    const idx = afterId ? nextDoc.pages.findIndex((p) => p.id === afterId) : nextDoc.pages.length - 1;
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

  // Apply ?page= deep link once after load
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

  const addShape = (shape: ShapeDef) => {
    canvasRef.current?.addShape(shape);
    setDirty(true);
  };

  const onDropShape = (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-diagram-shape");
    if (!raw) return;
    try {
      const shape = JSON.parse(raw) as ShapeDef;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      canvasRef.current?.addShape(shape, {
        x: e.clientX - rect.left - 40,
        y: e.clientY - rect.top - 40,
      });
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
            const { diagram } = await diagramsApi.duplicate(orgId, diagramId);
            navigate(`/diagrams/${diagram.id}`);
          },
        },
        { type: "sep" as const },
        { type: "item" as const, label: "Page Setup…", onClick: () => setPageSetupOpen(true) },
        { type: "sep" as const },
        { type: "item" as const, label: "Export as PNG…", onClick: () => void doExport("png") },
        { type: "item" as const, label: "Export as SVG…", onClick: () => void doExport("svg") },
        { type: "item" as const, label: "Export as PDF…", onClick: () => void doExport("pdf") },
        { type: "item" as const, label: "Print…", onClick: () => {
          const g = canvasRef.current?.getGraph();
          if (g) printSvg(g);
        } },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      items: [
        { type: "item" as const, label: "Undo", shortcut: "Ctrl+Z", onClick: () => canvasRef.current?.undo() },
        { type: "item" as const, label: "Redo", shortcut: "Ctrl+Y", onClick: () => canvasRef.current?.redo() },
        { type: "sep" as const },
        { type: "item" as const, label: "Cut", shortcut: "Ctrl+X", onClick: () => canvasRef.current?.cut() },
        { type: "item" as const, label: "Copy", shortcut: "Ctrl+C", onClick: () => canvasRef.current?.copy() },
        { type: "item" as const, label: "Paste", shortcut: "Ctrl+V", onClick: () => canvasRef.current?.paste() },
        { type: "item" as const, label: "Duplicate", shortcut: "Ctrl+D", onClick: () => canvasRef.current?.duplicate() },
        { type: "item" as const, label: "Delete", onClick: () => canvasRef.current?.deleteSelection() },
        { type: "sep" as const },
        { type: "item" as const, label: "Select All", shortcut: "Ctrl+A", onClick: () => canvasRef.current?.selectAll() },
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
        { type: "item" as const, label: "Distribute Horizontally", onClick: () => canvasRef.current?.distribute("h") },
        { type: "item" as const, label: "Distribute Vertically", onClick: () => canvasRef.current?.distribute("v") },
        { type: "sep" as const },
        { type: "item" as const, label: "Auto Layout", onClick: () => canvasRef.current?.autoLayout() },
      ],
    },
    {
      id: "extras",
      label: "Extras",
      items: [
        {
          type: "item" as const,
          label: "AI Generate…",
          onClick: () => {
            setAiMode("generate");
            setAiOpen(true);
          },
        },
        {
          type: "item" as const,
          label: "AI Edit…",
          onClick: () => {
            setAiMode("edit");
            setAiOpen(true);
          },
        },
        {
          type: "item" as const,
          label: "Image to Diagram…",
          onClick: () => {
            setAiMode("image");
            setAiOpen(true);
          },
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
          onClick: () =>
            alert(
              "Ctrl+S Save · Ctrl+Z/Y Undo/Redo · Ctrl+C/X/V/D Copy/Cut/Paste/Duplicate · Delete · Arrows nudge · Ctrl+wheel zoom"
            ),
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
      {/* Title bar */}
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

      <DiagramToolbar
        zoom={zoom}
        onZoomChange={(z) => {
          canvasRef.current?.setZoom(z);
          setZoom(z);
        }}
        onZoomIn={() => canvasRef.current?.zoomIn()}
        onZoomOut={() => canvasRef.current?.zoomOut()}
        onUndo={() => canvasRef.current?.undo()}
        onRedo={() => canvasRef.current?.redo()}
        onDelete={() => canvasRef.current?.deleteSelection()}
        onToFront={() => canvasRef.current?.bringToFront()}
        onToBack={() => canvasRef.current?.sendToBack()}
        onAutoLayout={() => canvasRef.current?.autoLayout()}
        onAiGenerate={() => {
          setAiMode("generate");
          setAiOpen(true);
        }}
        onAiImage={() => {
          setAiMode("image");
          setAiOpen(true);
        }}
      />

      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-3 py-1 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <ShapePanel onAddShape={addShape} />
        <div
          className="relative min-w-0 flex-1"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropShape}
        >
          <DiagramCanvas
            ref={canvasRef}
            settings={settings}
            onDirty={markDirty}
            onSelectionChange={setSelection}
            onZoomChange={setZoom}
          />
        </div>
        <FormatPanel
          settings={settings}
          onSettingsChange={applySettings}
          selection={selection}
          onApplyStyle={applyStyle}
          onOpenPageSetup={() => setPageSetupOpen(true)}
        />
      </div>

      <PageTabs
        pages={doc.pages}
        activePageId={activePageId}
        onSelect={switchPage}
        onInsert={insertPage}
        onRename={renamePage}
        onRemove={removePage}
        onDuplicate={duplicatePage}
        onDeleteAll={deleteAllPages}
        onSort={sortPages}
        onMove={movePage}
        onOpenInNewWindow={openPageInNewWindow}
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

      {orgId && (
        <AiPanel
          open={aiOpen}
          mode={aiMode}
          onClose={() => setAiOpen(false)}
          organizationId={orgId}
          diagramId={diagramId}
          currentPage={activePage}
          getCurrentPage={() => {
            const next = syncActivePageFromCanvas();
            return next.pages.find((p) => p.id === activePageId) ?? null;
          }}
          onGenerated={(document) => {
            setDoc(document);
            setActivePageId(document.pages[0]!.id);
            setDirty(true);
            setTimeout(() => {
              canvasRef.current?.loadPage(document.pages[0]!);
              canvasRef.current?.autoLayout();
            }, 50);
          }}
          onEdited={(page) => {
            setDoc((d) => ({
              ...d,
              pages: d.pages.map((p) => (p.id === activePageId ? { ...page, id: activePageId, name: p.name } : p)),
            }));
            setDirty(true);
            setTimeout(() => {
              canvasRef.current?.loadPage({ ...page, id: activePageId, name: activePage.name });
            }, 50);
          }}
        />
      )}
    </div>
  );
}
