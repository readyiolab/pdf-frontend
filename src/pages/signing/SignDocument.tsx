import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, FileSignature, PartyPopper, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { PdfViewer, type PdfViewerHandle } from "@/components/signing/viewer/PdfViewer";
import { SignFieldOverlay } from "@/components/signing/sign/SignFieldOverlay";
import { SignatureModal } from "@/components/signing/sign/SignatureModal";
import { OtpModal } from "@/components/signing/sign/OtpModal";
import { AccessCodeModal } from "@/components/signing/sign/AccessCodeModal";
import {
  publicSigningApi,
  SigningError,
  type SignView,
  type SignViewField,
} from "@/services/publicSigningApi";

const IMAGE_FIELDS = new Set(["SIGNATURE", "INITIALS", "STAMP", "IMAGE"]);
/** Fields the server fills from the recipient record — the signer never types these. */
const AUTO_FILLED = new Set(["NAME", "EMAIL", "DATE"]);

function CenteredMessage({
  icon: Icon,
  tone = "neutral",
  title,
  children,
}: {
  icon: typeof AlertTriangle;
  tone?: "neutral" | "error" | "success";
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div
        className={cn(
          "flex size-14 items-center justify-center rounded-2xl",
          tone === "error" && "bg-destructive/10",
          tone === "success" && "bg-emerald-500/10",
          tone === "neutral" && "bg-primary/10"
        )}
      >
        <Icon
          className={cn(
            "size-7",
            tone === "error" && "text-destructive",
            tone === "success" && "text-emerald-600 dark:text-emerald-500",
            tone === "neutral" && "text-primary"
          )}
        />
      </div>
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        <div className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

export default function SignDocument() {
  const { token = "" } = useParams();
  const viewerRef = useRef<PdfViewerHandle>(null);

  const [view, setView] = useState<SignView | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ message: string; status: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [documentSealing, setDocumentSealing] = useState(false);
  const [signatureFor, setSignatureFor] = useState<SignViewField | null>(null);
  const [textFor, setTextFor] = useState<SignViewField | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  /**
   * The signing session lives in a ref, not state or localStorage.
   *
   * Not localStorage: it authorises signing THIS document and should die with
   * the tab, not linger for whoever uses the machine next. Not state: nothing
   * renders from it, and keeping it out of the render path means it can't end
   * up in a component tree someone later serialises.
   */
  const sessionRef = useRef<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await publicSigningApi.getView(token, sessionRef.current);
      setView(data);
      setFileUrl(data.fileUrl);

      // Seed defaults so a field with a default value counts as filled rather
      // than blocking the signer on something already decided for them.
      const seeded: Record<string, string> = {};
      for (const f of data.fields) {
        if (f.isMine && !f.value && f.config?.defaultValue) seeded[f.id] = f.config.defaultValue;
      }
      setValues(seeded);
      if (data.recipient.status === "COMPLETED") setIsDone(true);
    } catch (err) {
      const e = err as SigningError;
      setLoadError({ message: e.message, status: e.status });
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const myFields = useMemo(() => view?.fields.filter((f) => f.isMine) ?? [], [view]);

  /**
   * Fields the signer must personally act on.
   *
   * Auto-filled types are excluded: the server overwrites NAME/EMAIL/DATE from
   * the recipient record regardless of what we send, so counting them as work
   * would show "2 of 5" for a document with one actual signature to give.
   */
  const actionable = useMemo(
    () => myFields.filter((f) => !AUTO_FILLED.has(f.type)),
    [myFields]
  );
  const requiredFields = useMemo(() => actionable.filter((f) => f.required), [actionable]);
  const filledRequired = useMemo(
    () => requiredFields.filter((f) => Boolean(values[f.id] ?? f.value)),
    [requiredFields, values]
  );
  const nextRequired = useMemo(
    () => requiredFields.find((f) => !(values[f.id] ?? f.value)) ?? null,
    [requiredFields, values]
  );
  const canFinish = requiredFields.length === filledRequired.length;
  const isApprover = view?.recipient.role === "APPROVER";
  const finishLabel = isApprover && actionable.length === 0 ? "Approve" : isApprover ? "Approve" : "Finish";

  const openField = useCallback((field: SignViewField) => {
    if (IMAGE_FIELDS.has(field.type)) {
      setSignatureFor(field);
    } else if (field.type === "CHECKBOX") {
      setValues((v) => ({ ...v, [field.id]: v[field.id] === "true" ? "false" : "true" }));
    } else if (field.type === "RADIO") {
      const groupKey = field.config?.group || field.label || field.id;
      setValues((v) => {
        const next = { ...v };
        const turningOn = v[field.id] !== "true";
        for (const f of myFields) {
          if (f.type !== "RADIO") continue;
          const g = f.config?.group || f.label || f.id;
          if (g === groupKey) next[f.id] = "false";
        }
        if (turningOn) next[field.id] = "true";
        return next;
      });
    } else if (!AUTO_FILLED.has(field.type)) {
      setTextFor(field);
      setTextDraft(values[field.id] ?? field.value ?? field.config?.defaultValue ?? "");
    }
  }, [values, myFields]);

  const goToNext = () => {
    if (!nextRequired) return;
    setFocusedFieldId(nextRequired.id);
    viewerRef.current?.scrollToPage(nextRequired.page);
    // Long enough for the smooth scroll to land before the field is opened —
    // otherwise the modal covers a page that's still moving underneath it.
    setTimeout(() => openField(nextRequired), 450);
  };

  const handleSubmit = async () => {
    if (!canFinish) {
      toast.error("Please complete all required fields first.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await publicSigningApi.complete(token, values, sessionRef.current);
      setIsDone(true);
      setDocumentSealing(Boolean(result.documentFinalizing || result.documentCompleted));
      toast.success(
        result.documentCompleted
          ? "You're done! We're sealing the final document."
          : "You're done — thank you for signing."
      );
    } catch (err) {
      toast.error(err instanceof SigningError ? err.message : "Couldn't submit your signature.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setIsSubmitting(true);
    try {
      await publicSigningApi.decline(token, declineReason.trim() || undefined);
      setView((v) => (v ? { ...v, recipient: { ...v.recipient, status: "DECLINED" } } : v));
      setDeclining(false);
    } catch (err) {
      toast.error(err instanceof SigningError ? err.message : "Couldn't record your response.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderOverlay = useCallback(
    (pageNumber: number, size: { width: number; height: number }, scale: number) =>
      view ? (
        <SignFieldOverlay
          pageNumber={pageNumber}
          fields={view.fields}
          participants={view.participants}
          values={values}
          focusedFieldId={focusedFieldId}
          pageWidth={size.width * scale}
          pageHeight={size.height * scale}
          readOnly={isDone || view.recipient.status === "DECLINED"}
          onFieldClick={openField}
        />
      ) : null,
    [view, values, focusedFieldId, isDone, openField]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-4" />
        Opening document…
      </div>
    );
  }

  if (loadError) {
    // 410 means the link genuinely lapsed; anything else is deliberately vague,
    // matching the server, which won't confirm whether a token exists.
    return (
      <CenteredMessage
        icon={AlertTriangle}
        tone="error"
        title={loadError.status === 410 ? "This link has expired" : "This link isn't valid"}
      >
        {loadError.message}
        <p className="mt-2">Please ask the sender for a new signing link.</p>
      </CenteredMessage>
    );
  }

  if (!view) return null;

  if (view.requiresOtp && !view.isVerified && !sessionRef.current) {
    return (
      <OtpModal
        token={token}
        onVerified={(sessionToken, url) => {
          sessionRef.current = sessionToken;
          setFileUrl(url);
          setView((v) => (v ? { ...v, isVerified: true } : v));
        }}
      />
    );
  }

  if (view.requiresAccessCode && !view.isVerified && !sessionRef.current) {
    return (
      <AccessCodeModal
        token={token}
        onVerified={(sessionToken, url) => {
          sessionRef.current = sessionToken;
          setFileUrl(url);
          setView((v) => (v ? { ...v, isVerified: true } : v));
        }}
      />
    );
  }

  if (view.recipient.status === "DECLINED") {
    return (
      <CenteredMessage icon={X} tone="error" title="You declined this document">
        The sender has been notified. No signature was recorded.
      </CenteredMessage>
    );
  }

  if (isDone) {
    return (
      <CenteredMessage icon={PartyPopper} tone="success" title="You're done — thank you">
        <p>
          Your signature on <strong className="text-foreground">{view.document.title}</strong> has been saved.
        </p>
        <p className="mt-2">
          {documentSealing
            ? "We're sealing the final PDF — this usually takes a few seconds. You'll get a copy by email when it's ready."
            : view.participants.filter(
                  (p) => p.status !== "COMPLETED" && (p.role === "SIGNER" || p.role === "APPROVER")
                ).length > 0
              ? "We're waiting on the other people to sign. You'll get a copy by email once everyone is done."
              : "Everyone has signed. A copy will be emailed to you shortly."}
        </p>
      </CenteredMessage>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-muted/40">
      {/* --- Header --- */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-3 py-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <FileSignature className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">{view.document.title}</h1>
          <p className="truncate text-[11px] text-muted-foreground">
            Signing as {view.recipient.name} · {view.recipient.email}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeclining(true)}
          className="hidden text-muted-foreground sm:inline-flex"
        >
          Decline
        </Button>
      </header>

      {view.document.message && (
        <div className="shrink-0 border-b border-border bg-card px-3 py-2">
          <p className="text-xs italic leading-relaxed text-muted-foreground">"{view.document.message}"</p>
        </div>
      )}

      {/* --- Progress --- */}
      <div className="shrink-0 border-b border-border bg-card px-3 py-2">
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span className="font-medium">
            {filledRequired.length} of {requiredFields.length} step
            {requiredFields.length === 1 ? "" : "s"} done
          </span>
          {canFinish && (
            <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-500">
              <CheckCircle2 className="size-3" />
              Ready to finish
            </span>
          )}
        </div>
        <Progress value={requiredFields.length ? (filledRequired.length / requiredFields.length) * 100 : 100} className="h-1" />
      </div>

      {/* --- Document --- */}
      <div className="min-h-0 flex-1">
        <PdfViewer ref={viewerRef} source={fileUrl} renderPageOverlay={renderOverlay} className="h-full" />
      </div>

      {/* --- Action bar --- */}
      <div className="shrink-0 border-t border-border bg-card p-2.5">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDeclining(true)} className="sm:hidden">
            Decline
          </Button>
          {nextRequired ? (
            <Button onClick={goToNext} className="flex-1">
              Go to next yellow box
              <ArrowRight />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
              {isSubmitting ? <Spinner className="size-4" /> : <Check />}
              {finishLabel}
            </Button>
          )}
        </div>
      </div>

      {/* --- Signature capture --- */}
      <SignatureModal
        open={Boolean(signatureFor)}
        variant={(signatureFor?.type as "SIGNATURE" | "INITIALS") ?? "SIGNATURE"}
        signerName={view.recipient.name}
        onClose={() => setSignatureFor(null)}
        onApply={(dataUrl) => {
          if (signatureFor) {
            setValues((v) => ({ ...v, [signatureFor.id]: dataUrl }));
            setFocusedFieldId(null);
          }
        }}
      />

      {/* --- Text entry --- */}
      {textFor && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          onPointerDown={(e) => e.target === e.currentTarget && setTextFor(null)}
        >
          <div className="w-full max-w-sm animate-fade-in-up rounded-t-2xl bg-card p-4 shadow-xl sm:rounded-2xl">
            <h2 className="text-sm font-semibold">{textFor.label || textFor.type}</h2>
            {textFor.config?.options?.length ? (
              <div className="mt-3 space-y-1.5">
                {textFor.config.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setValues((v) => ({ ...v, [textFor.id]: option }));
                      setTextFor(null);
                      setFocusedFieldId(null);
                    }}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      textDraft === option ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <Input
                autoFocus
                value={textDraft}
                type={textFor.type === "NUMBER" ? "number" : "text"}
                placeholder={textFor.config?.placeholder}
                maxLength={textFor.config?.validation?.maxLength}
                onChange={(e) => setTextDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setValues((v) => ({ ...v, [textFor.id]: textDraft }));
                    setTextFor(null);
                    setFocusedFieldId(null);
                  }
                  if (e.key === "Escape") setTextFor(null);
                }}
                className="mt-3"
              />
            )}
            {!textFor.config?.options?.length && (
              <div className="mt-3 flex gap-2">
                <Button variant="outline" onClick={() => setTextFor(null)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setValues((v) => ({ ...v, [textFor.id]: textDraft }));
                    setTextFor(null);
                    setFocusedFieldId(null);
                  }}
                  className="flex-1"
                >
                  Apply
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Decline --- */}
      {declining && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onPointerDown={(e) => e.target === e.currentTarget && setDeclining(false)}
        >
          <div className="w-full max-w-sm animate-fade-in-up rounded-2xl bg-card p-4 shadow-xl">
            <h2 className="text-base font-semibold">Decline to sign?</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              This ends the signing process for everyone, and the sender will be notified. It can't be undone.
            </p>
            <Input
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Reason (optional)"
              maxLength={1000}
              className="mt-3"
            />
            <div className="mt-3 flex gap-2">
              <Button variant="outline" onClick={() => setDeclining(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDecline} disabled={isSubmitting} className="flex-1">
                Decline
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
