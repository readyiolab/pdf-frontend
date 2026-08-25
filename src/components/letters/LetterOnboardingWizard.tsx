import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { lettersApi } from "@/services/lettersApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { ArrowRight, Check, FileSpreadsheet, Palette, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LETTER_HOW_IT_WORKS,
  LETTER_STEP_META,
  markLetterOnboardingDone,
  shouldShowLetterOnboarding,
} from "@/lib/letterOnboarding";
import { readLetterOrgId, writeLetterOrgId } from "@/features/letters/orgHelpers";

function orgId() {
  return readLetterOrgId();
}

const STEPS = LETTER_STEP_META.map((s) => ({
  n: s.n,
  title: s.title,
  icon: s.n === 1 ? Palette : s.n === 2 ? PenLine : FileSpreadsheet,
}));

/**
 * First-visit guided overlay. Shown until completed/skipped when brand/template
 * checklist is incomplete.
 */
export function LetterOnboardingWizard() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  const [brandName, setBrandName] = useState("Company brand");
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryDesignation, setSignatoryDesignation] = useState("");

  const [templates, setTemplates] = useState<any[]>([]);
  const [pickedTemplateId, setPickedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const boot = await lettersApi.bootstrap();
        const id = boot.org.organization.id;
        writeLetterOrgId(id, {
          role: boot.org.role,
          orgName: boot.org.organization.name,
        });
        const [brands, tpls] = await Promise.all([
          lettersApi.listBrands(id).catch(() => ({ brands: [] as any[] })),
          lettersApi.listTemplates(id).catch(() => ({ templates: [] as any[] })),
        ]);
        let list = tpls.templates || [];
        if (!list.length) {
          const seeded = await lettersApi.seedTemplates(id).catch(() => null);
          list = seeded?.templates || [];
        }
        if (cancelled) return;
        setTemplates(list);
        if (list[0]) setPickedTemplateId(list[0].id);
        const show = shouldShowLetterOnboarding({
          brandCount: brands.brands?.length || 0,
          templateCount: list.length,
        });
        if (brands.brands?.length) setStep(list.length ? 3 : 2);
        setOpen(show);
      } catch {
        /* hub will surface errors */
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const finish = (goTo?: string) => {
    markLetterOnboardingDone();
    setOpen(false);
    if (goTo) navigate(goTo);
    else navigate("/letters/studio");
  };

  const saveBrand = async () => {
    setBusy(true);
    try {
      await lettersApi.createBrand(orgId(), {
        name: brandName || "Company brand",
        signatoryName,
        signatoryDesignation,
        footerText: "",
        defaultFont: "Inter",
        logoKey: null,
        letterheadKey: null,
      });
      toast.success("Brand saved");
      setStep(2);
    } catch (e: any) {
      toast.error(e.message || "Could not save brand");
    } finally {
      setBusy(false);
    }
  };

  if (checking || !open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <div className="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:rounded-2xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Welcome — 3 quick steps
          </p>
          <h2 className="font-heading mt-1 text-xl font-bold text-slate-900">
            Let’s set up Letter Studio
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            You write one letter, then fill it for many employees from Excel.
          </p>
          <ol className="mt-4 flex gap-2">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const active = s.n === step;
              const done = s.n < step;
              return (
                <li
                  key={s.n}
                  className={cn(
                    "flex flex-1 items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold",
                    active
                      ? "bg-indigo-600 text-white"
                      : done
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-slate-100 text-slate-500"
                  )}
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-black/10">
                    {done ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                  </span>
                  <span className="hidden sm:inline">{s.title}</span>
                  <span className="sm:hidden">{s.n}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Recommended: add your logo and who signs. You can skip and do this later.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Company / brand name</Label>
                  <Input
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Acme Pvt Ltd"
                  />
                </div>
                <div>
                  <Label>Signatory name</Label>
                  <Input
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    placeholder="Priya Sharma"
                  />
                </div>
                <div>
                  <Label>Designation</Label>
                  <Input
                    value={signatoryDesignation}
                    onChange={(e) => setSignatoryDesignation(e.target.value)}
                    placeholder="HR Manager"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="h-auto px-0 text-sm text-slate-500"
                onClick={() => setStep(2)}
              >
                Skip company look for now
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Pick a starter letter. You can edit the wording anytime in Letter templates.
              </p>
              <div className="grid max-h-[40vh] gap-2 overflow-y-auto sm:grid-cols-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPickedTemplateId(t.id)}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left transition",
                      pickedTemplateId === t.id
                        ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{t.type}</div>
                  </button>
                ))}
                {templates.length === 0 && (
                  <p className="col-span-2 text-sm text-slate-500">
                    Loading starter templates…
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Next you will upload a spreadsheet of employees, review the rows, then create
                PDFs (or email them).
              </p>
              <ul className="space-y-2 text-sm text-slate-700">
                {LETTER_HOW_IT_WORKS.map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-indigo-600" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            className="text-slate-500"
            onClick={() => finish()}
          >
            Skip for now
          </Button>
          <div className="flex gap-2">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
              >
                Back
              </Button>
            )}
            {step === 1 && (
              <Button
                type="button"
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
                disabled={busy}
                onClick={saveBrand}
              >
                {busy ? <Spinner className="size-4" /> : "Continue"}
                {!busy && <ArrowRight className="ml-1.5 size-4" />}
              </Button>
            )}
            {step === 2 && (
              <Button
                type="button"
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
                disabled={!pickedTemplateId}
                onClick={() => {
                  if (pickedTemplateId) {
                    localStorage.setItem("letter_onboarding_template", pickedTemplateId);
                  }
                  setStep(3);
                }}
              >
                Continue
                <ArrowRight className="ml-1.5 size-4" />
              </Button>
            )}
            {step === 3 && (
              <Button
                type="button"
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
                onClick={() => {
                  const tid = localStorage.getItem("letter_onboarding_template");
                  finish(
                    tid
                      ? `/letters/batches/new?templateId=${tid}`
                      : "/letters/batches/new"
                  );
                }}
              >
                Start sending letters
                <ArrowRight className="ml-1.5 size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
