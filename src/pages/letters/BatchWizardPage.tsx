import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { lettersApi } from "@/services/lettersApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

function orgId() {
  return localStorage.getItem("letter_org_id") || "";
}

type Step = "setup" | "map" | "validate" | "generate" | "send";

export default function BatchWizardPage() {
  const { batchId: routeBatchId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("setup");
  const [templates, setTemplates] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [templateId, setTemplateId] = useState(params.get("templateId") || "");
  const [brandProfileId, setBrandProfileId] = useState("");
  const [batchId, setBatchId] = useState(routeBatchId || "");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [systemFields, setSystemFields] = useState<string[]>([]);
  const [aiSuggested, setAiSuggested] = useState<Record<string, boolean>>({});
  const [summary, setSummary] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [approved, setApproved] = useState(false);
  const [passwordMode, setPasswordMode] = useState("NONE");
  const [progress, setProgress] = useState<any>(null);
  const [mailAccounts, setMailAccounts] = useState<any[]>([]);
  const [mailAccountId, setMailAccountId] = useState("");
  const [sendMode, setSendMode] = useState<"CREATE_DRAFTS" | "SEND_NOW" | "GENERATE_ONLY">(
    "CREATE_DRAFTS"
  );
  const [confirmCount, setConfirmCount] = useState<number | "">("");
  const [subject, setSubject] = useState("Your employee letter");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!orgId()) {
        const boot = await lettersApi.bootstrap();
        localStorage.setItem("letter_org_id", boot.org.organization.id);
      }
      const [{ templates: t }, { brands: b }] = await Promise.all([
        lettersApi.listTemplates(orgId()),
        lettersApi.listBrands(orgId()),
      ]);
      setTemplates(t);
      setBrands(b);
      if (!templateId && t[0]) setTemplateId(t[0].id);
      if (routeBatchId) {
        setBatchId(routeBatchId);
        const detail = await lettersApi.getBatch(orgId(), routeBatchId);
        const st = detail.batch.status;
        if (st === "GENERATED" || st === "SENDING" || st === "SENT") {
          setStep("send");
          const accounts = await lettersApi.mailAccounts();
          setMailAccounts(accounts.accounts);
          const p = await lettersApi.progress(orgId(), routeBatchId);
          setProgress(p);
        } else if (st === "GENERATING") {
          setStep("generate");
        } else if (st === "VALIDATED" || st === "MAPPED") {
          setStep("validate");
          try {
            const iss = await lettersApi.issues(orgId(), routeBatchId);
            setIssues(iss.issues);
            setSummary({
              ready: detail.batch.readyCount,
              warning: detail.batch.warningCount,
              blocked: detail.batch.blockedCount,
            });
          } catch {
            /* ignore */
          }
        } else if (st === "IMPORTED" || st === "DRAFT") {
          setStep("map");
        } else {
          setStep("map");
        }
      }
    })().catch((e) => toast.error(e.message));
  }, []);

  const createBatch = async () => {
    setBusy(true);
    try {
      const { batch } = await lettersApi.createBatch(orgId(), {
        templateId,
        brandProfileId: brandProfileId || null,
      });
      setBatchId(batch.id);
      navigate(`/letters/batches/${batch.id}`, { replace: true });
      toast.success("Batch created — upload Excel next");
      setStep("map");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File) => {
    if (!batchId) {
      toast.error("Create the batch first");
      return;
    }
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), "")
      );
      const parsed = await lettersApi.parseUpload(orgId(), batchId, {
        fileBase64: base64,
        sourceFileName: file.name,
      });
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setSystemFields(parsed.systemFields);
      const initial: Record<string, string> = {};
      for (const h of parsed.headers) initial[h] = "";
      setMapping(initial);

      try {
        const sug = await lettersApi.aiSuggestMapping(orgId(), parsed.headers);
        const next = { ...initial };
        const badges: Record<string, boolean> = {};
        for (const [h, v] of Object.entries(sug.suggestions || {})) {
          if (v && (v as any).field) {
            next[h] = (v as any).field;
            badges[h] = true;
          }
        }
        setMapping(next);
        setAiSuggested(badges);
      } catch {
        /* AI optional */
      }

      setStep("map");
      toast.success(`Detected ${parsed.totalRows} rows`);
    } catch (e: any) {
      toast.error(e.message || "Failed to parse file");
    } finally {
      setBusy(false);
    }
  };

  const applyMap = async () => {
    setBusy(true);
    try {
      await lettersApi.applyMapping(orgId(), batchId, { mapping, rows });
      const result = await lettersApi.validate(orgId(), batchId, sendMode !== "GENERATE_ONLY");
      setSummary(result.summary);
      const iss = await lettersApi.issues(orgId(), batchId);
      setIssues(iss.issues);
      try {
        await lettersApi.aiAnomalies(orgId(), batchId);
        const refreshed = await lettersApi.issues(orgId(), batchId);
        setIssues(refreshed.issues);
      } catch {
        /* optional */
      }
      setStep("validate");
      toast.success("Validated");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const startGenerate = async () => {
    if (!approved) {
      toast.error("Confirm you reviewed a sample before generating");
      return;
    }
    setBusy(true);
    try {
      const prev = await lettersApi.preview(orgId(), batchId);
      setPreview(prev);
      await lettersApi.generate(orgId(), batchId, {
        approved: true,
        passwordMode,
      });
      setStep("generate");
      toast.success("Generation queued");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (step !== "generate" || !batchId) return;
    const t = setInterval(async () => {
      try {
        const p = await lettersApi.progress(orgId(), batchId);
        setProgress(p);
        if (p.status === "GENERATED" || p.pending === 0) {
          clearInterval(t);
          try {
            const sum = await lettersApi.aiSummary(orgId(), batchId);
            setProgress((prev: any) => ({ ...prev, aiSummary: sum.summary }));
          } catch {
            /* optional */
          }
          setStep("send");
          const accounts = await lettersApi.mailAccounts();
          setMailAccounts(accounts.accounts);
        }
      } catch {
        /* ignore poll errors */
      }
    }, 2000);
    return () => clearInterval(t);
  }, [step, batchId]);

  const doSend = async () => {
    setBusy(true);
    try {
      if (sendMode === "SEND_NOW") {
        const eligible = progress?.generated || preview?.eligibleCount || 0;
        if (Number(confirmCount) !== eligible) {
          toast.error(`Enter confirm count ${eligible} to send now`);
          setBusy(false);
          return;
        }
      }
      await lettersApi.send(orgId(), batchId, {
        mode: user?.plan === "FREE" ? "GENERATE_ONLY" : sendMode,
        subject,
        bodyHtml: "<p>Please find your letter attached.</p>",
        mailAccountId: sendMode === "GENERATE_ONLY" ? undefined : mailAccountId,
        confirmSendCount: sendMode === "SEND_NOW" ? Number(confirmCount) : undefined,
      });
      toast.success(sendMode === "GENERATE_ONLY" ? "Done (no email)" : "Send queued");
      navigate("/letters/history");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const pct = useMemo(() => {
    if (!progress) return 0;
    const total = progress.generated + progress.pending + progress.failed || 1;
    return Math.round((progress.generated / total) * 100);
  }, [progress]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <Link to="/letters/studio" className="text-xs text-muted-foreground hover:underline">
          ← Letter Studio
        </Link>
        <h1 className="text-xl font-bold">Batch wizard</h1>
        <p className="text-xs text-muted-foreground">
          Step: {step}
          {batchId ? ` · ${batchId.slice(0, 8)}…` : ""}
        </p>
      </div>

      {step === "setup" && (
        <div className="space-y-4 rounded-2xl border p-4">
          <div>
            <Label>Template</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Brand profile (optional)</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={brandProfileId}
              onChange={(e) => setBrandProfileId(e.target.value)}
            >
              <option value="">None</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <Button className="rounded-full" disabled={busy || !templateId} onClick={createBatch}>
            Continue
          </Button>
        </div>
      )}

      {(step === "map" || (batchId && step === "setup")) && batchId && step !== "setup" && (
        <div className="space-y-4 rounded-2xl border p-4">
          <Label>Upload Excel / CSV</Label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          {headers.length > 0 && (
            <>
              <div className="overflow-auto rounded-lg border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-2 py-2">Excel column</th>
                      <th className="px-2 py-2">Maps to</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headers.map((h) => (
                      <tr key={h} className="border-t">
                        <td className="px-2 py-2">
                          {h}
                          {aiSuggested[h] && (
                            <span className="ml-2 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] text-violet-700">
                              AI suggested
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <select
                            className="h-8 w-full rounded border bg-background px-2"
                            value={mapping[h] || ""}
                            onChange={(e) =>
                              setMapping((m) => ({ ...m, [h]: e.target.value }))
                            }
                          >
                            <option value="">— skip —</option>
                            {systemFields.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button className="rounded-full" disabled={busy} onClick={applyMap}>
                Save mapping &amp; validate
              </Button>
            </>
          )}
        </div>
      )}

      {step === "map" && batchId && headers.length === 0 && (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Upload an .xlsx or .csv file to detect columns.
        </div>
      )}

      {/* After createBatch we set step map but file not uploaded - also show upload on map after create */}
      {step === "map" && batchId && (
        <div className="text-xs text-muted-foreground">Upload your spreadsheet above to continue.</div>
      )}

      {step === "validate" && (
        <div className="space-y-4">
          {summary && (
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Ready" value={summary.ready} tone="emerald" />
              <Stat label="Warning" value={summary.warning} tone="amber" />
              <Stat label="Blocked" value={summary.blocked} tone="rose" />
            </div>
          )}
          <div className="max-h-64 overflow-auto rounded-xl border text-xs">
            {issues.map((iss) => (
              <div key={iss.id} className="border-b px-3 py-2">
                <div className="font-medium">
                  Row {iss.rowIndex + 1} · {iss.validationStatus}
                  {iss.anomalies?.length > 0 && (
                    <span className="ml-2 rounded bg-violet-500/15 px-1.5 text-[10px] text-violet-700">
                      REVIEW
                    </span>
                  )}
                </div>
                <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                  {(iss.errors || []).map((e: any, i: number) => (
                    <li key={i}>
                      [{e.severity}] {e.message}
                    </li>
                  ))}
                  {(iss.anomalies || []).map((a: any, i: number) => (
                    <li key={`a-${i}`}>[REVIEW] {a.message}</li>
                  ))}
                </ul>
              </div>
            ))}
            {issues.length === 0 && (
              <div className="p-4 text-muted-foreground">No issues — all rows ready.</div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setStep("map")}
            >
              Fix mapping
            </Button>
            <Button
              className="rounded-full"
              onClick={async () => {
                const prev = await lettersApi.preview(orgId(), batchId);
                setPreview(prev);
                setStep("generate");
              }}
              disabled={summary && summary.ready + summary.warning === 0}
            >
              Continue to generate
            </Button>
          </div>
        </div>
      )}

      {(step === "generate" || (step === "send" && !progress)) && preview && step === "generate" && (
        <div className="space-y-4 rounded-2xl border p-4">
          <h2 className="font-semibold">Sample preview</h2>
          <div className="grid gap-2 text-xs sm:grid-cols-3">
            {(["first", "middle", "last"] as const).map((k) => (
              <div key={k} className="rounded-lg border p-2">
                <div className="mb-1 font-medium capitalize">{k}</div>
                <pre className="whitespace-pre-wrap text-[10px] text-muted-foreground">
                  {JSON.stringify(preview.samples[k].employeeData, null, 2)}
                </pre>
              </div>
            ))}
          </div>
          <div>
            <Label>PDF password mode</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={passwordMode}
              onChange={(e) => setPasswordMode(e.target.value)}
            >
              <option value="NONE">None</option>
              <option value="FROM_COLUMN">From Excel PDF_Password</option>
              <option value="EMPLOYEE_ID">Employee_ID</option>
              <option value="LAST4_ID">Last 4 of Employee_ID</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={approved}
              onChange={(e) => setApproved(e.target.checked)}
            />
            I reviewed a sample and approve generation
          </label>
          <Button className="rounded-full" disabled={busy || !approved} onClick={startGenerate}>
            Generate PDFs
          </Button>
          {progress && (
            <div className="space-y-2">
              <Progress value={pct} />
              <p className="text-xs text-muted-foreground">
                Generated {progress.generated} · pending {progress.pending} · failed{" "}
                {progress.failed}
              </p>
            </div>
          )}
        </div>
      )}

      {step === "generate" && progress && (
        <div className="space-y-2 rounded-2xl border p-4">
          <Progress value={pct} />
          <p className="text-sm">
            Generating… {progress.generated} done, {progress.pending} pending
          </p>
        </div>
      )}

      {step === "send" && (
        <div className="space-y-4 rounded-2xl border p-4">
          {progress?.aiSummary && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm">{progress.aiSummary}</div>
          )}
          <div>
            <Label>Mode</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={sendMode}
              onChange={(e) => setSendMode(e.target.value as any)}
            >
              <option value="GENERATE_ONLY">Generate only (no email)</option>
              <option value="CREATE_DRAFTS">Create drafts (default)</option>
              <option value="SEND_NOW">Send now</option>
            </select>
          </div>
          {sendMode !== "GENERATE_ONLY" && (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const { url } = await lettersApi.mailAuthorize("OUTLOOK");
                    window.location.href = url;
                  }}
                >
                  Connect Outlook
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const { url } = await lettersApi.mailAuthorize("GMAIL");
                    window.location.href = url;
                  }}
                >
                  Connect Gmail
                </Button>
              </div>
              <div>
                <Label>Mail account</Label>
                <select
                  className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={mailAccountId}
                  onChange={(e) => setMailAccountId(e.target.value)}
                >
                  <option value="">Select…</option>
                  {mailAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.provider} · {a.emailAddress}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
            </>
          )}
          {sendMode === "SEND_NOW" && (
            <div>
              <Label>
                Confirm recipient count ({progress?.generated || preview?.eligibleCount || "?"})
              </Label>
              <Input
                type="number"
                value={confirmCount}
                onChange={(e) => setConfirmCount(e.target.value ? Number(e.target.value) : "")}
              />
            </div>
          )}
          <Button className="rounded-full" disabled={busy} onClick={doSend}>
            {sendMode === "SEND_NOW" ? "Confirm & send now" : "Continue"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "rose";
}) {
  const colors = {
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700",
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-700",
    rose: "border-rose-500/30 bg-rose-500/5 text-rose-700",
  };
  return (
    <div className={`rounded-xl border p-3 ${colors[tone]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}
