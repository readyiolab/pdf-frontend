import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { lettersApi } from "@/services/lettersApi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FileText,
  Palette,
  Upload,
  History,
  Users,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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
        const { batches: list } = await lettersApi.listBatches(id);
        setBatches(list.slice(0, 5));
      } catch (err: any) {
        toast.error(err.message || "Failed to open Letter Studio");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-muted-foreground">
        Preparing your Letter Studio workspace…
      </div>
    );
  }

  const isFree = user?.plan === "FREE";

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/letters" className="text-xs text-muted-foreground hover:underline">
            ← Letter Studio overview
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Employee Letter Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {orgName || "Your organization"} · branded letters, Excel import, bulk PDF &amp; send
          </p>
        </div>
        <Button onClick={() => navigate("/letters/templates")} className="rounded-full">
          Open templates <ArrowRight className="ml-1 size-4" />
        </Button>
      </div>

      {isFree && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-800 dark:text-amber-400">
          FREE plan: up to 5 rows per batch, email sending disabled.{" "}
          <Link to="/billing" className="font-medium underline">
            Upgrade to PRO
          </Link>{" "}
          for full batches and Outlook/Gmail send.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <HubCard
          icon={<Palette className="size-5" />}
          title="Brand profiles"
          desc="Logo, letterhead, signatory, fonts"
          to={"/letters/brands"}
        />
        <HubCard
          icon={<FileText className="size-5" />}
          title="Templates"
          desc="TipTap editor with field tokens"
          to={"/letters/templates"}
        />
        <HubCard
          icon={<Upload className="size-5" />}
          title="New batch"
          desc="Import Excel → validate → generate"
          to={"/letters/batches/new"}
        />
        <HubCard
          icon={<History className="size-5" />}
          title="Batch history"
          desc="Past batches, reports, NL search"
          to={"/letters/history"}
        />
        <HubCard
          icon={<Users className="size-5" />}
          title="Team & retention"
          desc="Invite members, PDF retention"
          to={"/letters/team"}
        />
        <HubCard
          icon={<Sparkles className="size-5" />}
          title="AI draft"
          desc="Ask AI to draft a letter"
          to={"/letters/templates?ai=1"}
        />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recent batches
        </h2>
        {batches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No batches yet. Start with a template and Excel import.
          </p>
        ) : (
          <div className="divide-y rounded-xl border">
            {batches.map((b) => (
              <Link
                key={b.id}
                to={`/letters/batches/${b.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/40"
              >
                <div>
                  <div className="font-medium">{b.templateName || "Batch"}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.totalRows} rows · {b.status} · {new Date(b.createdAt).toLocaleString()}
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function HubCard({
  icon,
  title,
  desc,
  to,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-2xl border bg-card p-4 transition hover:border-foreground/20 hover:shadow-sm"
    >
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
        {icon}
      </div>
      <div className="font-semibold">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
    </Link>
  );
}
