import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-3">
        <Link to="/letters/studio" className="text-xs text-muted-foreground hover:underline">
          ← Letter Studio
        </Link>
        <h1 className="text-lg font-bold">Templates</h1>
        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-full"
          onClick={() => {
            setSelectedId(null);
            setName("New letter");
            setContent({ type: "doc", content: [{ type: "paragraph" }] });
          }}
        >
          New template
        </Button>
        <div className="max-h-[60vh] space-y-1 overflow-auto">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => openTemplate(t)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                selectedId === t.id ? "bg-muted font-medium" : "hover:bg-muted/50"
              }`}
            >
              <div className="truncate">{t.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {t.type} · v{t.version}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <div className="space-y-4">
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
            className="rounded-full"
            onClick={() => setAiOpen((v) => !v)}
          >
            <Sparkles className="mr-1 size-3.5" /> Ask AI to draft
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => polish("formal")}>
            Polish formal
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => polish("concise")}>
            Polish concise
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => polish("add-disclaimer")}>
            Add disclaimer
          </Button>
        </div>

        {aiOpen && (
          <div className="flex gap-2 rounded-xl border bg-muted/30 p-3">
            <Input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe the letter…"
            />
            <Button type="button" onClick={askAiDraft} className="shrink-0 rounded-full">
              Generate
            </Button>
          </div>
        )}

        {polishSuggestion && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3 text-sm">
            <div className="mb-2 font-medium">AI polish suggestion</div>
            <p className="mb-3 whitespace-pre-wrap text-muted-foreground">{polishSuggestion}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="rounded-full"
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

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving} className="rounded-full">
            {saving ? "Saving…" : "Save template"}
          </Button>
          {selectedId && (
            <Button
              variant="outline"
              className="rounded-full"
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
