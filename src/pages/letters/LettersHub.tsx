import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { lettersApi } from "@/services/lettersApi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import {
  FileText,
  Palette,
  Upload,
  History,
  Users,
  Sparkles,
  ArrowRight,
  PenLine,
  Check,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const GUIDE_STEPS = [
  {
    n: 1,
    title: "Brand profile",
    desc: "Add logo, letterhead, and signatory so every PDF looks like your company.",
    to: "/letters/brands",
    cta: "Set up brand",
    icon: Palette,
  },
  {
    n: 2,
    title: "Letter template",
    desc: "Write the letter once with field tokens like {{Employee_Name}} and {{New_CTC}}.",
    to: "/letters/templates",
    cta: "Open templates",
    icon: PenLine,
  },
  {
    n: 3,
    title: "New batch",
    desc: "Import Excel, map columns, validate rows, then generate password-protected PDFs.",
    to: "/letters/batches/new",
    cta: "Start batch",
    icon: Upload,
  },
] as const;

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
        setBatches(batchRes.batches.slice(0, 6));
        setBrandCount(brandRes.brands?.length || 0);
        setTemplateCount(templateRes.templates?.length || 0);
      } catch (err: any) {
        toast.error(err.message || "Failed to open Letter Studio");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeStep = useMemo(() => {
    if (brandCount === 0) return 1;
    if (templateCount === 0) return 2;
    if (batches.length === 0) return 3;
    return 3;
  }, [brandCount, templateCount, batches.length]);

  const done = {
    1: brandCount > 0,
    2: templateCount > 0,
    3: batches.length > 0,
  } as const;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-slate-500">
        <Spinner className="size-6 text-indigo-600" />
        Preparing your workspace…
      </div>
    );
  }

  const isFree = user?.plan === "FREE";
  const current = GUIDE_STEPS.find((s) => s.n === activeStep)!;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Workspace
          </p>
          <h1 className="font-heading mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {orgName || "Your organization"}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            Follow the steps below — we highlight where you are and what to do next.
          </p>
        </div>
        <Button
          className="h-10 rounded-full bg-indigo-600 hover:bg-indigo-700"
          onClick={() => navigate(current.to)}
        >
          Continue: Step {activeStep}
          <ArrowRight className="ml-1.5 size-4" />
        </Button>
      </div>

      {isFree && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Free plan: up to 5 rows per batch, email sending disabled.{" "}
          <Link to="/billing" className="font-semibold underline underline-offset-2">
            Upgrade to PRO
          </Link>
        </div>
      )}

      {/* Guided steps */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-slate-900">How Letter Studio works</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Step {activeStep} of 3 is highlighted — complete it, then move to the next.
          </p>
        </div>

        <ol className="grid gap-0 md:grid-cols-3">
          {GUIDE_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = step.n === activeStep;
            const isDone = done[step.n];
            return (
              <li
                key={step.n}
                className={cn(
                  "relative flex flex-col gap-3 border-slate-100 p-4 sm:p-5",
                  idx > 0 && "md:border-l",
                  idx < GUIDE_STEPS.length - 1 && "border-b md:border-b-0",
                  isActive && "bg-indigo-50/60 ring-1 ring-inset ring-indigo-200"
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                      isDone && !isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : isActive
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                          : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {isDone && !isActive ? <Check className="size-4" /> : step.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Icon
                        className={cn(
                          "size-4",
                          isActive ? "text-indigo-700" : "text-slate-400"
                        )}
                      />
                      <h3
                        className={cn(
                          "text-sm font-semibold",
                          isActive ? "text-indigo-950" : "text-slate-900"
                        )}
                      >
                        {step.title}
                      </h3>
                    </div>
                    {isActive && (
                      <span className="mt-1 inline-block rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        You are here
                      </span>
                    )}
                    {isDone && !isActive && (
                      <span className="mt-1 inline-block text-[11px] font-medium text-emerald-700">
                        Done
                      </span>
                    )}
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">{step.desc}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  className={cn(
                    "mt-auto h-9 w-full rounded-xl",
                    isActive
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "border-slate-200"
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            icon: History,
            title: "Batch history",
            desc: "Past batches, reports, NL search",
            to: "/letters/history",
            tone: "bg-slate-100 text-slate-700",
          },
          {
            icon: Users,
            title: "Team & retention",
            desc: "Invite members, PDF retention",
            to: "/letters/team",
            tone: "bg-emerald-50 text-emerald-700",
          },
          {
            icon: Sparkles,
            title: "Ask AI to draft",
            desc: "Generate a letter with field tokens",
            to: "/letters/templates?ai=1",
            tone: "bg-fuchsia-50 text-fuchsia-700",
          },
          {
            icon: FileText,
            title: "All templates",
            desc: "Edit or create letter templates",
            to: "/letters/templates",
            tone: "bg-indigo-50 text-indigo-700",
          },
          {
            icon: Palette,
            title: "Brand profiles",
            desc: "Logo, letterhead, signatory, fonts",
            to: "/letters/brands",
            tone: "bg-violet-50 text-violet-700",
          },
          {
            icon: Upload,
            title: "New batch",
            desc: "Import Excel → validate → generate",
            to: "/letters/batches/new",
            tone: "bg-sky-50 text-sky-700",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.to + card.title}
              to={card.to}
              className="group rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <span
                className={cn(
                  "mb-3 flex size-10 items-center justify-center rounded-xl",
                  card.tone
                )}
              >
                <Icon className="size-5" />
              </span>
              <div className="font-semibold text-slate-900">{card.title}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-slate-500">{card.desc}</div>
              <span className="mt-3 inline-flex items-center text-xs font-semibold text-indigo-600 opacity-0 transition group-hover:opacity-100">
                Open <ArrowRight className="ml-1 size-3.5" />
              </span>
            </Link>
          );
        })}
      </div>

      <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm">
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
            No batches yet. Finish Step 1 and Step 2, then start a batch.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {batches.map((b) => (
              <Link
                key={b.id}
                to={`/letters/batches/${b.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm transition hover:bg-slate-50"
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
    </div>
  );
}
