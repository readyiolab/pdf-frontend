import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  FileSignature,
  FileText,
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
import { signingApi, type SigningStats } from "@/services/signingApi";
import { SIGNING_LIMITS, type SignDocumentStatus, type SignDocumentSummary } from "@/lib/signing/types";

const STATUS_TABS: { value: SignDocumentStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Drafts" },
  { value: "SENT", label: "Awaiting" },
  { value: "COMPLETED", label: "Completed" },
  { value: "DECLINED", label: "Declined" },
  { value: "EXPIRED", label: "Expired" },
];

const STATUS_STYLE: Record<SignDocumentStatus, { className: string; icon: typeof Clock }> = {
  DRAFT: { className: "bg-muted text-muted-foreground", icon: FileText },
  SENT: { className: "bg-blue-500/10 text-blue-600 dark:text-blue-400", icon: Send },
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<SignDocumentSummary[]>([]);
  const [stats, setStats] = useState<SigningStats | null>(null);
  const [status, setStatus] = useState<SignDocumentStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const load = useCallback(async () => {
    try {
      const [list, s] = await Promise.all([
        signingApi.listDocuments({ status: status === "ALL" ? undefined : status, search: search || undefined }),
        signingApi.getStats(),
      ]);
      setDocuments(list.documents ?? []);
      setStats(s);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load your documents.");
    } finally {
      setIsLoading(false);
    }
  }, [status, search]);

  // Debounced so typing in the search box doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const handleUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files can be sent for signature.");
      return;
    }
    if (file.size > SIGNING_LIMITS.maxFileSize) {
      toast.error(`That file is larger than the ${SIGNING_LIMITS.maxFileSize / (1024 * 1024)}MB limit.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Parse locally first: a corrupt or password-protected PDF should fail
      // here, in a second, rather than after a 50MB upload the server rejects.
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
            if (file) handleUpload(file);
            // Reset so re-picking the SAME file still fires a change event.
            e.target.value = "";
          }}
        />
        <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
          {isUploading ? <Spinner className="size-4" /> : <Upload />}
          {isUploading ? `Uploading ${uploadProgress}%` : "New document"}
        </Button>
      </div>

      {/* --- Stats --- */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Drafts" value={stats.byStatus.DRAFT} />
          <StatCard label="Awaiting signature" value={stats.byStatus.SENT} />
          <StatCard label="Completed" value={stats.byStatus.COMPLETED} />
          <StatCard
            label="Completion rate"
            value={`${stats.completionRate}%`}
            hint="of documents sent"
          />
        </div>
      )}

      {/* --- Filters --- */}
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

      {/* --- List --- */}
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
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
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
                  {doc.status}
                </Badge>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation(); // don't navigate into the document
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
    </div>
  );
}
