import { useState } from "react";
import { ArrowDown, Send, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { signingApi } from "@/services/signingApi";
import type { SignFlowType, SignRecipient } from "@/lib/signing/types";

interface SendDialogProps {
  documentId: string;
  recipients: SignRecipient[];
  flowType: SignFlowType;
  fieldCountByRecipient: Map<string, number>;
  onClose: () => void;
  onFlowTypeChange: (flow: SignFlowType) => void;
  /** Called after a successful send so the editor can switch to the tracker. */
  onSent: () => void;
}

/**
 * The review-and-send step.
 *
 * Deliberately explains, in plain language, exactly what pressing Send does —
 * who gets a link and in what order — because that is the single thing new
 * users are unsure about. The flow choice is framed as a question ("one at a
 * time" vs "everyone at once") rather than jargon ("sequential/parallel").
 */
export function SendDialog({
  documentId,
  recipients,
  flowType,
  fieldCountByRecipient,
  onClose,
  onFlowTypeChange,
  onSent,
}: SendDialogProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const signers = recipients.filter((r) => r.role === "SIGNER" || r.role === "APPROVER");
  const ordered = [...recipients].sort((a, b) => a.signingOrder - b.signingOrder);

  const handleSend = async () => {
    setIsSending(true);
    try {
      if (message.trim()) {
        await signingApi.updateDocument(documentId, { message: message.trim() });
      }
      const result = await signingApi.send(documentId);
      const failed = result.notified.filter((n) => !n.delivered);
      if (failed.length) {
        toast.warning(`Sent, but ${failed.length} email(s) could not be delivered. You can resend from the tracker.`);
      } else {
        toast.success(
          flowType === "SEQUENTIAL"
            ? "Sent! The first signer has been emailed their link."
            : `Sent! All ${signers.length} recipients have been emailed their links.`
        );
      }
      onSent();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send the document.");
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Send for signature"
      onPointerDown={(e) => e.target === e.currentTarget && !isSending && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold">Send for signature</h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose} disabled={isSending} aria-label="Close">
            <X />
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <p className="text-sm text-muted-foreground">
            Each recipient gets their own private signing link by email — no account needed. Choose how
            they sign:
          </p>

          {/* --- How they sign (plain language) --- */}
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => onFlowTypeChange("SEQUENTIAL")}
              aria-pressed={flowType === "SEQUENTIAL"}
              className={cn(
                "rounded-xl border-2 p-3 text-left transition-colors",
                flowType === "SEQUENTIAL" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ArrowDown className="size-4 text-primary" />
                One at a time, in order
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                The next person is emailed only after the person before them signs.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onFlowTypeChange("PARALLEL")}
              aria-pressed={flowType === "PARALLEL"}
              className={cn(
                "rounded-xl border-2 p-3 text-left transition-colors",
                flowType === "PARALLEL" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Users className="size-4 text-primary" />
                Everyone at once
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                All recipients are emailed now and can sign in any order.
              </p>
            </button>
          </div>

          {/* --- Order preview --- */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
              {flowType === "SEQUENTIAL" ? "Signing order" : "Recipients"}
            </p>
            <div className="space-y-1.5">
              {ordered.map((r, i) => (
                <div key={r.id} className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-2.5 py-2">
                  <span
                    className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: r.color }}
                  >
                    {flowType === "SEQUENTIAL" ? i + 1 : r.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{r.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{r.email}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {r.role === "SIGNER" || r.role === "APPROVER"
                      ? `${fieldCountByRecipient.get(r.id) ?? 0} field${(fieldCountByRecipient.get(r.id) ?? 0) === 1 ? "" : "s"}`
                      : r.role === "CC"
                        ? "gets a copy"
                        : "view only"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* --- Message --- */}
          <div>
            <label htmlFor="send-message" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Message to recipients <span className="font-normal">(optional)</span>
            </label>
            <Textarea
              id="send-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              placeholder="e.g. Please review and sign by Friday. Thanks!"
              className="min-h-16 text-sm"
            />
          </div>
        </div>

        <div className="border-t border-border p-3">
          <Button onClick={handleSend} disabled={isSending} className="w-full" size="lg">
            {isSending ? <Spinner className="size-4" /> : <Send />}
            {isSending
              ? "Sending…"
              : flowType === "SEQUENTIAL"
                ? "Send to first signer"
                : `Send to ${signers.length} recipient${signers.length === 1 ? "" : "s"}`}
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Once sent, fields can't be changed. You'll be able to track progress here.
          </p>
        </div>
      </div>
    </div>
  );
}
