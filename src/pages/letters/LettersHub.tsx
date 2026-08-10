import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { lettersApi } from "@/services/lettersApi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  StudioPageHeader,
  StudioPrimaryButton,
  StudioPageBody,
  StudioSkeleton,
} from "@/components/letters/StudioPageHeader";
import {
  LETTER_STEP_META,
  computeLetterNextStep,
} from "@/lib/letterOnboarding";

export default function LettersHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<any[]>([]);
  const [brandCount, setBrandCount] = useState(0);
  const [templateCount, setTemplateCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const boot = await lettersApi.bootstrap();
        const id = boot.org.organization.id;
        setOrgName(boot.org.organization.name);
        localStorage.setItem("letter_org_id", id);
        if (boot.warning) toast.message(boot.warning);

        const [batchRes, brandRes, templateRes] = await Promise.all([
          lettersApi.listBatches(id),
          lettersApi.listBrands(id).catch(() => ({ brands: [] as any[] })),
          lettersApi.listTemplates(id).catch(() => ({ templates: [] as any[] })),
        ]);
        setBatches(batchRes.batches.slice(0, 8));
        setBrandCount(brandRes.brands?.length || 0);
        setTemplateCount(templateRes.templates?.length || 0);
      } catch (err: any) {
        toast.error(err.message || "Failed to open Letter Studio");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeStep = useMemo(
    () =>
      computeLetterNextStep({
        brandCount,
        templateCount,
        batchCount: batches.length,
      }),
    [brandCount, templateCount, batches.length]
  );

  const done = {
    1: brandCount > 0,
    2: templateCount > 0,
    3: batches.length > 0,
  } as const;

  const current = LETTER_STEP_META.find((s) => s.n === activeStep)!;
  const isFree = user?.plan === "FREE";

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-4 sm:p-5">
        <StudioSkeleton className="h-8 w-48" />
        <StudioSkeleton className="h-32 w-full max-w-xl" />
        <p className="text-sm text-slate-500">Preparing your workspace…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <StudioPageHeader
        title={orgName || "Your organization"}
        description="Follow the highlighted step — we’ll point you to what to do next."
        action={
          <StudioPrimaryButton onClick={() => navigate(current.to)}>
            Continue: {current.short}
            <ArrowRight className="ml-1.5 size-4" />
          </StudioPrimaryButton>
        }
      />

      <StudioPageBody className="space-y-5">
        {isFree && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Free plan: up to 5 rows per batch, email sending disabled.{" "}
            <Link to="/billing" className="font-semibold underline underline-offset-2">
              Upgrade to PRO
            </Link>
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200">
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Your progress</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Step {activeStep} of 3 is highlighted
            </p>
          </div>
          <ol className="grid md:grid-cols-3">
            {LETTER_STEP_META.map((step, idx) => {
              const isActive = step.n === activeStep;
              const isDone = done[step.n];
              return (
                <li
                  key={step.n}
                  className={cn(
                    "flex flex-col gap-3 p-4",
                    idx > 0 && "md:border-l md:border-slate-100",
                    idx < LETTER_STEP_META.length - 1 && "border-b border-slate-100 md:border-b-0",
                    isActive && "bg-indigo-50/70"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        isDone && !isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : isActive
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {isDone && !isActive ? <Check className="size-4" /> : step.n}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
                      {isActive && (
                        <span className="mt-1 inline-block rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          You are here
                        </span>
                      )}
                      {isDone && !isActive && (
                        <span className="mt-1 block text-[11px] font-medium text-emerald-700">
                          Done
                        </span>
                      )}
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                    className={cn(
                      "mt-auto h-9 w-full rounded-xl",
                      isActive && "bg-indigo-600 hover:bg-indigo-700"
                    )}
                    onClick={() => navigate(step.to)}
                  >
                    {step.cta}
                    <ArrowRight className="ml-1.5 size-3.5" />
                  </Button>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Recent batches</h2>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-indigo-700"
              onClick={() => navigate("/letters/history")}
            >
              View all
            </Button>
          </div>
          {batches.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              No batches yet. Finish Brand and Template, then start a batch.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {batches.map((b) => (
                <Link
                  key={b.id}
                  to={`/letters/batches/${b.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-900">
                      {b.templateName || "Batch"}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {b.totalRows} rows · {b.status} ·{" "}
                      {new Date(b.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-slate-400" />
                </Link>
              ))}
            </div>
          )}
        </section>
      </StudioPageBody>
    </div>
  );
}
