import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { lettersApi } from "@/services/lettersApi";
import { LetterEditor } from "@/components/letters/LetterEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StudioSkeleton } from "@/components/letters/StudioPageHeader";
import { toast } from "sonner";
import { Loader2, Sparkles, ChevronDown, Eye, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  tipTapDocToPlainText,
  plainTextToTipTapDoc,
  fillPreviewTokens,
  SAMPLE_EMPLOYEE,
} from "@/lib/tipTapLetter";
import { useAuth } from "@/features/auth/useAuth";
import { useBrands, useTemplates } from "@/features/letters";
import { ensureOrg } from "@/features/org";
import { readLetterOrgId } from "@/features/letters/orgHelpers";

function orgId() {
  return readLetterOrgId();
}

const TYPES = [
  "INCREMENT",
  "PROMOTION",
  "SALARY_REVISION",
  "OFFER",
  "CONFIRMATION",
  "WARNING",
  "SEPARATION",
] as const;

const FONT_STACK: Record<string, string> = {
  Inter: "Inter, system-ui, sans-serif",
  Georgia: "Georgia, 'Times New Roman', serif",
  "Times New Roman": "'Times New Roman', Times, serif",
  "Plus Jakarta Sans": "'Plus Jakarta Sans', Inter, sans-serif",
};

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const templatesQuery = useTemplates(user?.id);
  const brandsQuery = useBrands(user?.id);
  const templates = templatesQuery.data?.templates ?? [];
  const brands = brandsQuery.data?.brands ?? [];
  const [previewBrandId, setPreviewBrandId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("Salary Increment Letter");
  const [type, setType] = useState<(typeof TYPES)[number]>("INCREMENT");
  const [content, setContent] = useState<any>({
    type: "doc",
    content: [{ type: "paragraph" }],
  });
  const [editorKey, setEditorKey] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState(
    "Write an increment letter with 12% hike, formal tone"
  );
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [improveOpen, setImproveOpen] = useState(false);
  const [polishPreview, setPolishPreview] = useState<string | null>(null);
  const [polishContentJson, setPolishContentJson] = useState<any | null>(null);
  const [showSampleFill, setShowSampleFill] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const previewBrand = useMemo(
    () => brands.find((b: { id: string }) => b.id === previewBrandId) || null,
    [brands, previewBrandId]
  );

  const samplePreviewText = useMemo(() => {
    const plain = tipTapDocToPlainText(content);
    return fillPreviewTokens(plain, SAMPLE_EMPLOYEE);
  }, [content]);

  const openTemplate = (t: any) => {
    setSelectedId(t.id);
    setName(t.name);
    setType(t.type);
    setContent(t.contentJson);
    setEditorKey((k) => k + 1);
  };

  useEffect(() => {
    if (!previewBrandId && brands[0]) setPreviewBrandId(brands[0].id);
  }, [brands, previewBrandId]);

  useEffect(() => {
    if (!selectedId && templates[0]) openTemplate(templates[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates]);

  useEffect(() => {
    const err = templatesQuery.error || brandsQuery.error;
    if (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load templates");
    }
  }, [templatesQuery.error, brandsQuery.error]);

  const reload = async () => {
    await ensureOrg(user?.id);
    await Promise.all([templatesQuery.refetch(), brandsQuery.refetch()]);
  };

  useEffect(() => {
    // Query hooks load data; this only handles deep-link templateId once templates arrive
    const tid = params.get("templateId");
    if (tid && templates.length) {
      const found = templates.find((t: { id: string }) => t.id === tid);
      if (found) openTemplate(found);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, templates]);

  useEffect(() => {
    if (params.get("ai") === "1") setAiOpen(true);
  }, [params]);

  const save = async () => {
    setSaving(true);
    try {
      if (selectedId) {
        const { template } = await lettersApi.updateTemplate(orgId(), selectedId, {
          name,
          contentJson: content,
          bumpVersion: true,
        });
        toast.success(`Saved v${template.version}`);
      } else {
        const { template } = await lettersApi.createTemplate(orgId(), {
          name,
          type,
          contentJson: content,
        });
        setSelectedId(template.id);
        toast.success("Template created");
      }
      await reload();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const askAiDraft = async () => {
    if (!aiPrompt.trim() || generating) return;
    setGenerating(true);
    try {
      const result = await lettersApi.aiDraft(orgId(), {
        instruction: aiPrompt.trim(),
        letterType: type,
      });
      const draft = result.contentJson;
      setContent(draft);
      setEditorKey((k) => k + 1);
      toast.success("Draft loaded in the editor — review and Save");
      await lettersApi
        .aiApplyDraft(orgId(), {
          templateId: selectedId,
          contentJson: draft,
          name,
          type,
        })
        .catch(() => undefined);
    } catch (e: any) {
      toast.error(e.message || "AI draft failed");
    } finally {
      setGenerating(false);
    }
  };

  const polish = async (mode: "formal" | "concise" | "add-disclaimer") => {
    if (polishing || generating) return;
    setPolishing(true);
    setImproveOpen(false);
    setPolishPreview(null);
    setPolishContentJson(null);
    try {
      const text = tipTapDocToPlainText(content).slice(0, 6000);
      if (!text.trim()) {
        toast.error("Add letter content before improving");
        return;
      }
      const res = await lettersApi.aiPolish(orgId(), { text, mode });
      const preview =
        res.suggestionPreview ||
        res.suggestion ||
        (res.contentJson ? tipTapDocToPlainText(res.contentJson) : "");
      // Guard: never show raw JSON in the panel
      const safePreview =
        preview.trim().startsWith("{") && preview.includes('"type"')
          ? tipTapDocToPlainText(
              res.contentJson || plainTextToTipTapDoc(text)
            )
          : preview;
      setPolishPreview(safePreview);
      setPolishContentJson(
        res.contentJson && res.contentJson.type === "doc"
          ? res.contentJson
          : plainTextToTipTapDoc(safePreview || text)
      );
      toast.message("Suggestion ready — click Apply to use it");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPolishing(false);
    }
  };

  const applyPolish = () => {
    const next =
      polishContentJson && polishContentJson.type === "doc"
        ? polishContentJson
        : plainTextToTipTapDoc(polishPreview || "");
    setContent(next);
    setEditorKey((k) => k + 1);
    setPolishPreview(null);
    setPolishContentJson(null);
    toast.success("Applied — remember to Save");
  };

  const refreshStarters = async (overwrite: boolean) => {
    if (overwrite) {
      const ok = window.confirm(
        "Replace the built-in starter templates with the latest professional versions? Your custom templates are kept."
      );
      if (!ok) return;
    }
    setRefreshing(true);
    try {
      const res = await lettersApi.refreshStarterTemplates(orgId(), overwrite);
      await templatesQuery.refetch();
      toast.success(
        overwrite
          ? `Updated ${res.refreshed} starter(s)`
          : res.seeded
            ? `Added ${res.seeded} starter(s)`
            : "Starters already up to date"
      );
      if (res.templates[0] && overwrite) openTemplate(res.templates[0]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fontFamily =
    FONT_STACK[previewBrand?.defaultFont] ||
    previewBrand?.defaultFont ||
    FONT_STACK.Georgia;

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* Library */}
      <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-[var(--studio-paper,#F4F6F8)] lg:w-60 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700">
              Your letters
            </p>
            <h1 className="font-heading text-sm font-bold text-slate-900">Letter templates</h1>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Start from a starter on the left, or click New.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border-slate-200 text-xs"
            disabled={generating || polishing}
            onClick={() => {
              setSelectedId(null);
              setName("New letter");
              setContent({ type: "doc", content: [{ type: "paragraph" }] });
              setEditorKey((k) => k + 1);
            }}
          >
            New
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={generating || polishing}
              onClick={() => openTemplate(t)}
              className={cn(
                "mb-1 block w-full rounded-xl border px-2.5 py-2.5 text-left text-sm transition",
                selectedId === t.id
                  ? "border-indigo-200 bg-white shadow-sm font-semibold text-indigo-950"
                  : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-white"
              )}
            >
              <div className="truncate">{t.name}</div>
            </button>
          ))}
          {templates.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-slate-500">
              No letters yet. Click New or Refresh starters.
            </p>
          )}
        </div>
        <div className="border-t border-slate-200 p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-start gap-1.5 rounded-lg text-xs text-slate-600"
            disabled={refreshing}
            onClick={() => refreshStarters(true)}
          >
            {refreshing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Refresh starters
          </Button>
        </div>
      </aside>

      {/* Editor pane */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--studio-canvas,#E8ECF0)]">
        {/* Sticky toolbar */}
        <div className="shrink-0 space-y-2 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[160px] flex-1">
              <Label className="text-xs">Letter name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={generating || polishing}
                className="h-9"
              />
            </div>
            <Button
              onClick={save}
              disabled={saving || generating || polishing}
              className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
            {selectedId && (
              <Button
                variant="outline"
                className="h-9 rounded-xl border-slate-200"
                disabled={generating || polishing}
                onClick={() => navigate(`/letters/batches/new?templateId=${selectedId}`)}
              >
                Use in send
              </Button>
            )}
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-xl border-slate-200"
                onClick={() => setMoreOpen((v) => !v)}
              >
                More options <ChevronDown className="ml-1 size-3.5" />
              </Button>
              {moreOpen && (
                <div className="absolute right-0 z-30 mt-1 w-64 space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                  <div>
                    <Label className="text-xs">Letter type</Label>
                    <select
                      className="mt-1 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      disabled={!!selectedId || generating}
                    >
                      {TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Preview company look</Label>
                    <select
                      className="mt-1 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                      value={previewBrandId}
                      onChange={(e) => setPreviewBrandId(e.target.value)}
                    >
                      <option value="">None</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant={showSampleFill ? "secondary" : "outline"}
                    size="sm"
                    className="h-9 w-full rounded-xl border-slate-200"
                    onClick={() => {
                      setShowSampleFill((v) => !v);
                      setMoreOpen(false);
                    }}
                  >
                    <Eye className="mr-1.5 size-3.5" />
                    {showSampleFill ? "Back to editing" : "Preview with sample name"}
                  </Button>
                </div>
              )}
            </div>
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-xl border-slate-200"
                disabled={generating || polishing}
                onClick={() => setImproveOpen((v) => !v)}
              >
                {polishing ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Improving…
                  </>
                ) : (
                  <>
                    Help me write <ChevronDown className="ml-1 size-3.5" />
                  </>
                )}
              </Button>
              {improveOpen && !polishing && (
                <div className="absolute right-0 z-30 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                  {(
                    [
                      ["formal", "Make more formal"],
                      ["concise", "Make shorter"],
                      ["add-disclaimer", "Add disclaimer"],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                      onClick={() => polish(mode)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 rounded-xl text-indigo-700"
              onClick={() => setAiOpen((v) => !v)}
            >
              <Sparkles className="mr-1 size-3.5" />
              Write with AI
            </Button>
          </div>

          {aiOpen && (
            <div className="flex gap-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-2">
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe the letter you need…"
                className="h-9 bg-white"
                disabled={generating}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void askAiDraft();
                  }
                }}
              />
              <Button
                type="button"
                onClick={askAiDraft}
                disabled={generating || !aiPrompt.trim()}
                className="h-9 shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  "Generate"
                )}
              </Button>
            </div>
          )}

          {polishPreview && (
            <div className="rounded-xl border border-indigo-100 bg-white p-3 text-sm shadow-sm">
              <div className="mb-1 font-semibold text-slate-900">AI suggestion</div>
              <p className="mb-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                {polishPreview}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700"
                  onClick={applyPolish}
                >
                  Apply
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  onClick={() => {
                    setPolishPreview(null);
                    setPolishContentJson(null);
                  }}
                >
                  Discard
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* A4 canvas */}
        <div className="relative min-h-0 flex-1 overflow-y-auto px-3 py-6 sm:px-6">
          {(generating || polishing) && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[var(--studio-canvas,#E8ECF0)]/80 backdrop-blur-[1px]">
              <StudioSkeleton className="h-10 w-10 rounded-full" />
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-900">
                  {polishing ? "Improving letter…" : "Generating letter…"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  It will appear on the page when ready
                </p>
              </div>
            </div>
          )}

          <div
            className="mx-auto w-full max-w-[720px] rounded-sm bg-[#FFFEFA] shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_40px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/5"
            style={{ fontFamily }}
          >
            {/* Brand chrome */}
            {(previewBrand?.letterheadKey || previewBrand?.name) && (
              <div className="border-b border-slate-100 px-8 pt-8 pb-4 sm:px-12">
                {previewBrand?.name && (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {previewBrand.name}
                  </p>
                )}
                {(previewBrand?.signatoryName || previewBrand?.footerText) && (
                  <p className="mt-1 text-xs text-slate-500">
                    {[previewBrand.signatoryName, previewBrand.signatoryDesignation]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            )}

            <div className="px-6 py-6 sm:px-10 sm:py-8">
              {showSampleFill ? (
                <div className="min-h-[420px] whitespace-pre-wrap text-[15px] leading-[1.65] text-slate-900">
                  {samplePreviewText || "Empty letter — add content in edit mode."}
                  {previewBrand?.signatoryName && (
                    <div className="mt-12 text-sm">
                      <p className="font-semibold">{previewBrand.signatoryName}</p>
                      {previewBrand.signatoryDesignation && (
                        <p className="text-slate-500">{previewBrand.signatoryDesignation}</p>
                      )}
                    </div>
                  )}
                  {previewBrand?.footerText && (
                    <p className="mt-10 border-t border-slate-200 pt-3 text-[11px] text-slate-500">
                      {previewBrand.footerText}
                    </p>
                  )}
                </div>
              ) : (
                <LetterEditor
                  key={`${selectedId || "new"}-${editorKey}`}
                  content={content}
                  onChange={setContent}
                  paper
                  fontFamily={fontFamily}
                />
              )}
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-[720px] text-center text-[11px] text-slate-500">
            Write the letter. Put employee name/salary where they change. Then Save → Use in send.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:hidden">
          <Button
            onClick={save}
            disabled={saving || generating || polishing}
            className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
          {selectedId && (
            <Button
              variant="outline"
              className="h-9 rounded-xl border-slate-200"
              disabled={generating || polishing}
              onClick={() => navigate(`/letters/batches/new?templateId=${selectedId}`)}
            >
              Use in send
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
