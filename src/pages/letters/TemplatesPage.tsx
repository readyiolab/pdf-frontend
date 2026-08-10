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

function orgId() {
  return localStorage.getItem("letter_org_id") || "";
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
  const [templates, setTemplates] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
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

  const previewBrand = useMemo(
    () => brands.find((b) => b.id === previewBrandId) || null,
    [brands, previewBrandId]
  );

  const samplePreviewText = useMemo(() => {
    const plain = tipTapDocToPlainText(content);
    return fillPreviewTokens(plain, SAMPLE_EMPLOYEE);
  }, [content]);

  const reload = async () => {
    if (!orgId()) {
      const boot = await lettersApi.bootstrap();
      localStorage.setItem("letter_org_id", boot.org.organization.id);
    }
    let [{ templates: list }, { brands: brandList }] = await Promise.all([
      lettersApi.listTemplates(orgId()),
      lettersApi.listBrands(orgId()),
    ]);
    if (!list.length) {
      const seeded = await lettersApi.seedTemplates(orgId());
      list = seeded.templates;
    }
    setTemplates(list);
    setBrands(brandList);
    if (!previewBrandId && brandList[0]) setPreviewBrandId(brandList[0].id);
    if (!selectedId && list[0]) openTemplate(list[0]);
  };

  const openTemplate = (t: any) => {
    setSelectedId(t.id);
    setName(t.name);
    setType(t.type);
    setContent(t.contentJson);
    setEditorKey((k) => k + 1);
    setPolishPreview(null);
    setPolishContentJson(null);
  };

  useEffect(() => {
    reload().catch((e) => toast.error(e.message));
  }, []);

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
      setTemplates(res.templates);
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
              Library
            </p>
            <h1 className="font-heading text-sm font-bold text-slate-900">Templates</h1>
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
              <div className="mt-0.5 text-[11px] font-normal text-slate-500">
                {t.type.replace(/_/g, " ")} · v{t.version}
              </div>
            </button>
          ))}
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
            <div className="w-40">
              <Label className="text-xs">Type</Label>
              <select
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
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
            <div className="w-44">
              <Label className="text-xs">Preview brand</Label>
              <select
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
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
              className="h-9 rounded-xl border-slate-200"
              onClick={() => setShowSampleFill((v) => !v)}
            >
              <Eye className="mr-1.5 size-3.5" />
              {showSampleFill ? "Edit tokens" : "Sample fill"}
            </Button>
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
                    Improve with AI <ChevronDown className="ml-1 size-3.5" />
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
            Letters are stored in cloud storage when you generate a batch. Preview brand is visual
            only — you still pick a brand when creating a batch.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 border-t border-slate-200 bg-white px-4 py-3">
          <Button
            onClick={save}
            disabled={saving || generating || polishing}
            className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? "Saving…" : "Save template"}
          </Button>
          {selectedId && (
            <Button
              variant="outline"
              className="h-9 rounded-xl border-slate-200"
              disabled={generating || polishing}
              onClick={() => navigate(`/letters/batches/new?templateId=${selectedId}`)}
            >
              Use in batch
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
