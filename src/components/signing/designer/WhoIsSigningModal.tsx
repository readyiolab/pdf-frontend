import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileSignature,
  Info,
  Plus,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { signingApi } from "@/services/signingApi";
import {
  SIGNING_LIMITS,
  type SignFlowType,
  type SignRecipient,
  type SignRecipientRole,
} from "@/lib/signing/types";

export type WhoSigningMode = "only_you" | "only_others" | "you_and_others";

type DraftPerson = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: SignRecipientRole;
};

interface WhoIsSigningModalProps {
  isOpen: boolean;
  documentId: string;
  defaultSelf?: { name?: string; email?: string };
  /** When adding more people after the first setup, start on others form. */
  initialMode?: WhoSigningMode | null;
  onClose: () => void;
  onComplete: (result: {
    recipients: SignRecipient[];
    flowType: SignFlowType;
    selfSign: boolean;
  }) => void;
}

const MODES: {
  id: WhoSigningMode;
  label: string;
  previewTitle: string;
  previewSteps: string[];
  previewTone: "sky" | "emerald" | "violet";
}[] = [
  {
    id: "only_you",
    label: "Only you",
    previewTitle: "Only you",
    previewSteps: [
      "Sign a document and click “Finish and sign” when you’re done.",
    ],
    previewTone: "sky",
  },
  {
    id: "only_others",
    label: "Only others",
    previewTitle: "Only others",
    previewSteps: [
      "Add all signees details.",
      "Set a signing order if needed.",
      "Assign fields to show signees where to sign.",
      "Send the document out for signature.",
    ],
    previewTone: "emerald",
  },
  {
    id: "you_and_others",
    label: "You and others",
    previewTitle: "You and others",
    previewSteps: [
      "Add all signee details—including yours.",
      "Set a signing order if needed.",
      "Assign fields to show others where to sign.",
      "Sign the document and send it out for signature.",
    ],
    previewTone: "violet",
  },
];

const ROLE_OPTIONS: { value: SignRecipientRole; label: string }[] = [
  { value: "SIGNER", label: "Signee" },
  { value: "APPROVER", label: "Approver" },
  { value: "VIEWER", label: "Viewer" },
  { value: "CC", label: "CC" },
];

