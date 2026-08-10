import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { diagramsApi } from "@/services/diagramsApi";
import type { DiagramDocument, DiagramPage } from "@/lib/diagram/model";

type Props = {
  open: boolean;
  mode: "generate" | "edit" | "image";
  onClose: () => void;
  organizationId: string;
  diagramId: string | null;
  currentPage: DiagramPage | null;
  getCurrentPage?: () => DiagramPage | null;
  onGenerated: (doc: DiagramDocument) => void;
  onEdited: (page: DiagramPage) => void;
};

export function AiPanel({
  open,
  mode,
  onClose,
  organizationId,
  diagramId,
  currentPage,
  getCurrentPage,
  onGenerated,
  onEdited,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const title =
    mode === "generate"
      ? "Generate diagram from text"
      : mode === "edit"
        ? "Edit diagram with AI"
        : "Image to diagram";

  const runGenerate = async () => {
    setBusy(true);
    setError(null);
    try {
      const { document } = await diagramsApi.aiGenerate(organizationId, prompt);
      onGenerated(document);
      onClose();
    } catch (e: any) {
      setError(e?.message || "AI generate failed");
    } finally {
      setBusy(false);
    }
  };

  const runEdit = async () => {
    const page = getCurrentPage?.() ?? currentPage;
    if (!diagramId || !page) {
      setError("Save the diagram first, then try AI edit.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { page: next } = await diagramsApi.aiEdit(organizationId, diagramId, prompt, page);
      onEdited(next);
      onClose();
    } catch (e: any) {
      setError(e?.message || "AI edit failed");
    } finally {
      setBusy(false);
    }
  };

  const runImage = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5MB or smaller.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
      const imageBase64 = btoa(binary);
      const { document } = await diagramsApi.aiFromImage(organizationId, {
        imageBase64,
        mimeType: (file.type as "image/png" | "image/jpeg") || "image/png",
        prompt: prompt || undefined,
      });
      onGenerated(document);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Image-to-diagram failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" className="text-sm text-[#64748b]" onClick={onClose}>
            Close
          </button>
        </div>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            mode === "edit"
              ? "e.g. Add a payment service between checkout and database"
              : mode === "image"
                ? "Optional hint for the model…"
                : "Describe the diagram you want…"
          }
          className="min-h-[120px] rounded-lg text-sm"
        />
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        <div className="mt-4 flex items-center justify-end gap-2">
          {mode === "image" && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void runImage(f);
                }}
              />
              <Button
                type="button"
                className="rounded-lg"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                {busy ? <Spinner className="size-4" /> : "Upload image"}
              </Button>
            </>
          )}
          {mode === "generate" && (
            <Button className="rounded-lg" disabled={busy || prompt.trim().length < 3} onClick={runGenerate}>
              {busy ? <Spinner className="size-4" /> : "Generate"}
            </Button>
          )}
          {mode === "edit" && (
            <Button className="rounded-lg" disabled={busy || prompt.trim().length < 2} onClick={runEdit}>
              {busy ? <Spinner className="size-4" /> : "Apply edit"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
