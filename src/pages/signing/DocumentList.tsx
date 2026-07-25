import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSignature,
  FileStack,
  FileText,
  PenLine,
  Search,
  Send,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { loadPdfDocument } from "@/lib/pdf";
import { signingApi, type SignTemplateSummary, type SigningStats } from "@/services/signingApi";
import { SIGNING_LIMITS, type SignDocumentStatus, type SignDocumentSummary } from "@/lib/signing/types";
import { ESignHowItWorks } from "@/components/signing/ESignHowItWorks";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_TABS: { value: SignDocumentStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Waiting" },
  { value: "FINALIZING", label: "Sealing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "DECLINED", label: "Declined" },
  { value: "EXPIRED", label: "Expired" },
  { value: "VOIDED", label: "Cancelled" },
];

const STATUS_LABEL: Record<SignDocumentStatus, string> = {
  DRAFT: "Draft",
  SENT: "Waiting for signatures",
  FINALIZING: "Sealing signed PDF",
  COMPLETED: "Completed",
  DECLINED: "Declined",
  EXPIRED: "Expired",
  VOIDED: "Cancelled",
};

const STATUS_STYLE: Record<SignDocumentStatus, { className: string; icon: typeof Clock }> = {
  DRAFT: { className: "bg-muted text-muted-foreground", icon: FileText },
  SENT: { className: "bg-blue-500/10 text-blue-600 dark:text-blue-400", icon: Send },
  FINALIZING: { className: "bg-sky-500/10 text-sky-600 dark:text-sky-400", icon: Clock },
  COMPLETED: { className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
  DECLINED: { className: "bg-destructive/10 text-destructive", icon: XCircle },
  EXPIRED: { className: "bg-amber-500/10 text-amber-600 dark:text-amber-500", icon: Clock },
  VOIDED: { className: "bg-muted text-muted-foreground", icon: XCircle },
};

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function DocumentList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selfFileInputRef = useRef<HTMLInputElement>(null);
  const uploadModeRef = useRef<"normal" | "self">("normal");

  const [mainTab, setMainTab] = useState<"documents" | "templates">("documents");
  const [documents, setDocuments] = useState<SignDocumentSummary[]>([]);
  const [templates, setTemplates] = useState<SignTemplateSummary[]>([]);
  const [stats, setStats] = useState<SigningStats | null>(null);
  const [status, setStatus] = useState<SignDocumentStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [useTemplateId, setUseTemplateId] = useState<string | null>(null);
  const [useEmails, setUseEmails] = useState<string[]>([]);
  const [isUsingTemplate, setIsUsingTemplate] = useState(false);

  const load = useCallback(async () => {
    try {
      if (mainTab === "templates") {
        const data = await signingApi.listTemplates();
        setTemplates(data.templates ?? []);
      } else {
        const [list, s] = await Promise.all([
          signingApi.listDocuments({
            status: status === "ALL" ? undefined : status,
            search: search || undefined,
          }),
          signingApi.getStats(),
        ]);
        setDocuments(list.documents ?? []);
        setStats(s);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load your documents.");
    } finally {
      setIsLoading(false);
    }
  }, [status, search, mainTab]);

  // Debounced so typing in the search box doesn't fire a request per keystroke.
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(load, search && mainTab === "documents" ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search, mainTab]);

  const handleUpload = async (file: File, mode: "normal" | "self") => {
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files can be sent for signature.");
      return;
    }
    if (file.size > SIGNING_LIMITS.maxFileSize) {
      toast.error(`That file is larger than the ${SIGNING_LIMITS.maxFileSize / (1024 * 1024)}MB limit.`);
      return;
    }
    if (mode === "self" && (!user?.email || !user?.name)) {
      toast.error("Your account name and email are required to sign yourself.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      let pageCount = 0;
      try {
        const pdf = await loadPdfDocument(await file.arrayBuffer());
        pageCount = pdf.numPages;
        pdf.destroy();
      } catch (err) {
        toast.error(
          (err as Error)?.name === "PasswordException"
            ? "This PDF is password protected. Remove the password before sending it for signature."
            : "This file couldn't be read as a PDF."
        );
        return;
      }

      const doc = await signingApi.uploadDocument(file, pageCount, setUploadProgress);

      if (mode === "self" && user) {
        await signingApi.addRecipient(doc.id, {
          name: user.name || user.email,
          email: user.email,
          role: "SIGNER",
          authMethod: "NONE",
          signingOrder: 1,
        });
        toast.success("Document ready — place your signature fields, then Sign now.");
        navigate(`/sign/${doc.id}?self=1`);
        return;
      }

      toast.success("Document uploaded — add recipients and place your fields.");
      navigate(`/sign/${doc.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (doc: SignDocumentSummary) => {
    if (!window.confirm(`Delete "${doc.title}"? This can't be undone.`)) return;
    try {
      await signingApi.deleteDocument(doc.id);
      setDocuments((current) => current.filter((d) => d.id !== doc.id));
      toast.success("Document deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete the document.");
    }
  };

  const openUseTemplate = (tpl: SignTemplateSummary) => {
    setUseTemplateId(tpl.id);
    setUseEmails(tpl.recipients.map(() => ""));
  };

  const confirmUseTemplate = async () => {
    const tpl = templates.find((t) => t.id === useTemplateId);
    if (!tpl) return;
    if (useEmails.some((e) => !e.trim() || !e.includes("@"))) {
      toast.error("Enter a valid email for each recipient role.");
      return;
    }
    setIsUsingTemplate(true);
    try {
      const doc = await signingApi.useTemplate(
        tpl.id,
        tpl.recipients.map((r, i) => ({
          email: useEmails[i].trim(),
          name: r.name,
        }))
      );
      toast.success("Draft created from template.");
      setUseTemplateId(null);
      navigate(`/sign/${doc.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't use this template.");
    } finally {
      setIsUsingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (tpl: SignTemplateSummary) => {
    if (!window.confirm(`Delete template "${tpl.name}"?`)) return;
    try {
      await signingApi.deleteTemplate(tpl.id);
      setTemplates((current) => current.filter((t) => t.id !== tpl.id));
      toast.success("Template deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete the template.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      {/* --- Header --- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Signatures</h1>
          <p className="text-sm text-muted-foreground">Send documents for signature and track their progress.</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file, uploadModeRef.current);
            e.target.value = "";
          }}
        />
        <input
          ref={selfFileInputRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file, "self");
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              uploadModeRef.current = "self";
              selfFileInputRef.current?.click();
            }}
            disabled={isUploading}
          >
            {isUploading && uploadModeRef.current === "self" ? (
              <Spinner className="size-4" />
            ) : (
              <PenLine />
            )}
            Sign myself
          </Button>
          <Button
            onClick={() => {
              uploadModeRef.current = "normal";
              fileInputRef.current?.click();
            }}
            disabled={isUploading}
          >
            {isUploading && uploadModeRef.current === "normal" ? (
              <Spinner className="size-4" />
            ) : (
              <Upload />
            )}
            {isUploading ? `Uploading ${uploadProgress}%` : "New document"}
          </Button>
        </div>
      </div>

      <ESignHowItWorks forceOpen={!isLoading && documents.length === 0 && !search && status === "ALL" && mainTab === "documents"} />

      {stats && mainTab === "documents" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Draft" value={stats.byStatus.DRAFT} />
          <StatCard label="Waiting for signatures" value={stats.byStatus.SENT} />
          <StatCard label="Completed" value={stats.byStatus.COMPLETED} />
          <StatCard
            label="Sends left this month"
            value={`${stats.quota.remaining} / ${stats.quota.limit}`}
            hint={stats.quota.plan === "FREE" ? "Upgrade to PRO for more" : "rolling 30 days"}
          />
        </div>
      )}

      {stats && mainTab === "documents" && stats.quota.plan === "FREE" && stats.quota.remaining <= 1 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-500">
          <AlertTriangle className="size-3.5 shrink-0" />
          {stats.quota.remaining === 0
            ? "You've used all your free sends this month. Upgrade to PRO to send more documents for signature."
            : "You have 1 free send left this month. Upgrade to PRO for more."}
        </div>
      )}

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "documents" | "templates")}>
        <TabsList>
          <TabsTrigger value="documents" className="text-xs">
            Documents
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs gap-1.5">
            <FileStack className="size-3" />
            Templates
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {mainTab === "documents" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={status} onValueChange={(v) => setStatus(v as SignDocumentStatus | "ALL")}>
              <TabsList>
                {STATUS_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                    {tab.label}
                    {stats && tab.value !== "ALL" && stats.byStatus[tab.value] > 0 && (
                      <span className="ml-1.5 text-[10px] tabular-nums opacity-60">
                        {stats.byStatus[tab.value]}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="relative ml-auto">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents…"
                className="h-9 w-56 pl-8 text-sm"
                aria-label="Search documents"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                <FileSignature className="size-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold">
                  {search || status !== "ALL" ? "No matching documents" : "No documents yet"}
                </p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  {search || status !== "ALL"
                    ? "Try a different search or filter."
                    : "Upload a PDF, drop in your signature fields, and send it off for signature."}
                </p>
              </div>
              {!search && status === "ALL" && (
                <Button
                  variant="outline"
                  onClick={() => {
                    uploadModeRef.current = "normal";
                    fileInputRef.current?.click();
                  }}
                >
                  <Upload />
                  Upload a PDF
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => {
                const style = STATUS_STYLE[doc.status];
                const StatusIcon = style.icon;
                return (
                  <div
                    key={doc.id}
                    onClick={() => navigate(`/sign/${doc.id}`)}
                    onKeyDown={(e) => e.key === "Enter" && navigate(`/sign/${doc.id}`)}
                    role="button"
                    tabIndex={0}
                    className="group flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <FileText className="size-4 text-muted-foreground" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{doc.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {doc.recipientCount === 0
                          ? "No recipients yet"
                          : `${doc.completedCount} of ${doc.recipientCount} signed`}
                        {" · "}
                        {new Date(doc.updatedAt).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <Badge className={cn("gap-1 border-0", style.className)}>
                      <StatusIcon className="size-3" />
                      {STATUS_LABEL[doc.status]}
                    </Badge>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc);
                      }}
                      disabled={doc.status === "COMPLETED"}
                      className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      aria-label={`Delete ${doc.title}`}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {mainTab === "templates" && (
        <>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                <FileStack className="size-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold">No templates yet</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Open a draft and use Save as template to reuse recipient roles and field layouts.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileStack className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{tpl.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {tpl.recipientCount} role{tpl.recipientCount === 1 ? "" : "s"} · {tpl.fieldCount}{" "}
                      fields · {tpl.fileName}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openUseTemplate(tpl)}>
                    Use template
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDeleteTemplate(tpl)}
                    aria-label={`Delete ${tpl.name}`}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {useTemplateId && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          onPointerDown={(e) => e.target === e.currentTarget && setUseTemplateId(null)}
        >
          <div className="w-full max-w-md animate-fade-in-up rounded-t-2xl bg-card p-4 shadow-xl sm:rounded-2xl">
            <h2 className="text-sm font-semibold">Assign emails to roles</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              This creates a new draft from the template. You can edit fields before sending.
            </p>
            <div className="mt-3 space-y-2">
              {(templates.find((t) => t.id === useTemplateId)?.recipients ?? []).map((role, i) => (
                <div key={`${role.name}-${i}`}>
                  <label className="mb-1 block text-xs font-medium">
                    {role.name}{" "}
                    <span className="font-normal text-muted-foreground">({role.role.toLowerCase()})</span>
                  </label>
                  <Input
                    type="email"
                    value={useEmails[i] ?? ""}
                    onChange={(e) => {
                      const next = [...useEmails];
                      next[i] = e.target.value;
                      setUseEmails(next);
                    }}
                    placeholder="email@example.com"
                    className="h-9 text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setUseTemplateId(null)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={confirmUseTemplate} disabled={isUsingTemplate}>
                {isUsingTemplate ? <Spinner className="size-4" /> : null}
                Create draft
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
