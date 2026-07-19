import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Globe,
  Mail,
  MonitorSmartphone,
  PenLine,
  Send,
  ShieldCheck,
  UserPlus,
  XCircle,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { signingApi } from "@/services/signingApi";
import type { SignAuditEntry } from "@/lib/signing/types";

/** Icon + human label per audit action. Unlisted actions fall back to a dot. */
const ACTION_META: Record<string, { label: string; icon: typeof Clock }> = {
  DOCUMENT_CREATED: { label: "Document uploaded", icon: FileText },
  DOCUMENT_UPDATED: { label: "Document updated", icon: FileText },
  RECIPIENT_ADDED: { label: "Recipient added", icon: UserPlus },
  RECIPIENT_UPDATED: { label: "Recipient updated", icon: UserPlus },
  RECIPIENT_REMOVED: { label: "Recipient removed", icon: UserPlus },
  FIELDS_UPDATED: { label: "Fields updated", icon: PenLine },
  DOCUMENT_SENT: { label: "Sent for signature", icon: Send },
  EMAIL_SENT: { label: "Invitation emailed", icon: Mail },
  EMAIL_BOUNCED: { label: "Email failed to deliver", icon: XCircle },
  REMINDER_SENT: { label: "Reminder sent", icon: Mail },
  DOCUMENT_OPENED: { label: "Opened the document", icon: Eye },
  AUTH_CHALLENGED: { label: "Verification code sent", icon: ShieldCheck },
  AUTH_PASSED: { label: "Identity verified", icon: ShieldCheck },
  AUTH_FAILED: { label: "Verification failed", icon: XCircle },
  RECIPIENT_COMPLETED: { label: "Signed", icon: CheckCircle2 },
  RECIPIENT_DECLINED: { label: "Declined to sign", icon: XCircle },
  DOCUMENT_COMPLETED: { label: "All parties signed", icon: CheckCircle2 },
  DOCUMENT_DOWNLOADED: { label: "Downloaded", icon: Download },
};

/** Full date + time in IST — the format the whole app stamps signing times in. */
function fmtIST(value: string): string {
  return (
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(new Date(value)) + " IST"
  );
}

interface AuditTrailProps {
  documentId: string;
}

/**
 * The document's activity record: every action, and — crucially — WHERE and on
 * WHAT it happened. IP address, approximate location, and browser/OS/device are
 * captured server-side at the moment of each action (see getRequestContext) and
 * surfaced here so the owner can see, for example, that "Alice opened this from
 * 203.0.113.7, Mumbai, on Chrome / Windows" — the same evidence printed on the
 * completion certificate, but viewable live.
 */
export function AuditTrail({ documentId }: AuditTrailProps) {
  const [entries, setEntries] = useState<SignAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    signingApi
      .getAudit(documentId, 1, 200)
      .then((res) => {
        if (!active) return;
        // The API returns newest-first; a timeline reads best oldest-first.
        setEntries([...(res.entries ?? [])].reverse());
      })
      .catch(() => active && setError(true))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [documentId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Spinner className="size-4" />
        Loading activity…
      </div>
    );
  }
  if (error) {
    return <p className="py-4 text-sm text-muted-foreground">Couldn't load the activity log.</p>;
  }
  if (entries.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">No activity recorded yet.</p>;
  }

  return (
    <ol className="space-y-0">
      {entries.map((e, i) => {
        const meta = ACTION_META[e.action] ?? { label: e.action.replace(/_/g, " "), icon: Clock };
        const Icon = meta.icon;
        const actor = e.actorName || e.actorEmail || "System";
        // Where it happened: location (if a geo header was present) + IP.
        const place = [e.location, e.ipAddress].filter(Boolean).join(" · ");
        // What it happened on.
        const machine = [e.browser, e.os, e.device].filter(Boolean).join(" · ");

        return (
          <li key={e.id} className="relative flex gap-3 pb-4">
            {/* Connector line between events. */}
            {i < entries.length - 1 && (
              <span className="absolute left-[13px] top-7 h-full w-px bg-border" aria-hidden="true" />
            )}
            <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted ring-4 ring-card">
              <Icon className="size-3.5 text-muted-foreground" />
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-medium leading-tight">
                {meta.label}
                <span className="font-normal text-muted-foreground"> — {actor}</span>
              </p>
              {e.detail && <p className="mt-0.5 text-xs text-muted-foreground">{e.detail}</p>}

              {/* The "from where / on what" evidence line. */}
              {(place || machine) && (
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  {place && (
                    <span className="flex items-center gap-1">
                      <Globe className="size-3 shrink-0" />
                      {place}
                    </span>
                  )}
                  {machine && (
                    <span className="flex items-center gap-1">
                      <MonitorSmartphone className="size-3 shrink-0" />
                      {machine}
                    </span>
                  )}
                </div>
              )}

              <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground/70">{fmtIST(e.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
