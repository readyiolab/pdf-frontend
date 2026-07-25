import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileCheck,
  History,
  Mail,
  RotateCw,
  ShieldCheck,
  XCircle,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { signingApi, type DocumentStatus } from "@/services/signingApi";
import type { SignRecipientStatus } from "@/lib/signing/types";
import { AuditTrail } from "./AuditTrail";

/** Presentation per recipient status. */
const STATUS: Record<SignRecipientStatus, { label: string; icon: typeof Clock; className: string }> = {
  PENDING: { label: "Waiting their turn", icon: Clock, className: "text-muted-foreground" },
  SENT: { label: "Emailed — not opened", icon: Mail, className: "text-blue-600 dark:text-blue-400" },
  VIEWED: { label: "Opened", icon: Eye, className: "text-amber-600 dark:text-amber-500" },
  COMPLETED: { label: "Signed", icon: CheckCircle2, className: "text-emerald-600 dark:text-emerald-500" },
  DECLINED: { label: "Declined", icon: XCircle, className: "text-destructive" },
};

function fmtIST(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value)) + " IST";
}

interface StatusTrackerProps {
  documentId: string;
}

/**
 * The owner's post-send view: who has signed, who hasn't, and the finished
 * artifacts once everyone is done.
 *
 * Polls while the document is still in flight so the owner sees a signature land
 * without refreshing — but stops once the document reaches a terminal state, so
 * a completed document isn't hammering the API forever.
 */
