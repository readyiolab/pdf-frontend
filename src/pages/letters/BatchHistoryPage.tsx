import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { lettersApi } from "@/services/lettersApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

function orgId() {
  return localStorage.getItem("letter_org_id") || "";
}

export default function BatchHistoryPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [question, setQuestion] = useState("Show me employees whose letter failed to send");
  const [results, setResults] = useState<any[] | null>(null);

  useEffect(() => {
    (async () => {
      if (!orgId()) await lettersApi.bootstrap();
      const { batches: list } = await lettersApi.listBatches(orgId());
      setBatches(list);
    })().catch((e) => toast.error(e.message));
  }, []);

  const runQuery = async () => {
    try {
      const res = await lettersApi.aiQuery(orgId(), question);
      setResults(res.results);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <Link to="/letters/studio" className="text-xs text-muted-foreground hover:underline">
          ← Letter Studio
        </Link>
        <h1 className="text-xl font-bold">Batch history</h1>
      </div>

      <div className="flex gap-2 rounded-xl border p-3">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask in plain language…"
        />
        <Button className="shrink-0 rounded-full" onClick={runQuery}>
          Ask
        </Button>
      </div>

      {results && (
        <div className="rounded-xl border p-3 text-sm">
          <div className="mb-2 font-medium">{results.length} matches</div>
          <div className="max-h-48 space-y-1 overflow-auto text-xs">
            {results.map((r) => (
              <div key={r.id} className="border-b py-1">
                {r.employee?.Employee_Name || "Employee"} · send {r.sendStatus} · batch{" "}
                {String(r.batchId).slice(0, 8)}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="divide-y rounded-xl border">
        {batches.map((b) => (
          <Link
            key={b.id}
            to={`/letters/batches/${b.id}`}
            className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/40"
          >
            <div>
              <div className="font-medium">{b.templateName || "Batch"}</div>
              <div className="text-xs text-muted-foreground">
                {b.totalRows} rows · gen {b.generatedCount} · sent {b.sentCount} · {b.status}
                {b.templateVersion != null ? ` · template v${b.templateVersion}` : ""}
              </div>
              {b.aiSummary && (
                <div className="mt-1 text-xs text-muted-foreground">{b.aiSummary}</div>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async (e) => {
                e.preventDefault();
                const { report } = await lettersApi.report(orgId(), b.id);
                const blob = new Blob([JSON.stringify(report, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `batch-${b.id}-report.json`;
                a.click();
              }}
            >
              Report
            </Button>
          </Link>
        ))}
        {batches.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">No batches yet.</div>
        )}
      </div>
    </div>
  );
}
