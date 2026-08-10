import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { lettersApi } from "@/services/lettersApi";
import { LetterEditor } from "@/components/letters/LetterEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  StudioPageHeader,
  StudioSkeleton,
} from "@/components/letters/StudioPageHeader";
import { toast } from "sonner";
import { Loader2, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("Salary Increment Letter");
  const [type, setType] = useState<(typeof TYPES)[number]>("INCREMENT");
  const [content, setContent] = useState<any>({
    type: "doc",
    content: [{ type: "paragraph" }],
  });
  const [editorKey, setEditorKey] = useState(0);
  const [aiPrompt, setAiPrompt] = useState(
    "Write an increment letter with 12% hike, formal tone"
  );
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [improveOpen, setImproveOpen] = useState(false);
  const [polishSuggestion, setPolishSuggestion] = useState<string | null>(null);

  const reload = async () => {
    if (!orgId()) {
      const boot = await lettersApi.bootstrap();
      localStorage.setItem("letter_org_id", boot.org.organization.id);
    }
    let { templates: list } = await lettersApi.listTemplates(orgId());
    if (!list.length) {
      const seeded = await lettersApi.seedTemplates(orgId());
      list = seeded.templates;
    }
    setTemplates(list);
    if (!selectedId && list[0]) openTemplate(list[0]);
  };

  const openTemplate = (t: any) => {
    setSelectedId(t.id);
    setName(t.name);
    setType(t.type);
    setContent(t.contentJson);
    setEditorKey((k) => k + 1);
  };

  useEffect(() => {
    reload().catch((e) => toast.error(e.message));
  }, []);

  useEffect(() => {
    if (params.get("ai") === "1") {
      /* AI composer is always visible — focus prompt via scroll if needed */
    }
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
    try {
      const text = JSON.stringify(content).slice(0, 2000);
      const res = await lettersApi.aiPolish(orgId(), { text, mode });
      setPolishSuggestion(res.suggestion);
      toast.message("Suggestion ready — click Apply to use it");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPolishing(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* Library */}
      <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-[#F8FAFC] lg:w-56 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
              Library
            </p>
            <h1 className="font-heading text-sm font-bold text-slate-900">Templates</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border-slate-200 text-xs"
            disabled={generating}
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
              disabled={generating}
              onClick={() => openTemplate(t)}
              className={cn(
                "mb-0.5 block w-full rounded-lg px-2.5 py-2 text-left text-sm transition",
                selectedId === t.id
                  ? "bg-indigo-50 font-semibold text-indigo-900"
                  : "text-slate-700 hover:bg-white"
              )}
            >
              <div className="truncate">{t.name}</div>
              <div className="text-[11px] font-normal text-slate-500">
                {t.type} · v{t.version}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Editor pane */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="shrink-0 space-y-3 border-b border-slate-200 px-4 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Letter name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={generating}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <select
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                disabled={!!selectedId || generating}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Single AI composer */}
          <div className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-800">
              <Sparkles className="size-3.5" />
              Write with AI
            </div>
            <div className="flex gap-2">
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
            <div className="relative">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
                onClick={() => setImproveOpen((v) => !v)}
                disabled={generating || polishing}
              >
                Improve with AI <ChevronDown className="size-3" />
              </button>
              {improveOpen && (
                <div className="absolute left-0 z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
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
          </div>

          {polishSuggestion && (
            <div className="rounded-xl border border-indigo-100 bg-white p-3 text-sm">
              <div className="mb-1 font-semibold text-slate-900">AI suggestion</div>
              <p className="mb-2 whitespace-pre-wrap text-xs text-slate-600">
                {polishSuggestion}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => {
                    setContent({
                      type: "doc",
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: polishSuggestion }],
                        },
                      ],
                    });
                    setEditorKey((k) => k + 1);
                    setPolishSuggestion(null);
                    toast.success("Applied — remember to Save");
                  }}
                >
                  Apply
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  onClick={() => setPolishSuggestion(null)}
                >
                  Discard
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {generating && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-white/85">
              <StudioSkeleton className="h-10 w-10 rounded-full" />
              <StudioSkeleton className="h-3 w-40" />
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-900">Generating letter…</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  It will appear in the editor when ready
                </p>
              </div>
            </div>
          )}
          <LetterEditor
            key={`${selectedId || "new"}-${editorKey}`}
            content={content}
            onChange={setContent}
            className="min-h-[360px]"
          />
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 border-t border-slate-200 px-4 py-3">
          <Button
            onClick={save}
            disabled={saving || generating}
            className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? "Saving…" : "Save template"}
          </Button>
          {selectedId && (
            <Button
              variant="outline"
              className="h-9 rounded-xl border-slate-200"
              disabled={generating}
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
