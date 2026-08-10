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

function orgId() {
  return localStorage.getItem("letter_org_id") || "";
}

export default function BatchHistoryPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [question, setQuestion] = useState("Show me employees whose letter failed to send");
  const [results, setResults] = useState<any[] | null>(null);
  const [asking, setAsking] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!orgId()) await lettersApi.bootstrap();
      const { batches: list } = await lettersApi.listBatches(orgId());
      setBatches(list);
    })().catch((e) => toast.error(e.message));
  }, []);

  const runQuery = async () => {
    setAsking(true);
    try {
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

        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
          {batches.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm transition hover:bg-slate-50"
            >
              <Link to={`/letters/batches/${b.id}`} className="min-w-0 flex-1">
                <div className="truncate font-semibold text-slate-900">
                  {b.templateName || "Batch"}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {b.totalRows} rows · gen {b.generatedCount} · sent {b.sentCount} · {b.status}
                  {b.templateVersion != null ? ` · template v${b.templateVersion}` : ""}
                </div>
                {b.aiSummary && (
                  <div className="mt-1 text-xs text-slate-500">{b.aiSummary}</div>
                )}
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                {Number(b.generatedCount) > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                    disabled={downloadingId === b.id}
                    onClick={async (e) => {
                      e.preventDefault();
                      setDownloadingId(b.id);
                      try {
                        await lettersApi.downloadPdfsZip(orgId(), b.id);
                        toast.success("Downloading letter PDFs");
                      } catch (err: any) {
                        toast.error(err.message || "Download failed");
                      } finally {
                        setDownloadingId(null);
                      }
                    }}
                  >
                    <Download className="mr-1 size-3.5" />
                    {downloadingId === b.id ? "…" : "Download PDFs"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg text-xs"
                  onClick={async (e) => {
                    e.preventDefault();
                    const { report } = await lettersApi.report(orgId(), b.id);
                    const blob = new Blob([JSON.stringify(report, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `batch-${b.id}-status.json`;
                    a.click();
                  }}
                >
                  Status (JSON)
                </Button>
                <Link to={`/letters/batches/${b.id}`}>
                  <ArrowRight className="size-4 text-slate-400" />
                </Link>
              </div>
            </div>
          ))}
          {batches.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-slate-500">No batches yet.</div>
          )}
        </div>
      </StudioPageBody>
    </div>
  );
}
