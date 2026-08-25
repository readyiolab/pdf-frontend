import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { useLetterStudioHome } from "@/features/letters";
import { cn } from "@/lib/utils";
import {
  StudioPageHeader,
  StudioPrimaryButton,
  StudioPageBody,
  StudioSkeleton,
} from "@/components/letters/StudioPageHeader";
import {
  LETTER_HOW_IT_WORKS,
  LETTER_STEP_META,
  computeLetterNextStep,
} from "@/lib/letterOnboarding";

export default function LettersHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const homeQuery = useLetterStudioHome(user?.id);

  useEffect(() => {
    if (homeQuery.data?.warning) toast.message(homeQuery.data.warning);
  }, [homeQuery.data?.warning]);

  useEffect(() => {
    if (homeQuery.error) {
      toast.error(
        homeQuery.error instanceof Error
          ? homeQuery.error.message
          : "Failed to open Letter Studio"
      );
    }
  }, [homeQuery.error]);

  const orgName = homeQuery.data?.orgName ?? "";
  const loading = homeQuery.isLoading;
  const batches = homeQuery.data?.batches?.slice(0, 8) ?? [];
  const brandCount = homeQuery.data?.brandCount ?? 0;
  const templateCount = homeQuery.data?.templateCount ?? 0;
  const hasSentBefore = batches.length > 0;

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
        <p className="text-sm text-slate-500">Preparing your workspace.</p>
      </div>
    );
  }

  const primaryCta = hasSentBefore
    ? { label: "Send more letters", to: "/letters/batches/new" }
    : { label: `Continue: ${current.short}`, to: current.to };

  return (
    <div className="flex min-h-full flex-col">
      <StudioPageHeader
        title={orgName || "Your organization"}
        description={
          hasSentBefore
            ? "Send more letters from Excel, or open a recent run below."
            : "Write one letter, then fill it for many employees from Excel."
        }
        action={
          <StudioPrimaryButton onClick={() => navigate(primaryCta.to)}>
            {primaryCta.label}
            <ArrowRight className="ml-1.5 size-4" />
          </StudioPrimaryButton>
        }
      />

      <StudioPageBody className="space-y-5">
        {isFree && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Free plan: up to 5 employees per send, email sending disabled (you can still
            download PDFs).{" "}
            <Link to="/billing" className="font-semibold underline underline-offset-2">
              Upgrade to PRO
            </Link>
          </div>
        )}

        {!hasSentBefore && (
          <section className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-4">
            <h2 className="text-sm font-semibold text-slate-900">How Letter Studio works</h2>
            <ol className="mt-3 space-y-2">
              {LETTER_HOW_IT_WORKS.map((line, i) => (
                <li key={line} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  {line}
                </li>
              ))}
            </ol>
          </section>
        )}

        {hasSentBefore ? (
          <>
            <RecentLettersSection batches={batches} navigate={navigate} />
            <SetupChecklist
              activeStep={activeStep}
              done={done}
              navigate={navigate}
              compact
            />
          </>
        ) : (
          <>
            <SetupChecklist activeStep={activeStep} done={done} navigate={navigate} />
            <RecentLettersSection batches={batches} navigate={navigate} />
          </>
        )}
      </StudioPageBody>
    </div>
  );
}

function SetupChecklist({
  activeStep,
  done,
  navigate,
  compact,
}: {
  activeStep: 1 | 2 | 3;
  done: { 1: boolean; 2: boolean; 3: boolean };
  navigate: (to: string) => void;
  compact?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200">
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">
          {compact ? "Setup checklist" : "Your progress"}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {compact
            ? "Optional polish — company look and templates"
            : `Next up: ${LETTER_STEP_META.find((s) => s.n === activeStep)?.title}`}
        </p>
      </div>
      <ol className={cn("grid", compact ? "md:grid-cols-3" : "md:grid-cols-3")}>
        {LETTER_STEP_META.map((step, idx) => {
          const isActive = !compact && step.n === activeStep;
          const isDone = done[step.n as 1 | 2 | 3];
          return (
            <li
              key={step.n}
              className={cn(
                "flex flex-col gap-3 p-4",
                idx > 0 && "md:border-l md:border-slate-100",
                idx < LETTER_STEP_META.length - 1 && "border-b border-slate-100 md:border-b-0",
                isActive && "bg-indigo-50/70",
                compact && "py-3"
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
                  {step.recommended && !isDone && (
                    <span className="mt-1 inline-block rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      Recommended
                    </span>
                  )}
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
                  {!compact && (
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{step.desc}</p>
                  )}
                </div>
              </div>
              {!compact && (
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
              )}
              {compact && !isDone && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-auto h-8 w-full rounded-xl text-xs"
                  onClick={() => navigate(step.to)}
                >
                  {step.cta}
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function RecentLettersSection({
  batches,
  navigate,
}: {
  batches: {
    id: string;
    templateName?: string;
    totalRows?: number;
    status?: string;
    createdAt: string;
  }[];
  navigate: (to: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Recent letters</h2>
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
          No letters sent yet. Write your letter template, then start sending from Excel.
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
                  {b.templateName || "Letter send"}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {b.totalRows} employees · {b.status} ·{" "}
                  {new Date(b.createdAt).toLocaleString()}
                </div>
              </div>
              <ArrowRight className="size-4 shrink-0 text-slate-400" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
