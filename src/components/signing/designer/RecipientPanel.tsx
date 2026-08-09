import { useState } from "react";
import { ArrowDownUp, Plus, Trash2, UserPlus, Users, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { signingApi } from "@/services/signingApi";
import { SIGNING_LIMITS, type SignFlowType, type SignRecipient } from "@/lib/signing/types";
import { WhoIsSigningModal, type WhoSigningMode } from "./WhoIsSigningModal";

interface RecipientPanelProps {
  documentId: string;
  recipients: SignRecipient[];
  flowType: SignFlowType;
  activeRecipientId: string | null;
  readOnly: boolean;
  fieldCountByRecipient: Map<string, number>;
  defaultSelf?: { name?: string; email?: string };
  onRecipientsChange: (recipients: SignRecipient[]) => void;
  onFlowTypeChange: (flow: SignFlowType) => void;
  onActiveChange: (id: string) => void;
  onRecipientRemoved: (id: string) => void;
  onSelfSignModeChange?: (enabled: boolean) => void;
  className?: string;
}

export function RecipientPanel({
  documentId,
  recipients,
  flowType,
  activeRecipientId,
  readOnly,
  fieldCountByRecipient,
  defaultSelf,
  onRecipientsChange,
  onFlowTypeChange,
  onActiveChange,
  onRecipientRemoved,
  onSelfSignModeChange,
  className,
}: RecipientPanelProps) {
  const [whoOpen, setWhoOpen] = useState(false);
  const [whoInitialMode, setWhoInitialMode] = useState<WhoSigningMode | null>(null);

  const openWhoModal = (mode: WhoSigningMode | null = null) => {
    if (readOnly) return;
    setWhoInitialMode(mode);
    setWhoOpen(true);
  };

  const handleRemove = async (recipient: SignRecipient) => {
    const fieldCount = fieldCountByRecipient.get(recipient.id) ?? 0;
    if (
      fieldCount > 0 &&
      !window.confirm(
        `${recipient.name} has ${fieldCount} field${fieldCount === 1 ? "" : "s"} placed. ` +
          `Removing them leaves those fields unassigned. Continue?`
      )
    ) {
      return;
    }

    try {
      await signingApi.removeRecipient(documentId, recipient.id);
      const remaining = recipients.filter((r) => r.id !== recipient.id);
      onRecipientsChange(remaining);
      onRecipientRemoved(recipient.id);
      if (activeRecipientId === recipient.id && remaining.length) {
        onActiveChange(remaining[0].id);
      }
      if (remaining.length === 0) {
        onSelfSignModeChange?.(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove recipient.");
    }
  };

  const atLimit = recipients.length >= SIGNING_LIMITS.maxRecipientsPerDocument;

  return (
    <div className={cn("border-b border-border", className)}>
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <Users className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <p className="text-xs font-semibold">Who signs</p>
          <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
            {recipients.length}
          </span>
        </div>
        {!readOnly && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() =>
              openWhoModal(recipients.length === 0 ? null : "only_others")
            }
            disabled={atLimit}
            aria-label="Add recipient"
          >
            <Plus className="size-3.5" />
          </Button>
        )}
      </div>

      {recipients.length > 1 && !readOnly && (
        <div className="px-3 pb-2">
          <Select value={flowType} onValueChange={(v) => onFlowTypeChange(v as SignFlowType)}>
            <SelectTrigger className="h-7 text-[11px]">
              <ArrowDownUp className="size-3 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SEQUENTIAL">Sign in order</SelectItem>
              <SelectItem value="PARALLEL">Sign in any order</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
            {flowType === "SEQUENTIAL"
              ? "Each person is emailed only after the one before them signs — the numbers show the order."
              : "Everyone is emailed at once and can sign whenever they like."}
          </p>
        </div>
      )}

      <div className="space-y-1 px-2 pb-2">
        {recipients.map((r, i) => {
          const count = fieldCountByRecipient.get(r.id) ?? 0;
          return (
            <div
              key={r.id}
              className={cn(
                "group flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 transition-colors",
                activeRecipientId === r.id ? "border-primary/20 bg-primary/10" : "hover:bg-muted/70"
              )}
            >
              <button
                type="button"
                onClick={() => onActiveChange(r.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none"
                aria-pressed={activeRecipientId === r.id}
                aria-label={`Place fields for ${r.name}`}
              >
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-xs"
                  style={{ backgroundColor: r.color }}
                  aria-hidden="true"
                >
                  {flowType === "SEQUENTIAL" ? i + 1 : r.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium leading-tight">{r.name}</span>
                  <span className="block truncate text-[10px] leading-tight text-muted-foreground">
                    {r.email}
                  </span>
                  {r.phone && (
                    <span className="mt-0.5 flex items-center gap-1 text-[9px] leading-tight text-muted-foreground/80">
                      <Phone className="size-2.5 shrink-0" />
                      {r.phone}
                    </span>
                  )}
                </span>
                {count > 0 && (
                  <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-primary">
                    {count} field{count === 1 ? "" : "s"}
                  </span>
                )}
              </button>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleRemove(r)}
                  className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={`Remove ${r.name}`}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              )}
            </div>
          );
        })}

        {recipients.length === 0 && (
          <button
            type="button"
            onClick={() => openWhoModal(null)}
            disabled={readOnly}
            className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-3 py-6 text-center transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <UserPlus className="size-4 text-primary" aria-hidden="true" />
            </span>
            <span className="text-xs font-semibold text-foreground">Who&apos;s signing?</span>
            <span className="max-w-[14rem] text-[11px] leading-relaxed text-muted-foreground">
              Choose only you, only others, or you and others — then add details and continue.
            </span>
          </button>
        )}
      </div>

      <WhoIsSigningModal
        isOpen={whoOpen}
        documentId={documentId}
        defaultSelf={defaultSelf}
        initialMode={whoInitialMode}
        onClose={() => setWhoOpen(false)}
        onComplete={({ recipients: created, flowType: nextFlow, selfSign }) => {
          const merged =
            recipients.length === 0 ? created : [...recipients, ...created];
          onRecipientsChange(merged);
          onFlowTypeChange(nextFlow);
          onSelfSignModeChange?.(selfSign);
          if (created[0]) onActiveChange(created[0].id);
          toast.success(
            created.length === 1
              ? "Signee added — place fields on the PDF."
              : `${created.length} signees added — place fields on the PDF.`
          );
        }}
      />
    </div>
  );
}
