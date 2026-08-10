import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { lettersApi } from "@/services/lettersApi";
import { LetterEditor } from "@/components/letters/LetterEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

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
  const [content, setContent] = useState<any>({ type: "doc", content: [{ type: "paragraph" }] });
  const [aiPrompt, setAiPrompt] = useState("Write an increment letter with 12% hike, formal tone");
  const [aiOpen, setAiOpen] = useState(params.get("ai") === "1");
  const [saving, setSaving] = useState(false);
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
    if (!selectedId && list[0]) {
      openTemplate(list[0]);
    }
  };

  const openTemplate = (t: any) => {
    setSelectedId(t.id);
    setName(t.name);
    setType(t.type);
    setContent(t.contentJson);
  };

  useEffect(() => {
    reload().catch((e) => toast.error(e.message));
  }, []);

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
    try {
      const result = await lettersApi.aiDraft(orgId(), {
        instruction: aiPrompt,
        letterType: type,
      });
      setContent(result.contentJson);
      toast.success("AI draft ready — review and Save to apply");
      await lettersApi.aiApplyDraft(orgId(), {
        templateId: selectedId,
        contentJson: result.contentJson,
        name,
        type,
      });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const polish = async (mode: "formal" | "concise" | "add-disclaimer") => {
    try {
      const text = JSON.stringify(content).slice(0, 2000);
      const res = await lettersApi.aiPolish(orgId(), { text, mode });
      setPolishSuggestion(res.suggestion);
      toast.message("Polish suggestion ready — click Apply to use it");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-3 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-sm">
        <div>
          <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
            Library
          </p>
          <h1 className="font-heading px-2 text-lg font-bold text-slate-900">Templates</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-xl border-slate-200"
          onClick={() => {
            setSelectedId(null);
            setName("New letter");
            setContent({ type: "doc", content: [{ type: "paragraph" }] });
          }}
        >
          New template
        </Button>
        <div className="max-h-[55vh] space-y-0.5 overflow-auto">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => openTemplate(t)}
              className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                selectedId === t.id
                  ? "bg-indigo-50 font-semibold text-indigo-900"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="truncate">{t.name}</div>
              <div className="text-[11px] font-normal text-slate-500">
                {t.type} · v{t.version}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Type</Label>
            <select
              className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              disabled={!!selectedId}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl border-slate-200"
            onClick={() => setAiOpen((v) => !v)}
          >
            <Sparkles className="mr-1 size-3.5" /> Ask AI to draft
          </Button>
          <Button type="button" variant="ghost" size="sm" className="rounded-lg" onClick={() => polish("formal")}>
            Polish formal
          </Button>
          <Button type="button" variant="ghost" size="sm" className="rounded-lg" onClick={() => polish("concise")}>
            Polish concise
          </Button>
          <Button type="button" variant="ghost" size="sm" className="rounded-lg" onClick={() => polish("add-disclaimer")}>
            Add disclaimer
          </Button>
        </div>

        {aiOpen && (
          <div className="flex gap-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
            <Input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe the letter…"
              className="bg-white"
            />
            <Button
              type="button"
              onClick={askAiDraft}
              className="shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700"
            >
              Generate
            </Button>
          </div>
        )}

        {polishSuggestion && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 text-sm">
            <div className="mb-2 font-semibold text-slate-900">AI polish suggestion</div>
            <p className="mb-3 whitespace-pre-wrap text-slate-600">{polishSuggestion}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
                onClick={() => {
                  setContent({
                    type: "doc",
                    content: [
                      { type: "paragraph", content: [{ type: "text", text: polishSuggestion }] },
                    ],
                  });
                  setPolishSuggestion(null);
                  toast.success("Applied — remember to Save");
                }}
              >
                Apply
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPolishSuggestion(null)}>
                Discard
              </Button>
            </div>
          </div>
        )}

        <LetterEditor key={selectedId || "new"} content={content} onChange={setContent} />

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <Button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? "Saving…" : "Save template"}
          </Button>
          {selectedId && (
            <Button
              variant="outline"
              className="rounded-xl border-slate-200"
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
