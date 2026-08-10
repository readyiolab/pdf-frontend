import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { DiagramCanvas, type DiagramCanvasHandle } from "@/components/diagrams/DiagramCanvas";
import {
  emptyDocument,
  type DiagramDocument,
  type DiagramSettings,
} from "@/lib/diagram/model";
import { diagramsApi } from "@/services/diagramsApi";

export default function SharedDiagramPage() {
  const { token } = useParams<{ token: string }>();
  const canvasRef = useRef<DiagramCanvasHandle>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("Shared diagram");
  const [role, setRole] = useState<"VIEW" | "EDIT">("VIEW");
  const [doc, setDoc] = useState<DiagramDocument>(emptyDocument());
  const [activePageId, setActivePageId] = useState(doc.pages[0]!.id);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

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
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Share link is invalid or expired");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (loading) return;
    const page = doc.pages.find((p) => p.id === activePageId);
    if (!page) return;
    const t = setTimeout(() => {
      canvasRef.current?.loadPage(page);
      canvasRef.current?.setReadOnly(role === "VIEW");
    }, 50);
    return () => clearTimeout(t);
  }, [loading, activePageId, role, doc.pages]);

  const settings: DiagramSettings = doc.settings ?? {};

  const save = async () => {
    if (!token || role !== "EDIT") return;
    setSaving(true);
    try {
      const page = canvasRef.current?.serializePage({
        id: activePageId,
        name: doc.pages.find((p) => p.id === activePageId)?.name || "Page-1",
      });
      const next: DiagramDocument = {
        ...doc,
        pages: doc.pages.map((p) => (p.id === activePageId && page ? page : p)),
      };
      setDoc(next);
      await diagramsApi.updateShared(token, { content: next, title });
      setDirty(false);
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
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
    <div className="flex h-dvh flex-col">
      <header className="flex h-11 items-center justify-between border-b border-[#cfd8e3] bg-[#f8fafc] px-4">
        <div>
          <h1 className="text-sm font-semibold">{title}</h1>
          <p className="text-[11px] text-[#64748b]">{role === "EDIT" ? "Editable share link" : "View-only share link"}</p>
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
      <div className="min-h-0 flex-1">
        <DiagramCanvas
          ref={canvasRef}
          settings={settings}
          readOnly={role === "VIEW"}
          onDirty={() => role === "EDIT" && setDirty(true)}
        />
      </div>
      <div className="flex h-9 items-center gap-1 border-t border-[#cfd8e3] bg-[#eef2f7] px-2">
        {doc.pages.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              const cur = canvasRef.current?.serializePage({
                id: activePageId,
                name: doc.pages.find((x) => x.id === activePageId)?.name || "Page",
              });
              if (cur && role === "EDIT") {
                setDoc((d) => ({
                  ...d,
                  pages: d.pages.map((pg) => (pg.id === activePageId ? cur : pg)),
                }));
              }
              setActivePageId(p.id);
            }}
            className={`h-7 rounded-t px-3 text-xs ${
              p.id === activePageId ? "bg-white font-medium" : "text-[#64748b]"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