function splitName(name?: string): { firstName: string; lastName: string } {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function joinName(firstName: string, lastName: string, email: string): string {
  const full = `${firstName.trim()} ${lastName.trim()}`.trim();
  if (full) return full;
  return email.trim().split("@")[0] || "Signee";
}

function newDraft(partial?: Partial<DraftPerson>): DraftPerson {
  return {
    id: crypto.randomUUID(),
    email: "",
    firstName: "",
    lastName: "",
    role: "SIGNER",
    ...partial,
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function ModeIcon({ mode, className }: { mode: WhoSigningMode; className?: string }) {
  if (mode === "only_you") {
    return <User className={cn("size-5", className)} aria-hidden />;
  }
  if (mode === "only_others") {
    return (
      <span className={cn("relative inline-flex", className)}>
        <Users className="size-5" aria-hidden />
        <CheckCircle2 className="absolute -right-1 -top-1 size-3.5 text-emerald-500" aria-hidden />
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <User className="size-4" aria-hidden />
      <span className="text-xs font-semibold text-muted-foreground">+</span>
      <span className="relative inline-flex">
        <Users className="size-4" aria-hidden />
        <CheckCircle2 className="absolute -right-1 -top-1 size-3 text-emerald-500" aria-hidden />
      </span>
    </span>
  );
}

function PersonRow({
  person,
  emailRequired,
  emailLabel,
  onChange,
  onRemove,
  canRemove,
}: {
  person: DraftPerson;
  emailRequired?: boolean;
  emailLabel: string;
  onChange: (next: DraftPerson) => void;
  onRemove?: () => void;
  canRemove?: boolean;
}) {
  const set =
    (key: keyof DraftPerson) =>
    (e: ChangeEvent<HTMLInputElement>) =>
      onChange({ ...person, [key]: e.target.value });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.3fr_1fr_1fr_7.5rem_auto] sm:items-end">
      <div className="space-y-1.5">
        <Label className="text-xs">
          {emailLabel}
          {emailRequired ? <span className="text-destructive"> *</span> : null}
        </Label>
        <Input
          type="email"
          value={person.email}
          onChange={set("email")}
          placeholder="name@company.com"
          className="h-9"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">First name</Label>
        <Input value={person.firstName} onChange={set("firstName")} className="h-9" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Last name</Label>
        <Input value={person.lastName} onChange={set("lastName")} className="h-9" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Role</Label>
        <Select
          value={person.role}
          onValueChange={(v) => onChange({ ...person, role: v as SignRecipientRole })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {canRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label="Remove signee"
        >
          <Trash2 className="size-4" />
        </Button>
      ) : (
        <span className="hidden sm:block" />
      )}
    </div>
  );
}

export function WhoIsSigningModal({
  isOpen,
  documentId,
  defaultSelf,
  initialMode = null,
  onClose,
  onComplete,
}: WhoIsSigningModalProps) {
  const selfParts = useMemo(() => splitName(defaultSelf?.name), [defaultSelf?.name]);

  const [hoveredMode, setHoveredMode] = useState<WhoSigningMode | null>(null);
  const [selectedMode, setSelectedMode] = useState<WhoSigningMode | null>(null);
  const [setSigningOrder, setSetSigningOrder] = useState(false);
  const [selfDraft, setSelfDraft] = useState<DraftPerson>(() =>
    newDraft({
      email: defaultSelf?.email ?? "",
      firstName: selfParts.firstName,
      lastName: selfParts.lastName,
      role: "SIGNER",
    })
  );
  const [others, setOthers] = useState<DraftPerson[]>([newDraft()]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setHoveredMode(null);
    setSelectedMode(initialMode);
    setSetSigningOrder(false);
    setSelfDraft(
      newDraft({
        email: defaultSelf?.email ?? "",
        firstName: selfParts.firstName,
        lastName: selfParts.lastName,
        role: "SIGNER",
      })
    );
    setOthers([newDraft()]);
    setSubmitting(false);
  }, [isOpen, initialMode, defaultSelf?.email, selfParts.firstName, selfParts.lastName]);

  const previewMode = selectedMode ?? hoveredMode;
  const preview = MODES.find((m) => m.id === previewMode);

  const updateOther = (id: string, next: DraftPerson) => {
    setOthers((rows) => rows.map((r) => (r.id === id ? next : r)));
  };

  const addOther = () => {
    if (others.length >= SIGNING_LIMITS.maxRecipientsPerDocument) {
      toast.error(`You can add up to ${SIGNING_LIMITS.maxRecipientsPerDocument} people.`);
      return;
    }
    setOthers((rows) => [...rows, newDraft()]);
  };

  const removeOther = (id: string) => {
    setOthers((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.id !== id)));
  };

  const handleContinue = async () => {
    if (!selectedMode) return;

    if (selectedMode === "only_you") {
      if (!isValidEmail(selfDraft.email)) {
        toast.error("Enter a valid email for yourself.");
        return;
      }
    }

    if (selectedMode === "only_others" || selectedMode === "you_and_others") {
      if (selectedMode === "you_and_others" && !isValidEmail(selfDraft.email)) {
        toast.error("Enter a valid email for yourself.");
        return;
      }
      const filled = others.filter((o) => o.email.trim());
      if (filled.length === 0) {
        toast.error("Add at least one other signee with an email.");
        return;
      }
      const bad = filled.find((o) => !isValidEmail(o.email));
      if (bad) {
        toast.error(`Invalid email: ${bad.email}`);
        return;
      }
    }

    const flowType: SignFlowType = setSigningOrder ? "SEQUENTIAL" : "PARALLEL";
    const selfSign = selectedMode === "only_you";

    setSubmitting(true);
    try {
      await signingApi.updateDocument(documentId, { flowType });

      const created: SignRecipient[] = [];
      let order = 1;

      if (selectedMode === "only_you" || selectedMode === "you_and_others") {
        const me = await signingApi.addRecipient(documentId, {
          name: joinName(selfDraft.firstName, selfDraft.lastName, selfDraft.email),
          email: selfDraft.email.trim(),
          role: selfDraft.role,
          authMethod: "NONE",
          signingOrder: order++,
        });
        created.push(me);
      }

      if (selectedMode === "only_others" || selectedMode === "you_and_others") {
        for (const row of others.filter((o) => o.email.trim())) {
          const recipient = await signingApi.addRecipient(documentId, {
            name: joinName(row.firstName, row.lastName, row.email),
            email: row.email.trim(),
            role: row.role,
            authMethod: "NONE",
            signingOrder: order++,
          });
          created.push(recipient);
        }
      }

      onComplete({ recipients: created, flowType, selfSign });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save signees.");
    } finally {
      setSubmitting(false);
    }
  };

  const toneClass =
    preview?.previewTone === "emerald"
      ? "border-emerald-200 bg-emerald-50/80"
      : preview?.previewTone === "violet"
        ? "border-violet-200 bg-violet-50/70"
        : "border-sky-200 bg-sky-50/80";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "flex max-h-[min(92vh,880px)] w-[min(96vw,960px)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl"
        )}
      >
        <DialogTitle className="sr-only">Who&apos;s signing?</DialogTitle>
        <DialogDescription className="sr-only">
          Choose whether only you, only others, or you and others will sign this document.
        </DialogDescription>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Left modes */}
          <aside className="shrink-0 border-b border-border bg-muted/20 p-4 md:w-[220px] md:border-b-0 md:border-r md:p-5">
            <p className="mb-3 text-sm font-bold tracking-tight text-foreground">Who&apos;s signing?</p>
            <div className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
              {MODES.map((mode) => {
                const selected = selectedMode === mode.id;
                const hovered = hoveredMode === mode.id && !selectedMode;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onMouseEnter={() => setHoveredMode(mode.id)}
                    onMouseLeave={() => setHoveredMode(null)}
                    onFocus={() => setHoveredMode(mode.id)}
                    onClick={() => setSelectedMode(mode.id)}
                    className={cn(
                      "relative flex min-w-[7.5rem] flex-col items-center gap-2 rounded-xl border bg-background px-3 py-3 text-center transition-all md:min-w-0 md:flex-row md:items-center md:justify-start md:text-left",
                      selected
                        ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500/20"
                        : hovered
                          ? "border-border bg-muted/40"
                          : "border-border hover:border-foreground/20 hover:bg-muted/30"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-10 items-center justify-center rounded-lg",
                        selected ? "bg-blue-100 text-blue-700" : "bg-muted text-foreground"
                      )}
                    >
                      <ModeIcon mode={mode.id} />
                    </span>
                    <span className="text-xs font-semibold text-foreground">{mode.label}</span>
                    {selected && (
                      <span
                        aria-hidden
                        className="absolute -right-1.5 top-1/2 hidden size-2.5 -translate-y-1/2 rounded-full bg-emerald-500 md:block"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right panel */}
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
            {!selectedMode ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
                {preview ? (
                  <div
                    className={cn(
                      "w-full max-w-md rounded-2xl border px-6 py-7 shadow-sm",
                      toneClass
                    )}
                  >
                    <div className="mb-4 flex justify-center text-foreground/80">
                      <FileSignature className="size-10 opacity-70" aria-hidden />
                    </div>
                    <h3 className="text-center text-lg font-bold text-foreground">
                      {preview.previewTitle}
                    </h3>
                    {preview.previewSteps.length === 1 ? (
                      <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
                        {preview.previewSteps[0]}
                      </p>
                    ) : (
                      <ol className="mt-4 space-y-2.5 text-sm leading-relaxed text-muted-foreground">
                        {preview.previewSteps.map((step, i) => (
                          <li key={step} className="flex gap-2.5">
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-background text-[11px] font-bold text-foreground shadow-sm ring-1 ring-border">
                              {i + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    <p className="mt-5 text-center text-xs text-muted-foreground">
                      Click the option to continue
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <ArrowLeft className="mb-3 size-10 rotate-180 opacity-30 md:rotate-0" aria-hidden />
                    <p className="text-sm font-medium">Choose an option</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-border px-5 py-4 pr-12">
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {selectedMode === "only_you" ? "Confirm your details" : "Add signee information"}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {MODES.find((m) => m.id === selectedMode)?.label}
                    </p>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
                  {selectedMode !== "only_you" && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <span>Set signing order</span>
                        <Info className="size-3.5 text-muted-foreground" aria-hidden />
                      </div>
                      <Switch
                        checked={setSigningOrder}
                        onCheckedChange={setSetSigningOrder}
                        aria-label="Set signing order"
                      />
                    </div>
                  )}

                  {(selectedMode === "only_you" || selectedMode === "you_and_others") && (
                    <section className="space-y-3">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        Your details
                        <Info className="size-3.5 text-muted-foreground" aria-hidden />
                      </div>
                      <PersonRow
                        person={selfDraft}
                        emailRequired
                        emailLabel="Your email"
                        onChange={setSelfDraft}
                      />
                    </section>
                  )}

                  {(selectedMode === "only_others" || selectedMode === "you_and_others") && (
                    <section className="space-y-3">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        Other signees
                        <Info className="size-3.5 text-muted-foreground" aria-hidden />
                      </div>
                      <div className="space-y-4">
                        {others.map((row) => (
                          <PersonRow
                            key={row.id}
                            person={row}
                            emailRequired
                            emailLabel="Email"
                            onChange={(next) => updateOther(row.id, next)}
                            canRemove={others.length > 1}
                            onRemove={() => removeOther(row.id)}
                          />
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={addOther}
                      >
                        <Plus className="mr-1 size-3.5" />
                        Add
                      </Button>
                    </section>
                  )}

                  {selectedMode === "only_you" && (
                    <p className="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm leading-relaxed text-sky-900">
                      You&apos;ll place your signature fields on the PDF, then click{" "}
                      <span className="font-semibold">Sign now</span> when you&apos;re ready.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSelectedMode(null)}
                    disabled={submitting}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="min-w-[7.5rem] rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                    onClick={handleContinue}
                    disabled={submitting}
                  >
                    {submitting ? "Saving…" : "Continue"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
