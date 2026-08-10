import { useEffect, useState } from "react";
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export default function LettersHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const boot = await lettersApi.bootstrap();
        const id = boot.org.organization.id;
        setOrgName(boot.org.organization.name);
        localStorage.setItem("letter_org_id", id);
        if (boot.warning) toast.message(boot.warning);
        const { batches: list } = await lettersApi.listBatches(id);
        setBatches(list.slice(0, 6));
      } catch (err: any) {
        toast.error(err.message || "Failed to open Letter Studio");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-slate-500">
        <Spinner className="size-6 text-indigo-600" />
        Preparing your workspace…
      </div>
    );
  }

  const isFree = user?.plan === "FREE";

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
            Design branded letters, import Excel, validate, generate PDFs, and send from your mailbox.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="h-10 rounded-full border-slate-200 bg-white"
            onClick={() => navigate("/letters/templates")}
          >
            <PenLine className="mr-1.5 size-4" />
            Templates
          </Button>
          <Button
            className="h-10 rounded-full bg-indigo-600 hover:bg-indigo-700"
            onClick={() => navigate("/letters/batches/new")}
          >
            New batch
            <ArrowRight className="ml-1.5 size-4" />
          </Button>
        </div>
      </div>

      {isFree && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Free plan: up to 5 rows per batch, email sending disabled.{" "}
          <Link to="/billing" className="font-semibold underline underline-offset-2">
            Upgrade to PRO
          </Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            icon: Palette,
            title: "Brand profiles",
            desc: "Logo, letterhead, signatory, fonts",
            to: "/letters/brands",
            tone: "bg-violet-50 text-violet-700",
          },
          {
            icon: FileText,
            title: "Templates",
            desc: "TipTap editor with field tokens",
            to: "/letters/templates",
            tone: "bg-indigo-50 text-indigo-700",
          },
          {
            icon: Upload,
            title: "New batch",
            desc: "Import Excel → validate → generate",
            to: "/letters/batches/new",
            tone: "bg-sky-50 text-sky-700",
          },
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
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.to}
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
            No batches yet. Start with a template, then import Excel.
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
