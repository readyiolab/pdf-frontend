import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { lettersApi } from "@/services/lettersApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  ISSUE_LABELS,
  autoMapHeaders,
  fileToBase64,
  unmappedRequired,
  type MappingSource,
} from "@/lib/letterMapping";
import { cn } from "@/lib/utils";

function orgId() {
  return localStorage.getItem("letter_org_id") || "";
}

type Step = "setup" | "map" | "validate" | "generate" | "send";

const MappingRow = memo(function MappingRow({
  header,
  value,
  source,
  systemFields,
  onChange,
}: {
  header: string;
  value: string;
  source: MappingSource;
  systemFields: string[];
  onChange: (header: string, field: string) => void;
}) {
  return (
    <tr className="border-t border-slate-100 [content-visibility:auto]">
      <td className="px-3 py-2">
        <span className="font-medium text-slate-800">{header}</span>
        {source === "ai" && (
          <span className="ml-2 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
            AI suggested
          </span>
        )}
        {(source === "auto" || source === "exact") && (
          <span className="ml-2 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
            Auto
          </span>
        )}
      </td>
      <td className="px-3 py-2">
        <select
          className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          value={value}
          onChange={(e) => onChange(header, e.target.value)}
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
  );
});

export default function BatchWizardPage() {
  const { batchId: routeBatchId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canSend = user?.plan !== "FREE";
  const [step, setStep] = useState<Step>("setup");
  const [templates, setTemplates] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [templateId, setTemplateId] = useState(params.get("templateId") || "");
  const [brandProfileId, setBrandProfileId] = useState("");
  const [batchId, setBatchId] = useState(routeBatchId || "");
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [sourceFileName, setSourceFileName] = useState("");
  const allRowsRef = useRef<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mapSources, setMapSources] = useState<Record<string, MappingSource>>({});
  const [systemFields, setSystemFields] = useState<string[]>([]);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [approved, setApproved] = useState(false);
  const [passwordMode, setPasswordMode] = useState("NONE");
  const [progress, setProgress] = useState<any>(null);
  const [mailAccounts, setMailAccounts] = useState<any[]>([]);
  const [mailAccountId, setMailAccountId] = useState("");
  const [sendMode, setSendMode] = useState<"CREATE_DRAFTS" | "SEND_NOW" | "GENERATE_ONLY">(
    canSend ? "CREATE_DRAFTS" : "GENERATE_ONLY"
  );
  const [confirmCount, setConfirmCount] = useState<number | "">("");
  const [subject, setSubject] = useState("Your employee letter");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSendMode(canSend ? "CREATE_DRAFTS" : "GENERATE_ONLY");
  }, [canSend]);

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
      const base64 = await fileToBase64(file);
      const parsed = await lettersApi.parseUpload(orgId(), batchId, {
        fileBase64: base64,
        sourceFileName: file.name,
      });
      const fields = parsed.systemFields?.length
        ? parsed.systemFields
        : [
            "Employee_ID",
            "Employee_Name",
            "Employee_Email",
            "Designation",
            "Department",
            "Old_CTC",
            "New_CTC",
            "Increment_Percent",
            "Effective_Date",
            "PDF_Password",
            "Manager_Name",
          ];
      setHeaders(parsed.headers);
      setSystemFields(fields);
      setSourceFileName(file.name);
      setRowCount(parsed.totalRows || parsed.rows?.length || 0);
      allRowsRef.current = parsed.rows || [];
      setPreviewRows((parsed.rows || []).slice(0, 10));

      const auto = autoMapHeaders(parsed.headers, fields);
      let next = { ...auto.mapping };
      let sources = { ...auto.sources };
      setAiNote(null);

      try {
        const sug = await lettersApi.aiSuggestMapping(orgId(), parsed.headers);
        for (const [h, v] of Object.entries(sug.suggestions || {})) {
          if (!next[h] && v && (v as any).field) {
            const field = (v as any).field as string;
            const alreadyUsed = Object.values(next).includes(field);
            if (!alreadyUsed && fields.includes(field)) {
              next[h] = field;
              sources[h] = "ai";
            }
          }
        }
      } catch {
        setAiNote("AI mapping unavailable — columns were matched automatically.");
      }

      setMapping(next);
      setMapSources(sources);
      setStep("map");
      toast.success(`Detected ${parsed.totalRows} rows · ${Object.values(next).filter(Boolean).length} columns mapped`);
    } catch (e: any) {
      toast.error(e.message || "Failed to parse file");
    } finally {
      setBusy(false);
    }
  };

  const onMappingChange = useCallback((header: string, field: string) => {
    setMapping((m) => ({ ...m, [header]: field }));
    setMapSources((s) => ({ ...s, [header]: field ? "auto" : "" }));
  }, []);

  const mappedCount = useMemo(
    () => Object.values(mapping).filter(Boolean).length,
    [mapping]
  );
  const missingRequired = useMemo(() => unmappedRequired(mapping), [mapping]);

  const applyMap = async () => {
    if (missingRequired.length) {
      toast.error(`Map required fields: ${missingRequired.join(", ")}`);
      return;
    }
    setBusy(true);
    try {
      await lettersApi.applyMapping(orgId(), batchId, {
        mapping,
        rows: allRowsRef.current,
      });
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
      setProgress({
        status: "GENERATING",
        generated: 0,
        pending: prev.eligibleCount || 0,
        failed: 0,
        skipped: 0,
      });
      setStep("generate");
      toast.success("Creating PDFs…");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Poll with backoff; pause when tab is hidden
  useEffect(() => {
    if (step !== "generate" || !batchId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let delay = 1000;
    let stableTicks = 0;
    let lastKey = "";

    const tick = async () => {
      if (cancelled) return;
      if (document.visibilityState === "hidden") {
        timer = setTimeout(tick, delay);
        return;
      }
      try {
        const p = await lettersApi.progress(orgId(), batchId);
        if (cancelled) return;
        setProgress(p);
        const key = `${p.generated}-${p.pending}-${p.failed}-${p.status}`;
        if (key === lastKey) stableTicks += 1;
        else {
          stableTicks = 0;
          lastKey = key;
        }
        if (p.status === "GENERATED" || p.pending === 0) {
          try {
            const sum = await lettersApi.aiSummary(orgId(), batchId);
            setProgress((prev: any) => ({ ...prev, aiSummary: sum.summary }));
          } catch {
            /* optional */
          }
          if (p.generated === 0 && p.failed > 0) {
            toast.error("PDFs could not be created. See the message on screen.");
          }
          setStep("send");
          const accounts = await lettersApi.mailAccounts();
          setMailAccounts(accounts.accounts);
          return;
        }
        // ~2 minutes with no progress change → surface stuck state
        if (stableTicks >= 24 && p.pending > 0 && p.generated === 0) {
          setProgress((prev: any) => ({
            ...prev,
            lastError:
              prev?.lastError ||
              "PDF creation is taking too long. The server may be stuck launching Chrome — ask your admin to check pm2 logs.",
          }));
        }
      } catch {
        /* ignore poll errors */
      }
      delay = Math.min(delay * 1.5, 5000);
      timer = setTimeout(tick, delay);
    };

    timer = setTimeout(tick, delay);
    const onVis = () => {
      if (document.visibilityState === "visible" && !cancelled) {
        delay = 1000;
        if (timer) clearTimeout(timer);
        timer = setTimeout(tick, 0);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [step, batchId]);

  const doSend = async () => {
    setBusy(true);
    try {
      const mode = canSend ? sendMode : "GENERATE_ONLY";
      if (mode === "SEND_NOW") {
        const eligible = progress?.generated || preview?.eligibleCount || 0;
        if (Number(confirmCount) !== eligible) {
          toast.error(`Enter confirm count ${eligible} to send now`);
          setBusy(false);
          return;
        }
      }
      await lettersApi.send(orgId(), batchId, {
        mode,
        subject,
        bodyHtml: "<p>Please find your letter attached.</p>",
        mailAccountId: mode === "GENERATE_ONLY" ? undefined : mailAccountId,
        confirmSendCount: mode === "SEND_NOW" ? Number(confirmCount) : undefined,
      });
      toast.success(mode === "GENERATE_ONLY" ? "Done (no email)" : "Send queued");
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

  const issueGroups = useMemo(() => {
    const map = new Map<
      string,
      { code: string; label: string; severity: string; rows: number[]; messages: Set<string> }
    >();
    for (const iss of issues) {
      for (const e of iss.errors || []) {
        const key = `${e.code || e.message}|${e.severity}`;
        const cur = map.get(key) || {
          code: e.code || "OTHER",
          label: ISSUE_LABELS[e.code] || e.message || "Issue",
          severity: e.severity || "WARNING",
          rows: [] as number[],
          messages: new Set<string>(),
        };
        cur.rows.push(iss.rowIndex + 1);
        if (e.message) cur.messages.add(e.message);
        map.set(key, cur);
      }
      for (const a of iss.anomalies || []) {
        const key = `ANOMALY:${a.code || a.message}`;
        const cur = map.get(key) || {
          code: a.code || "ANOMALY",
          label: a.message || "Needs review",
          severity: "REVIEW",
          rows: [] as number[],
          messages: new Set<string>(),
        };
        cur.rows.push(iss.rowIndex + 1);
        map.set(key, cur);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.rows.length - a.rows.length);
  }, [issues]);

  const causeLine = useMemo(() => {
    if (!summary) return null;
    if (summary.blocked === 0 && summary.warning === 0) {
      return "All rows look good — you can generate PDFs.";
    }
    const top = issueGroups[0];
    if (!top) return null;
    const n = summary.blocked || top.rows.length;
    return `${n} row${n === 1 ? "" : "s"}: ${top.label}${
      missingRequired.length ? ` (map ${missingRequired.join(", ")} first)` : ""
    }.`;
  }, [summary, issueGroups, missingRequired]);

  const visibleGroups = showAllIssues ? issueGroups : issueGroups.slice(0, 50);
  const mappedFields = useMemo(
    () => headers.filter((h) => mapping[h]).map((h) => ({ excel: h, field: mapping[h] })),
    [headers, mapping]
  );

  const STEP_META: { id: Step; label: string }[] = [
    { id: "setup", label: "Choose template" },
    { id: "map", label: "Upload Excel" },
    { id: "validate", label: "Check data" },
    { id: "generate", label: "Make PDFs" },
    { id: "send", label: "Email" },
  ];
  const stepIndex = STEP_META.findIndex((s) => s.id === step);

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void onFile(f);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-slate-200 px-4 py-4 sm:px-5">
        <h1 className="font-heading text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          New batch
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload employee data, check it, then create PDFs.
          {batchId ? ` · ${batchId.slice(0, 8)}…` : ""}
        </p>
        <ol className="mt-4 flex flex-wrap gap-1.5">
          {STEP_META.map((s, i) => {
            const active = s.id === step;
            const done = i < stepIndex;
            return (
              <li
                key={s.id}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-center text-xs font-semibold transition-colors duration-150",
                  active
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                    : done
                      ? "bg-indigo-50 text-indigo-800"
                      : "bg-slate-100 text-slate-400"
                )}
              >
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[10px]",
                    active ? "bg-white/20" : done ? "bg-indigo-100" : "bg-white"
                  )}
                >
                  {i + 1}
                </span>
                {s.label}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="space-y-4">
          {step === "setup" && (
            <div className="space-y-4 rounded-xl border border-slate-200 p-4">
              <div>
                <Label>Template</Label>
                <select
                  className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
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
                  className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
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
              <Button
                className="rounded-xl bg-indigo-600 transition-colors duration-150 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                disabled={busy || !templateId}
                onClick={createBatch}
              >
                {busy ? <Spinner className="mr-2 size-4" /> : null}
                {busy ? "Creating…" : "Continue"}
              </Button>
            </div>
          )}

          {step === "map" && batchId && (
            <div className="space-y-4">
              {headers.length > 0 && (
                <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {sourceFileName || "Uploaded file"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {rowCount} rows · {mappedCount} of {headers.length} columns mapped
                      {missingRequired.length > 0 && (
                        <span className="text-rose-600">
                          {" "}
                          · still need {missingRequired.join(", ")}
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    className="rounded-xl bg-indigo-600 transition-colors duration-150 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                    disabled={busy || missingRequired.length > 0}
                    onClick={applyMap}
                  >
                    {busy ? <Spinner className="mr-2 size-4" /> : null}
                    {busy ? "Checking…" : "Save mapping and validate"}
                  </Button>
                </div>
              )}

              <div className="space-y-4 rounded-xl border border-slate-200 p-4">
                <div>
                  <Label>Upload Excel or CSV</Label>
                  <p className="mt-1 text-xs text-slate-500">
                    Need a test file?{" "}
                    <a
                      href="/samples/letter-batch-sample.csv"
                      download="letter-batch-sample.csv"
                      className="font-semibold text-indigo-700 underline underline-offset-2"
                    >
                      Download sample Excel (CSV)
                    </a>{" "}
                    with 5 employees — then upload it here.
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                    onChange={onFileInput}
                  />
                </div>

                {busy && headers.length === 0 && (
                  <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-24 animate-pulse rounded-lg bg-slate-200" />
                  </div>
                )}

                {aiNote && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{aiNote}</p>
                )}

                {headers.length > 0 && (
                  <>
                    {previewRows.length > 0 && mappedFields.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Live preview (first {previewRows.length} rows)
                        </p>
                        <div className="overflow-auto rounded-xl border border-slate-200">
                          <table className="w-full min-w-[640px] text-left text-xs">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-3 py-2.5 font-semibold text-slate-500">#</th>
                                {mappedFields.map((m) => (
                                  <th key={m.excel} className="px-3 py-2.5 font-semibold text-slate-600">
                                    <span className="block text-[10px] font-normal text-slate-400">
                                      {m.excel}
                                    </span>
                                    {m.field}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {previewRows.map((row, i) => (
                                <tr key={i} className="border-t border-slate-100 [content-visibility:auto]">
                                  <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                                  {mappedFields.map((m) => (
                                    <td key={m.excel} className="max-w-[140px] truncate px-3 py-2 text-slate-700">
                                      {row[m.excel] ?? ""}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="overflow-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2.5 font-semibold text-slate-600">Excel column</th>
                            <th className="px-3 py-2.5 font-semibold text-slate-600">Maps to</th>
                          </tr>
                        </thead>
                        <tbody>
                          {headers.map((h) => (
                            <MappingRow
                              key={h}
                              header={h}
                              value={mapping[h] || ""}
                              source={mapSources[h] || ""}
                              systemFields={systemFields}
                              onChange={onMappingChange}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {headers.length === 0 && !busy && (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    Upload an .xlsx or .csv file to detect columns.
                  </p>
                )}
              </div>
            </div>
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
              {causeLine && (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {causeLine}
                </p>
              )}
              <div className="max-h-80 overflow-auto rounded-xl border border-slate-200 bg-white text-xs">
                {visibleGroups.map((g) => (
                  <div
                    key={`${g.code}-${g.severity}`}
                    className="border-b border-slate-100 px-3 py-2.5 [content-visibility:auto]"
                  >
                    <div className="font-semibold text-slate-800">
                      {g.label}
                      <span
                        className={cn(
                          "ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                          g.severity === "BLOCKED"
                            ? "bg-rose-500/15 text-rose-700"
                            : g.severity === "REVIEW"
                              ? "bg-violet-500/15 text-violet-700"
                              : "bg-amber-500/15 text-amber-700"
                        )}
                      >
                        {g.severity} · {g.rows.length} row{g.rows.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-500">
                      Rows {g.rows.slice(0, 12).join(", ")}
                      {g.rows.length > 12 ? ` +${g.rows.length - 12} more` : ""}
                    </p>
                  </div>
                ))}
                {issueGroups.length > 50 && !showAllIssues && (
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 text-left text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                    onClick={() => setShowAllIssues(true)}
                  >
                    Show more ({issueGroups.length - 50} more groups)
                  </button>
                )}
                {issues.length === 0 && (
                  <div className="p-4 text-slate-500">No issues — all rows ready.</div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl border-slate-200 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                  onClick={() => setStep("map")}
                >
                  Fix mapping
                </Button>
                <Button
                  className="rounded-xl bg-indigo-600 transition-colors duration-150 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
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

          {(step === "generate" || (step === "send" && !progress)) &&
            preview &&
            step === "generate" &&
            !progress && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Check a few letters before generating</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Showing the first, middle, and last employee from your file
                  {preview.eligibleCount != null ? ` · ${preview.eligibleCount} ready` : ""}.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    { key: "first" as const, label: "First" },
                    { key: "middle" as const, label: "Middle" },
                    { key: "last" as const, label: "Last" },
                  ] as const
                ).map(({ key, label }) => {
                  const sample = preview.samples?.[key];
                  const data = (sample?.employeeData || {}) as Record<string, string>;
                  return (
                    <SampleEmployeeCard
                      key={key}
                      label={label}
                      data={data}
                      fileName={sample?.suggestedFileName}
                    />
                  );
                })}
              </div>
              <div>
                <Label>PDF password</Label>
                <select
                  className="mt-1 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  value={passwordMode}
                  onChange={(e) => setPasswordMode(e.target.value)}
                >
                  <option value="NONE">No password</option>
                  <option value="FROM_COLUMN">Use password from Excel</option>
                  <option value="EMPLOYEE_ID">Use Employee ID as password</option>
                  <option value="LAST4_ID">Use last 4 digits of Employee ID</option>
                </select>
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={approved}
                  onChange={(e) => setApproved(e.target.checked)}
                  className="size-4 rounded border-slate-300"
                />
                These look correct — generate the PDFs
              </label>
              <Button
                className="rounded-xl bg-indigo-600 transition-colors duration-150 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                disabled={busy || !approved}
                onClick={startGenerate}
              >
                {busy ? <Spinner className="mr-2 size-4" /> : null}
                {busy ? "Starting…" : "Generate PDFs"}
              </Button>
            </div>
          )}

          {step === "generate" && progress && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900">Creating PDFs</h2>
              <Progress value={pct} />
              <p className="flex items-center gap-2 text-sm text-slate-600">
                {progress.pending > 0 && !(progress.failed > 0 && progress.generated === 0) ? (
                  <Spinner className="size-4 text-indigo-600" />
                ) : null}
                {progress.generated} done · {progress.pending} waiting
                {progress.failed > 0 ? ` · ${progress.failed} failed` : ""}
              </p>
              {progress.lastError && progress.generated === 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-900">
                  <p className="font-semibold">PDFs could not be created</p>
                  <p className="mt-1 text-xs leading-relaxed text-rose-800">{progress.lastError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 rounded-xl border-rose-200"
                    disabled={busy}
                    onClick={() => {
                      setProgress(null);
                      setApproved(false);
                    }}
                  >
                    Back — try again
                  </Button>
                </div>
              )}
              {progress.failed > 0 && progress.generated === 0 && !progress.lastError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-900">
                  <p className="font-semibold">PDFs could not be created</p>
                  <p className="mt-1 text-xs leading-relaxed text-rose-800">
                    The server failed while making the letter PDFs. Try again, or ask your admin to
                    check the letter worker logs.
                  </p>
                </div>
              )}
              {progress.pending > 0 && !progress.lastError && (
                <div className="h-2 animate-pulse rounded bg-slate-100" />
              )}
            </div>
          )}

          {step === "send" && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              {progress?.failed > 0 && !(progress?.generated > 0) && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-900">
                  <p className="font-semibold">No PDFs were created</p>
                  <p className="mt-1 text-xs leading-relaxed text-rose-800">
                    {progress.lastError ||
                      "Something went wrong on the server while creating PDFs."}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 rounded-xl border-rose-200"
                    onClick={() => {
                      setProgress(null);
                      setApproved(false);
                      setStep("generate");
                    }}
                  >
                    Try generating again
                  </Button>
                </div>
              )}
              {progress?.aiSummary && (
                <div className="rounded-xl bg-indigo-50 px-3 py-2.5 text-sm text-indigo-900">
                  {progress.aiSummary}
                </div>
              )}
              {(progress?.generated > 0 || !(progress?.failed > 0)) && (
                <>
                  <div>
                    <Label>Mode</Label>
                    <select
                      className="mt-1 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      value={sendMode}
                      onChange={(e) => setSendMode(e.target.value as any)}
                      disabled={!canSend}
                    >
                      <option value="GENERATE_ONLY">Generate only (no email)</option>
                      {canSend && <option value="CREATE_DRAFTS">Create drafts (default)</option>}
                      {canSend && <option value="SEND_NOW">Send now</option>}
                    </select>
                    {!canSend && (
                      <p className="mt-1 text-xs text-slate-500">
                        Free plan creates PDFs only — upgrade to email letters.
                      </p>
                    )}
                  </div>
                  {sendMode !== "GENERATE_ONLY" && canSend && (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-slate-200"
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
                          className="rounded-xl border-slate-200"
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
                          className="mt-1 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
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
                  {sendMode === "SEND_NOW" && canSend && (
                    <div>
                      <Label>
                        Confirm recipient count ({progress?.generated || preview?.eligibleCount || "?"})
                      </Label>
                      <Input
                        type="number"
                        value={confirmCount}
                        onChange={(e) =>
                          setConfirmCount(e.target.value ? Number(e.target.value) : "")
                        }
                      />
                    </div>
                  )}
                  <Button
                    className="rounded-xl bg-indigo-600 transition-colors duration-150 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                    disabled={busy || !(progress?.generated > 0)}
                    onClick={doSend}
                  >
                    {busy ? <Spinner className="mr-2 size-4" /> : null}
                    {busy
                      ? "Working…"
                      : sendMode === "SEND_NOW" && canSend
                        ? "Confirm & send now"
                        : "Continue"}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatMoney(value: string | undefined): string | null {
  if (value == null || String(value).trim() === "") return null;
  const n = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString("en-IN");
}

function SampleEmployeeCard({
  label,
  data,
  fileName,
}: {
  label: string;
  data: Record<string, string>;
  fileName?: string;
}) {
  const name = data.Employee_Name || "Employee";
  const id = data.Employee_ID || "—";
  const role = [data.Designation, data.Department].filter(Boolean).join(" · ");
  const oldCtc = formatMoney(data.Old_CTC);
  const newCtc = formatMoney(data.New_CTC);
  const hike = data.Increment_Percent ? `${data.Increment_Percent}%` : null;
  const effective = data.Effective_Date || null;
  const email = data.Employee_Email || null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1.5 text-sm font-semibold text-slate-900">{name}</p>
      <p className="text-xs text-slate-500">ID {id}</p>
      {role ? <p className="mt-1 text-xs text-slate-600">{role}</p> : null}
      <dl className="mt-3 space-y-1.5 text-xs">
        {(oldCtc || newCtc) && (
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Salary</dt>
            <dd className="text-right font-medium text-slate-800">
              {oldCtc && newCtc ? (
                <>
                  {oldCtc} → {newCtc}
                  {hike ? ` (${hike})` : ""}
                </>
              ) : (
                newCtc || oldCtc
              )}
            </dd>
          </div>
        )}
        {effective && (
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Effective</dt>
            <dd className="font-medium text-slate-800">{effective}</dd>
          </div>
        )}
        {email && (
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Email</dt>
            <dd className="max-w-[60%] truncate text-right font-medium text-slate-800" title={email}>
              {email}
            </dd>
          </div>
        )}
        {data.Manager_Name && (
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Manager</dt>
            <dd className="font-medium text-slate-800">{data.Manager_Name}</dd>
          </div>
        )}
      </dl>
      {fileName ? (
        <p className="mt-3 truncate border-t border-slate-200/80 pt-2 text-[10px] text-slate-400" title={fileName}>
          PDF: {fileName}
        </p>
      ) : null}
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
    <div className={`rounded-xl border p-3 shadow-sm ${colors[tone]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium opacity-80">{label}</div>
    </div>
  );
}
