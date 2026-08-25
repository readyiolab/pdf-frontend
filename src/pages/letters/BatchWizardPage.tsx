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
  unmappedRequired,
  type MappingSource,
} from "@/lib/letterMapping";
import { cn } from "@/lib/utils";
import { ensureLetterOrgId, readLetterOrgId, writeLetterOrgId } from "@/features/letters/orgHelpers";
import { ChevronDown } from "lucide-react";

function orgId() {
  return readLetterOrgId();
}

type Step = "setup" | "map" | "validate" | "generate" | "send";

function severityPlain(severity: string): string {
  if (severity === "BLOCKED") return "Can't send";
  if (severity === "REVIEW") return "Needs a look";
  return "Needs a look";
}

/** Human labels for system letter fields shown in mapping UI. */
function fieldLabel(field: string): string {
  const map: Record<string, string> = {
    Employee_ID: "Employee ID",
    Employee_Name: "Employee name",
    Employee_Email: "Employee email",
    Designation: "Designation",
    Department: "Department",
    Effective_Date: "Effective date",
    Current_Salary: "Current salary",
    New_Salary: "New salary",
    Increment_Amount: "Increment amount",
    Increment_Percent: "Increment %",
  };
  return map[field] || field.replace(/_/g, " ");
}

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
              {fieldLabel(f)}
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
  /** True only after Generate PDFs is queued — drives progress polling. */
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [showFixMatches, setShowFixMatches] = useState(false);
  const [showCompanyLook, setShowCompanyLook] = useState(false);

  useEffect(() => {
    setSendMode(canSend ? "CREATE_DRAFTS" : "GENERATE_ONLY");
  }, [canSend]);

  useEffect(() => {
    const just = localStorage.getItem("letter_mail_just_connected");
    if (just) {
      localStorage.removeItem("letter_mail_just_connected");
      lettersApi
        .mailAccounts()
        .then((accounts) => {
          setMailAccounts(accounts.accounts);
          const match = accounts.accounts.find((a) => a.emailAddress === just);
          if (match) setMailAccountId(match.id);
          else if (accounts.accounts[0]) setMailAccountId(accounts.accounts[0].id);
        })
        .catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (!orgId()) {
        const boot = await lettersApi.bootstrap();
        writeLetterOrgId(boot.org.organization.id, {
          role: boot.org.role,
          orgName: boot.org.organization.name,
          userId: user?.id,
        });
      } else {
        await ensureLetterOrgId(user?.id);
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
          setIsGenerating(true);
          try {
            const p = await lettersApi.progress(orgId(), routeBatchId);
            setProgress(p);
          } catch {
            /* ignore */
          }
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
      toast.success("Ready — upload your spreadsheet next");
      setStep("map");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File) => {
    if (!batchId) {
      toast.error("Start send first — choose a template and continue");
      return;
    }
    setBusy(true);
    try {
      const { apiService } = await import("@/services/api");
      const sourceFileKey = await apiService.uploadFileDirect(file);
      const parsed = await lettersApi.parseUpload(orgId(), batchId, {
        sourceFileKey,
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
      setShowFixMatches(unmappedRequired(next).length > 0);
      setStep("map");
      const n = parsed.totalRows || parsed.rows?.length || 0;
      toast.success(
        unmappedRequired(next).length
          ? `Found ${n} employees — please match a few columns`
          : `Found ${n} employees`
      );
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

  const missingRequired = useMemo(() => unmappedRequired(mapping), [mapping]);

  const applyMap = async () => {
    if (missingRequired.length) {
      toast.error(
        `Still need: ${missingRequired.map((f) => fieldLabel(f)).join(", ")}`
      );
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
      toast.success("Employee list ready to review");
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
      setIsGenerating(true);
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

  // Poll only while generation is actually running
  useEffect(() => {
    if (step !== "generate" || !batchId || !isGenerating) return;
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

        // Generate never started / was reset — stop polling
        if (p.status === "VALIDATED" || p.status === "MAPPED" || p.status === "DRAFT") {
          setIsGenerating(false);
          setProgress(null);
          toast.error("PDF creation did not start. Click Generate PDFs again.");
          return;
        }

        setProgress(p);
        const key = `${p.generated}-${p.pending}-${p.failed}-${p.status}`;
        if (key === lastKey) stableTicks += 1;
        else {
          stableTicks = 0;
          lastKey = key;
        }
        if (p.status === "GENERATED" || (p.status === "GENERATING" && p.pending === 0)) {
          try {
            const sum = await lettersApi.aiSummary(orgId(), batchId);
            setProgress((prev: any) => ({ ...prev, ...p, aiSummary: sum.summary }));
          } catch {
            setProgress(p);
          }
          setIsGenerating(false);
          if (p.generated === 0 && p.failed > 0) {
            toast.error("PDFs could not be created. See the message on screen.");
          }
          setStep("send");
          const accounts = await lettersApi.mailAccounts();
          setMailAccounts(accounts.accounts);
          return;
        }
        // ~2 minutes with no progress change → surface stuck state
        if (
          stableTicks >= 24 &&
          p.status === "GENERATING" &&
          p.pending > 0 &&
          p.generated === 0
        ) {
          setProgress((prev: any) => ({
            ...prev,
            ...p,
            lastError:
              p.lastError ||
              prev?.lastError ||
              "PDF creation is taking longer than expected. Please wait a bit more, or try again.",
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
  }, [step, batchId, isGenerating]);

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
      return null;
    }
    const top = issueGroups[0];
    if (!top) return null;
    const n = summary.blocked || top.rows.length;
    return `${n} employee${n === 1 ? "" : "s"} need attention: ${top.label}.`;
  }, [summary, issueGroups]);

  const visibleGroups = showAllIssues ? issueGroups : issueGroups.slice(0, 50);

  const nameCol = useMemo(
    () => Object.entries(mapping).find(([, f]) => f === "Employee_Name")?.[0] || null,
    [mapping]
  );
  const emailCol = useMemo(
    () => Object.entries(mapping).find(([, f]) => f === "Employee_Email")?.[0] || null,
    [mapping]
  );

  const employeePreview = useMemo(() => {
    const rows =
      allRowsRef.current.length > 0 ? allRowsRef.current.slice(0, 12) : previewRows;
    return rows.map((row, i) => ({
      name: (nameCol && row[nameCol]) || `Employee ${i + 1}`,
      email: (emailCol && row[emailCol]) || "",
    }));
  }, [previewRows, nameCol, emailCol, mapping, headers]);

  const rowName = useCallback(
    (rowNum1Based: number) => {
      const row = allRowsRef.current[rowNum1Based - 1];
      if (!row) return `Row ${rowNum1Based}`;
      return (nameCol && row[nameCol]) || `Row ${rowNum1Based}`;
    },
    [nameCol, mapping]
  );

  const columnsReady = headers.length > 0 && missingRequired.length === 0;

  const STEP_META: { id: Step; label: string; nextHint: string }[] = [
    {
      id: "setup",
      label: "Choose template",
      nextHint: "Next: pick which letter to send. Company logo is optional.",
    },
    {
      id: "map",
      label: "Upload spreadsheet",
      nextHint: "Next: upload your Excel/CSV. We match columns for you.",
    },
    {
      id: "validate",
      label: "Review employees",
      nextHint: "Next: make sure the employee list looks right, then create PDFs.",
    },
    {
      id: "generate",
      label: "Create PDFs",
      nextHint: "Next: create one PDF per employee.",
    },
    {
      id: "send",
      label: "Send or download",
      nextHint: "Next: download a ZIP, or email from your Outlook/Gmail.",
    },
  ];
  const stepIndex = STEP_META.findIndex((s) => s.id === step);
  const stepHint = STEP_META[stepIndex]?.nextHint ?? "";

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void onFile(f);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-slate-200 px-4 py-4 sm:px-5">
        <h1 className="font-heading text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Send letters
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload employee data, review it, then create PDFs — or email them.
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
        {stepHint && (
          <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {stepHint}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="space-y-4">
          {step === "setup" && (
            <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <div>
                <Label className="text-sm font-semibold text-slate-900">
                  Pick which letter to send
                </Label>
                <p className="mt-0.5 text-xs text-slate-500">
                  Choose one letter type. You can edit the wording later under Letter templates.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTemplateId(t.id)}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left transition",
                        templateId === t.id
                          ? "border-indigo-300 bg-indigo-50/80 shadow-sm ring-1 ring-indigo-200"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                    </button>
                  ))}
                  {templates.length === 0 && (
                    <p className="text-sm text-slate-500 sm:col-span-2">
                      No letters yet — open Letter templates first, then come back.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
                  onClick={() => setShowCompanyLook((v) => !v)}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Add company logo &amp; signatory (optional)
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {brandProfileId
                        ? brands.find((b) => b.id === brandProfileId)?.name || "Selected"
                        : "Skipped — plain letter"}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-slate-400 transition",
                      showCompanyLook && "rotate-180"
                    )}
                  />
                </button>
                {showCompanyLook && (
                  <div className="grid gap-2 border-t border-slate-100 p-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setBrandProfileId("")}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left transition",
                        !brandProfileId
                          ? "border-indigo-300 bg-indigo-50/80 ring-1 ring-indigo-200"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <p className="text-sm font-semibold text-slate-900">No company look</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Plain letter — add later
                      </p>
                    </button>
                    {brands.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBrandProfileId(b.id)}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-left transition",
                          brandProfileId === b.id
                            ? "border-indigo-300 bg-indigo-50/80 ring-1 ring-indigo-200"
                            : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <p className="truncate text-sm font-semibold text-slate-900">{b.name}</p>
                        <p className="truncate text-[11px] text-slate-500">
                          {b.signatoryName || "No signatory yet"}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button
                className="rounded-xl bg-indigo-600 transition-colors duration-150 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                disabled={busy || !templateId}
                onClick={createBatch}
              >
                {busy ? <Spinner className="mr-2 size-4" /> : null}
                {busy ? "Creating…" : "Next: upload employees"}
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
                      {columnsReady ? (
                        <>{rowCount} employees ready</>
                      ) : (
                        <span className="text-rose-600">
                          Need: {missingRequired.map((f) => fieldLabel(f)).join(", ")}
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
                    {busy ? "Checking…" : "Looks good — continue"}
                  </Button>
                </div>
              )}

              <div className="space-y-4 rounded-xl border border-slate-200 p-4">
                <div>
                  <Label>Upload your employee Excel or CSV</Label>
                  <p className="mt-1 text-xs text-slate-500">
                    Need a test file?{" "}
                    <a
                      href="/samples/letter-batch-sample.csv"
                      download="letter-batch-sample.csv"
                      className="font-semibold text-indigo-700 underline underline-offset-2"
                    >
                      Download a sample with 5 employees
                    </a>
                    , then upload it here.
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

                {aiNote && showFixMatches && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{aiNote}</p>
                )}

                {headers.length > 0 && columnsReady && !showFixMatches && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
                      <p className="text-sm font-semibold text-emerald-900">
                        We found {rowCount} employees and matched your columns.
                      </p>
                      <p className="mt-1 text-xs text-emerald-800">
                        Check the names below. If something looks wrong, fix the column matches.
                      </p>
                    </div>
                    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      {employeePreview.map((emp, i) => (
                        <li
                          key={`${emp.name}-${i}`}
                          className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                        >
                          <span className="font-medium text-slate-900">{emp.name}</span>
                          <span className="truncate text-xs text-slate-500">{emp.email || "—"}</span>
                        </li>
                      ))}
                      {rowCount > employeePreview.length && (
                        <li className="px-4 py-2 text-xs text-slate-500">
                          +{rowCount - employeePreview.length} more employees
                        </li>
                      )}
                    </ul>
                    <button
                      type="button"
                      className="text-sm font-semibold text-indigo-700 underline-offset-2 hover:underline"
                      onClick={() => setShowFixMatches(true)}
                    >
                      Columns look wrong? Fix matches
                    </button>
                  </div>
                )}

                {headers.length > 0 && (showFixMatches || !columnsReady) && (
                  <div className="space-y-3">
                    {!columnsReady && (
                      <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                        Need: {missingRequired.map((f) => fieldLabel(f)).join(", ")}. Match them
                        below, then continue.
                      </p>
                    )}
                    {columnsReady && (
                      <button
                        type="button"
                        className="text-sm font-semibold text-slate-600 underline-offset-2 hover:underline"
                        onClick={() => setShowFixMatches(false)}
                      >
                        Hide column matching
                      </button>
                    )}
                    <div className="overflow-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2.5 font-semibold text-slate-600">
                              Spreadsheet column
                            </th>
                            <th className="px-3 py-2.5 font-semibold text-slate-600">
                              Goes into letter field
                            </th>
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
                  </div>
                )}

                {headers.length === 0 && !busy && (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    Upload an Excel or CSV file with your employee list.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === "validate" && (
            <div className="space-y-4">
              {summary && summary.blocked === 0 && summary.warning === 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-4">
                  <p className="text-sm font-semibold text-emerald-900">
                    All {summary.ready} employees look good
                  </p>
                  <p className="mt-1 text-xs text-emerald-800">
                    You can create the letter PDFs now.
                  </p>
                </div>
              )}
              {summary && (
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="Ready to send" value={summary.ready} tone="emerald" />
                  <Stat label="Needs a look" value={summary.warning} tone="amber" />
                  <Stat label="Can't send" value={summary.blocked} tone="rose" />
                </div>
              )}
              {causeLine && (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {causeLine}
                </p>
              )}
              {(issueGroups.length > 0 || (summary && (summary.warning > 0 || summary.blocked > 0))) && (
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
                              : "bg-amber-500/15 text-amber-700"
                          )}
                        >
                          {severityPlain(g.severity)} · {g.rows.length} employee
                          {g.rows.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-500">
                        {g.rows
                          .slice(0, 8)
                          .map((r) => rowName(r))
                          .join(", ")}
                        {g.rows.length > 8 ? ` +${g.rows.length - 8} more` : ""}
                      </p>
                    </div>
                  ))}
                  {issueGroups.length > 50 && !showAllIssues && (
                    <button
                      type="button"
                      className="w-full px-3 py-2.5 text-left text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                      onClick={() => setShowAllIssues(true)}
                    >
                      Show more
                    </button>
                  )}
                  {issues.length === 0 && (
                    <div className="p-4 text-slate-500">No problems found.</div>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl border-slate-200 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                  onClick={() => {
                    setShowFixMatches(true);
                    setStep("map");
                  }}
                >
                  Go back
                </Button>
                <Button
                  className="rounded-xl bg-indigo-600 transition-colors duration-150 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                  disabled={busy || (summary && summary.ready + summary.warning === 0)}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const prev = await lettersApi.preview(orgId(), batchId);
                      setPreview(prev);
                      setProgress(null);
                      setIsGenerating(false);
                      setApproved(false);
                      setStep("generate");
                    } catch (e: any) {
                      toast.error(e.message || "Could not load preview");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? <Spinner className="mr-2 size-4" /> : null}
                  {busy ? "Loading…" : "Create PDFs"}
                </Button>
              </div>
            </div>
          )}

          {(step === "generate" || (step === "send" && !progress)) &&
            preview &&
            step === "generate" &&
            !isGenerating && (
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

          {step === "generate" && isGenerating && progress && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900">Creating PDFs</h2>
              <Progress value={pct} />
              <p className="flex items-center gap-2 text-sm text-slate-600">
                {progress.pending > 0 && !(progress.failed > 0 && progress.generated === 0) ? (
                  <Spinner className="size-4 text-indigo-600" />
                ) : null}
                {progress.pending > 0
                  ? `Creating letter ${Math.min(
                      (progress.generated || 0) + 1,
                      (progress.generated || 0) + (progress.pending || 0) + (progress.failed || 0)
                    )} of ${(progress.generated || 0) + (progress.pending || 0) + (progress.failed || 0)}…`
                  : `${progress.generated} done`}
                {progress.failed > 0 ? ` · ${progress.failed} need retry` : ""}
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
                      setIsGenerating(false);
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
                    Something went wrong while creating the letter PDFs. Please try again.
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
                      "Something went wrong while creating PDFs. Please try again."}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 rounded-xl border-rose-200"
                    onClick={() => {
                      setProgress(null);
                      setIsGenerating(false);
                      setApproved(false);
                      setStep("generate");
                    }}
                  >
                    Try generating again
                  </Button>
                </div>
              )}
              {progress?.generated > 0 && progress?.failed > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
                  <p className="font-semibold">
                    {progress.generated} ready · {progress.failed} could not be created
                  </p>
                  {Array.isArray(progress.failedEmployees) && progress.failedEmployees.length > 0 && (
                    <ul className="mt-2 list-inside list-disc text-xs text-amber-900">
                      {progress.failedEmployees.slice(0, 8).map((f: any) => (
                        <li key={f.id}>{f.name}</li>
                      ))}
                    </ul>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 rounded-xl border-amber-300"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const res = await lettersApi.retryFailedGenerate(orgId(), batchId);
                        setIsGenerating(true);
                        setStep("generate");
                        setProgress({
                          status: "GENERATING",
                          generated: progress.generated,
                          pending: res.queued || progress.failed,
                          failed: 0,
                        });
                        toast.success(`Retrying ${res.queued} failed letter(s)…`);
                      } catch (e: any) {
                        toast.error(e.message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {busy ? <Spinner className="mr-2 size-4" /> : null}
                    Retry failed only
                  </Button>
                </div>
              )}
              {progress?.aiSummary && (
                <div className="rounded-xl bg-indigo-50 px-3 py-2.5 text-sm text-indigo-900">
                  {progress.aiSummary}
                </div>
              )}
              {(progress?.generated > 0 || !(progress?.failed > 0)) && (
                <div className="space-y-4">
                  {progress?.generated > 0 && (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-4">
                      <p className="text-sm font-semibold text-slate-900">
                        Download ZIP
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        Get all {progress.generated} letter PDF
                        {progress.generated === 1 ? "" : "s"} on your computer.
                      </p>
                      <Button
                        type="button"
                        className="mt-3 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                        disabled={downloadingZip}
                        onClick={async () => {
                          setDownloadingZip(true);
                          try {
                            await lettersApi.downloadPdfsZip(orgId(), batchId);
                            toast.success("Downloading letter PDFs");
                          } catch (e: any) {
                            toast.error(e.message || "Download failed");
                          } finally {
                            setDownloadingZip(false);
                          }
                        }}
                      >
                        {downloadingZip ? <Spinner className="mr-2 size-4" /> : null}
                        Download ZIP
                      </Button>
                    </div>
                  )}

                  <div className="rounded-xl border border-slate-200 px-4 py-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Email from Outlook or Gmail
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      Letters go from <span className="font-medium">your</span> mailbox (not
                      Zuvigo). Connect once, then create drafts or send.
                    </p>
                    {!canSend && (
                      <p className="mt-2 text-xs text-amber-800">
                        Email needs PRO — you can still download PDFs above.
                      </p>
                    )}
                    {canSend && (
                      <div className="mt-3 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant={sendMode === "CREATE_DRAFTS" ? "default" : "outline"}
                            size="sm"
                            className={cn(
                              "rounded-xl",
                              sendMode === "CREATE_DRAFTS" && "bg-indigo-600 hover:bg-indigo-700"
                            )}
                            onClick={() => setSendMode("CREATE_DRAFTS")}
                          >
                            Create drafts (safer)
                          </Button>
                          <Button
                            type="button"
                            variant={sendMode === "SEND_NOW" ? "default" : "outline"}
                            size="sm"
                            className={cn(
                              "rounded-xl",
                              sendMode === "SEND_NOW" && "bg-indigo-600 hover:bg-indigo-700"
                            )}
                            onClick={() => setSendMode("SEND_NOW")}
                          >
                            Send now
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-slate-200"
                            disabled={busy}
                            onClick={async () => {
                              setBusy(true);
                              try {
                                localStorage.setItem(
                                  "letter_mail_return_to",
                                  `/letters/batches/${batchId}`
                                );
                                const { url } = await lettersApi.mailAuthorize("OUTLOOK");
                                window.location.href = url;
                              } catch (e: any) {
                                toast.error(e.message);
                                setBusy(false);
                              }
                            }}
                          >
                            Connect Outlook
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-slate-200"
                            disabled={busy}
                            onClick={async () => {
                              setBusy(true);
                              try {
                                localStorage.setItem(
                                  "letter_mail_return_to",
                                  `/letters/batches/${batchId}`
                                );
                                const { url } = await lettersApi.mailAuthorize("GMAIL");
                                window.location.href = url;
                              } catch (e: any) {
                                toast.error(e.message);
                                setBusy(false);
                              }
                            }}
                          >
                            Connect Gmail
                          </Button>
                        </div>
                        <div>
                          <Label>Send as</Label>
                          <select
                            className="mt-1 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            value={mailAccountId}
                            onChange={(e) => setMailAccountId(e.target.value)}
                          >
                            <option value="">Select connected mailbox…</option>
                            {mailAccounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.provider} · {a.emailAddress}
                              </option>
                            ))}
                          </select>
                          {mailAccountId && (
                            <p className="mt-1 text-xs text-slate-500">
                              Sending as{" "}
                              {mailAccounts.find((a) => a.id === mailAccountId)?.emailAddress ||
                                "your mailbox"}
                              .{" "}
                              <button
                                type="button"
                                className="underline"
                                onClick={async () => {
                                  try {
                                    await lettersApi.disconnectMail(mailAccountId);
                                    const accounts = await lettersApi.mailAccounts();
                                    setMailAccounts(accounts.accounts);
                                    setMailAccountId("");
                                    toast.success("Mailbox disconnected");
                                  } catch (e: any) {
                                    toast.error(e.message);
                                  }
                                }}
                              >
                                Disconnect
                              </button>
                            </p>
                          )}
                        </div>
                        <div>
                          <Label>Email subject</Label>
                          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                        </div>
                        {sendMode === "SEND_NOW" && (
                          <div>
                            <Label>
                              Confirm recipient count (
                              {progress?.generated || preview?.eligibleCount || "?"})
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
                          onClick={() => void doSend()}
                        >
                          {busy ? <Spinner className="mr-2 size-4" /> : null}
                          {busy
                            ? "Working…"
                            : sendMode === "SEND_NOW"
                              ? "Confirm & send now"
                              : "Create email drafts"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
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
