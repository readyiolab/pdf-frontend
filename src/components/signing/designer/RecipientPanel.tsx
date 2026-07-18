import { useState } from "react";
import { ArrowDownUp, Check, Plus, Trash2, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface RecipientPanelProps {
  documentId: string;
  recipients: SignRecipient[];
  flowType: SignFlowType;
  activeRecipientId: string | null;
  readOnly: boolean;
  fieldCountByRecipient: Map<string, number>;
  onRecipientsChange: (recipients: SignRecipient[]) => void;
  onFlowTypeChange: (flow: SignFlowType) => void;
  onActiveChange: (id: string) => void;
  onRecipientRemoved: (id: string) => void;
}

export function RecipientPanel({
  documentId,
  recipients,
  flowType,
  activeRecipientId,
  readOnly,
  fieldCountByRecipient,
  onRecipientsChange,
  onFlowTypeChange,
  onActiveChange,
  onRecipientRemoved,
}: RecipientPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<SignRecipient["role"]>("SIGNER");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setEmail("");
    setPhone("");
    setRole("SIGNER");
    setIsAdding(false);
  };

  const handleAdd = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("A name and email are both required.");
      return;
    }
    // Mirrors the API's E.164 rule so the user is corrected inline rather than
    // by a round-trip. The server re-validates regardless — this is a courtesy,
    // not the boundary.
    if (phone.trim() && !/^\+[1-9]\d{7,14}$/.test(phone.trim())) {
      toast.error("Phone must be in international format, e.g. +919876543210");
      return;
    }
    setIsSubmitting(true);
    try {
      const recipient = await signingApi.addRecipient(documentId, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        role,
      });
      onRecipientsChange([...recipients, recipient]);
      // Make the new recipient active so the next field drop is theirs — the
      // overwhelmingly common next action after adding someone.
      onActiveChange(recipient.id);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add the recipient.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (recipient: SignRecipient) => {
    const fieldCount = fieldCountByRecipient.get(recipient.id) ?? 0;
    if (
      fieldCount > 0 &&
      !window.confirm(
        `${recipient.name} has ${fieldCount} field${fieldCount === 1 ? "" : "s"} placed. ` +
          `Removing them leaves those fields unassigned — they won't be deleted. Continue?`
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove the recipient.");
    }
  };

  const atLimit = recipients.length >= SIGNING_LIMITS.maxRecipientsPerDocument;

  return (
    <div className="border-b border-border">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Users className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <p className="text-xs font-semibold">Recipients</p>
          <span className="rounded-full bg-muted px-1.5 text-[10px] font-medium tabular-nums text-muted-foreground">
            {recipients.length}
          </span>
        </div>
        {!readOnly && !isAdding && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setIsAdding(true)}
            disabled={atLimit}
            aria-label="Add recipient"
          >
            <Plus />
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
        </div>
      )}

      <div className="space-y-0.5 px-2 pb-2">
        {recipients.map((r, i) => {
          const count = fieldCountByRecipient.get(r.id) ?? 0;
          return (
            <div
              key={r.id}
              className={cn(
                "group flex items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors",
                activeRecipientId === r.id ? "bg-primary/10" : "hover:bg-muted"
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
                  className="flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
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
                </span>
                {count > 0 && (
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{count}</span>
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
                  <Trash2 className="text-destructive" />
                </Button>
              )}
            </div>
          );
        })}

        {recipients.length === 0 && !isAdding && (
          <button
            type="button"
            onClick={() => !readOnly && setIsAdding(true)}
            disabled={readOnly}
            className="flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-4 text-center transition-colors hover:border-primary/40 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserPlus className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-[11px] font-medium">Add your first recipient</span>
            <span className="text-[10px] leading-tight text-muted-foreground">
              Fields must be assigned to someone before you can send.
            </span>
          </button>
        )}

        {isAdding && (
          <div className="animate-fade-in space-y-2 rounded-lg border border-border bg-muted/30 p-2">
            <div>
              <Label htmlFor="r-name" className="mb-1 text-[10px]">
                Name
              </Label>
              <Input
                id="r-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && reset()}
                className="h-7 text-xs"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <Label htmlFor="r-email" className="mb-1 text-[10px]">
                Email
              </Label>
              <Input
                id="r-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") reset();
                }}
                className="h-7 text-xs"
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <Label htmlFor="r-phone" className="mb-1 text-[10px]">
                Phone <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="r-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") reset();
                }}
                className="h-7 text-xs"
                placeholder="+919876543210"
              />
              <p className="mt-0.5 text-[9px] leading-tight text-muted-foreground">
                Needed for SMS OTP or WhatsApp delivery.
              </p>
            </div>
            <div>
              <Label className="mb-1 text-[10px]">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as SignRecipient["role"])}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SIGNER">Signer</SelectItem>
                  <SelectItem value="APPROVER">Approver</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                  <SelectItem value="CC">Receives a copy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1.5 pt-0.5">
              <Button size="xs" onClick={handleAdd} disabled={isSubmitting} className="flex-1">
                <Check />
                Add
              </Button>
              <Button size="icon-xs" variant="ghost" onClick={reset} aria-label="Cancel">
                <X />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