export function StatusTracker({ documentId }: StatusTrackerProps) {
  const [status, setStatus] = useState<DocumentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"doc" | "cert" | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const data = await signingApi.getStatus(documentId);
        if (!active) return;
        setStatus(data);
        setIsLoading(false);
        // Keep polling only while there's still something to wait for.
        if (data.status === "SENT" || data.status === "FINALIZING") timer = setTimeout(poll, 8000);
      } catch {
        if (active) setIsLoading(false);
      }
    };
    poll();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [documentId]);

  const handleResend = async (recipientId: string, name: string) => {
    setResending(recipientId);
    try {
      await signingApi.resend(documentId, recipientId);
      toast.success(`Reminder sent to ${name}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send the reminder.");
    } finally {
      setResending(null);
    }
  };

  const handleDownload = async (kind: "doc" | "cert") => {
    setDownloading(kind);
    try {
      const { url } =
        kind === "doc"
          ? await signingApi.getDownloadUrl(documentId)
          : await signingApi.getCertificateUrl(documentId);
      // Open in a new tab; the URL is a short-lived signed download.
      window.open(url, "_blank", "noopener");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't get the download link.");
    } finally {
      setDownloading(null);
    }
  };

  const handleVoid = async () => {
    if (
      !window.confirm(
        "Cancel this signing request? Recipients will no longer be able to sign, and this can't be undone."
      )
    ) {
      return;
    }
    setIsVoiding(true);
    try {
      await signingApi.voidDocument(documentId);
      const data = await signingApi.getStatus(documentId);
      setStatus(data);
      toast.success("Signing request cancelled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't cancel the document.");
    } finally {
      setIsVoiding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-4" />
        Loading status…
      </div>
    );
  }
  if (!status) return null;

  const signedVersion = status.versions.find((v) => v.digitallySigned);
  const isDone = status.status === "COMPLETED";
  const isSealing = status.status === "FINALIZING";
  const isDeclined = status.status === "DECLINED";
  const isVoided = status.status === "VOIDED";
  const isExpired = status.status === "EXPIRED";
  const canVoid = status.status === "SENT" || status.status === "FINALIZING";

  return (
    <div className="mx-auto h-full max-w-2xl space-y-5 overflow-y-auto p-4 sm:p-6">
      {/* --- Headline --- */}
      <div
        className={cn(
          "rounded-2xl border p-4",
          isDone
            ? "border-emerald-500/30 bg-emerald-500/5"
            : isDeclined || isVoided
              ? "border-destructive/30 bg-destructive/5"
              : isExpired
                ? "border-amber-500/30 bg-amber-500/5"
                : isSealing
                  ? "border-sky-500/30 bg-sky-500/5"
                  : "border-border bg-card"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              isDone
                ? "bg-emerald-500/10"
                : isDeclined || isVoided
                  ? "bg-destructive/10"
                  : isExpired
                    ? "bg-amber-500/10"
                    : isSealing
                      ? "bg-sky-500/10"
                      : "bg-primary/10"
            )}
          >
            {isDone ? (
              <FileCheck className="size-5 text-emerald-600 dark:text-emerald-500" />
            ) : isDeclined || isVoided ? (
              <XCircle className="size-5 text-destructive" />
            ) : isExpired ? (
              <Clock className="size-5 text-amber-600 dark:text-amber-500" />
            ) : (
              <Clock className={cn("size-5", isSealing ? "animate-pulse text-sky-600" : "text-primary")} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {isDone
                ? "Everyone has signed"
                : isDeclined
                  ? "Someone declined"
                  : isVoided
                    ? "Cancelled"
                    : isExpired
                      ? "Expired"
                      : isSealing
                        ? "Sealing the signed PDF…"
                        : "Waiting for signatures"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isSealing
                ? "This usually takes a few seconds."
                : isVoided
                  ? "This signing request was cancelled."
                  : isExpired
                    ? "The signing deadline has passed."
                    : `${status.progress.signed} of ${status.progress.total} signed${
                        status.flowType === "SEQUENTIAL" ? " · in order" : " · any order"
                      }`}
            </p>
          </div>
        </div>
        <Progress
          value={status.progress.total ? (status.progress.signed / status.progress.total) * 100 : 0}
          className="mt-3 h-1.5"
        />
        {canVoid && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3 text-destructive hover:text-destructive"
            onClick={handleVoid}
            disabled={isVoiding}
          >
            {isVoiding ? <Spinner className="size-3.5" /> : <Ban className="size-3.5" />}
            Cancel request
          </Button>
        )}
      </div>

      {/* --- Completed: downloads + integrity --- */}
      {isDone && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => handleDownload("doc")} disabled={downloading !== null} className="flex-1">
              {downloading === "doc" ? <Spinner className="size-4" /> : <Download />}
              Signed document
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDownload("cert")}
              disabled={downloading !== null}
              className="flex-1"
            >
              {downloading === "cert" ? <Spinner className="size-4" /> : <ShieldCheck />}
              Certificate
            </Button>
          </div>
          {signedVersion && (
            <div className="rounded-lg bg-muted/50 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-500" />
                Digitally signed &amp; tamper-evident
              </p>
              {signedVersion.tsaTimestamp && (
                <p className="mt-1">Independently timestamped: {fmtIST(signedVersion.tsaTimestamp)}</p>
              )}
              {signedVersion.sha256 && (
                <p className="mt-0.5 break-all font-mono">SHA-256: {signedVersion.sha256}</p>
              )}
              {signedVersion.selfSignedCert && (
                <p className="mt-1 italic">
                  Signed with a self-signed certificate — readers may show "valid but untrusted" until a
                  CA-issued certificate is configured.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- Recipients --- */}
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Recipients</p>
        <div className="space-y-2">
          {status.recipients.map((r, i) => {
            const meta = STATUS[r.status];
            const Icon = meta.icon;
            const when =
              r.status === "COMPLETED"
                ? fmtIST(r.completedAt)
                : r.status === "VIEWED"
                  ? fmtIST(r.viewedAt)
                  : null;
            const canRemind =
              status.status === "SENT" &&
              r.status !== "COMPLETED" &&
              r.status !== "DECLINED" &&
              r.status !== "PENDING";

            return (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: r.color }}
                >
                  {status.flowType === "SEQUENTIAL" ? i + 1 : r.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                  {r.status === "DECLINED" && r.declineReason && (
                    <p className="mt-0.5 text-[11px] text-destructive">Reason: {r.declineReason}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span className={cn("flex items-center justify-end gap-1 text-xs font-medium", meta.className)}>
                    <Icon className="size-3.5" />
                    {meta.label}
                  </span>
                  {when && <span className="text-[10px] text-muted-foreground">{when}</span>}
                </div>
                {canRemind && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleResend(r.id, r.name)}
                    disabled={resending === r.id}
                    aria-label={`Send reminder to ${r.name}`}
                    title="Send reminder"
                  >
                    {resending === r.id ? <Spinner className="size-3.5" /> : <RotateCw className="size-3.5" />}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Each person's link is private and was emailed directly to them. Use the reminder button to email
          it again.
        </p>
      </div>

      {/* --- Activity log: who did what, from where, on which device --- */}
      <div>
        <button
          type="button"
          onClick={() => setShowActivity((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          aria-expanded={showActivity}
        >
          <span className="flex items-center gap-1.5">
            <History className="size-3.5" />
            Activity &amp; access log
          </span>
          <ChevronDown className={cn("size-4 transition-transform", showActivity && "rotate-180")} />
        </button>
        {showActivity && (
          <div className="mt-2 rounded-xl border border-border bg-card p-4">
            <AuditTrail documentId={documentId} />
            <p className="mt-1 border-t border-border pt-2 text-[10px] leading-relaxed text-muted-foreground">
              IP address, approximate location, and device are recorded server-side at the moment of each
              action. Location needs a geo-aware proxy (e.g. Cloudflare) — without one, only the IP and device
              are shown.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
