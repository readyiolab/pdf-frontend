import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { lettersApi } from "@/services/lettersApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowRight, Download, Search } from "lucide-react";
import {
  StudioPageHeader,
  StudioPageBody,
} from "@/components/letters/StudioPageHeader";
import { useAuth } from "@/features/auth/useAuth";
import { useBatches } from "@/features/letters";
import { ensureLetterOrgId, readLetterOrgId } from "@/features/letters/orgHelpers";

function orgId() {
  return readLetterOrgId();
}

export default function BatchHistoryPage() {
  const { user } = useAuth();
  const batchesQuery = useBatches(user?.id);
  const batches = batchesQuery.data?.batches ?? [];
  const [question, setQuestion] = useState("Show me employees whose letter failed to send");
  const [results, setResults] = useState<any[] | null>(null);
  const [asking, setAsking] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (batchesQuery.error) {
      toast.error(
        batchesQuery.error instanceof Error ? batchesQuery.error.message : "Failed to load batches"
      );
    }
  }, [batchesQuery.error]);

  const runQuery = async () => {
    setAsking(true);
    try {
      await ensureLetterOrgId(user?.id);
      const res = await lettersApi.aiQuery(orgId(), question);
      setResults(res.results);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <StudioPageHeader
        title="History"
        description="Reopen past batches, download letter PDFs from cloud storage, or search in plain language."
      />
      <StudioPageBody>
        <div className="flex gap-2 rounded-xl border border-slate-200 p-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="border-0 pl-9 shadow-none focus-visible:ring-0"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask in plain language…"
              onKeyDown={(e) => e.key === "Enter" && runQuery()}
            />
          </div>
          <Button
            className="shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700"
            onClick={runQuery}
            disabled={asking}
          >
            {asking ? "Searching…" : "Ask"}
          </Button>
        </div>

        {results && (
          <div className="rounded-xl border border-slate-200 p-4 text-sm">
            <div className="mb-2 font-semibold text-slate-900">{results.length} matches</div>
            <div className="max-h-48 space-y-1 overflow-auto text-xs text-slate-600">
              {results.map((r) => (
                <div key={r.id} className="border-b border-slate-100 py-1.5 last:border-0">
                  {r.employee?.Employee_Name || "Employee"} · send {r.sendStatus} · batch{" "}
                  {String(r.batchId).slice(0, 8)}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
            Batches
          </div>
          {batchesQuery.isLoading ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">Loading…</div>
          ) : batches.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">No batches yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {batches.map((b: any) => (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <Link
                    to={`/letters/batches/${b.id}`}
                    className="min-w-0 flex-1 hover:text-indigo-700"
                  >
                    <div className="truncate font-medium text-slate-900">
                      {b.templateName || "Batch"}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {b.totalRows} rows · {b.status} · {new Date(b.createdAt).toLocaleString()}
                    </div>
                  </Link>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg"
                      disabled={downloadingId === b.id}
                      onClick={async () => {
                        setDownloadingId(b.id);
                        try {
                          await ensureLetterOrgId(user?.id);
                          await lettersApi.downloadPdfsZip(orgId(), b.id);
                          toast.success("Download started");
                        } catch (e: any) {
                          toast.error(e.message);
                        } finally {
                          setDownloadingId(null);
                        }
                      }}
                    >
                      <Download className="mr-1 size-3.5" />
                      PDFs
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-lg"
                      onClick={async () => {
                        try {
                          await ensureLetterOrgId(user?.id);
                          await lettersApi.report(orgId(), b.id);
                          toast.message("Report ready");
                        } catch (e: any) {
                          toast.error(e.message);
                        }
                      }}
                    >
                      Report
                      <ArrowRight className="ml-1 size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </StudioPageBody>
    </div>
  );
}
