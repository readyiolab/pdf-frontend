import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CloudOff,
  FileStack,
  LayoutGrid,
  Loader2,
  PenLine,
  Redo2,
  Send,
  Settings2,
  Undo2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { signingApi } from "@/services/signingApi";
import { useAuth } from "@/contexts/AuthContext";
import type { SignDocument, SignDocumentStatus, SignFieldType, SignFlowType, SignRecipient } from "@/lib/signing/types";
import { PdfViewer, type PdfViewerHandle } from "@/components/signing/viewer/PdfViewer";
import { FieldPalette } from "@/components/signing/designer/FieldPalette";
import { PageFieldOverlay } from "@/components/signing/designer/PageFieldOverlay";
import { PropertiesPanel } from "@/components/signing/designer/PropertiesPanel";
import { RecipientPanel } from "@/components/signing/designer/RecipientPanel";
import { useFieldDesigner } from "@/components/signing/designer/useFieldDesigner";
import { SendDialog } from "@/components/signing/send/SendDialog";
import { StatusTracker } from "@/components/signing/send/StatusTracker";

const STATUS_LABEL: Record<SignDocumentStatus, string> = {
  DRAFT: "Draft",
  SENT: "Waiting for signatures",
  FINALIZING: "Sealing signed PDF",
  COMPLETED: "Completed",
  DECLINED: "Declined",
  EXPIRED: "Expired",
  VOIDED: "Cancelled",
};

const WIZARD_STEPS = [
  { n: 1, label: "Who signs" },
  { n: 2, label: "Place fields" },
  { n: 3, label: "Send" },
] as const;

function SaveIndicator({ state }: { state: ReturnType<typeof useFieldDesigner>["saveState"] }) {
  const map = {
    idle: null,
    dirty: { icon: Loader2, text: "Unsaved changes", className: "text-muted-foreground", spin: false },
    saving: { icon: Loader2, text: "Saving…", className: "text-muted-foreground", spin: true },
    saved: { icon: Check, text: "Saved", className: "text-emerald-600 dark:text-emerald-500", spin: false },
    error: { icon: CloudOff, text: "Not saved", className: "text-destructive", spin: false },
  } as const;

  const entry = map[state];
  if (!entry) return null;
  const Icon = entry.icon;

  return (
    <span className={cn("flex items-center gap-1.5 text-xs font-medium", entry.className)} role="status" aria-live="polite">
      <Icon className={cn("size-3", entry.spin && "animate-spin")} aria-hidden="true" />
      {entry.text}
    </span>
  );
}

function WizardSteps({
  activeStep,
  className,
}: {
  activeStep: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <nav
      aria-label="Signing setup steps"
      className={cn("flex items-center gap-1 sm:gap-2", className)}
    >
      {WIZARD_STEPS.map((step, i) => {
        const done = step.n < activeStep;
        const current = step.n === activeStep;
        return (
          <div key={step.n} className="flex items-center gap-1 sm:gap-2">
            {i > 0 && (
              <span
                className={cn(
                  "hidden h-px w-4 sm:block sm:w-6",
                  done || current ? "bg-primary/40" : "bg-border"
                )}
                aria-hidden="true"
              />
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium sm:text-xs",
                current && "bg-primary/10 text-primary",
                done && "text-muted-foreground",
                !done && !current && "text-muted-foreground/60"
              )}
              aria-current={current ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full text-[10px] font-bold tabular-nums",
                  current && "bg-primary text-primary-foreground",
                  done && "bg-muted text-muted-foreground",
                  !done && !current && "bg-muted/60 text-muted-foreground/60"
                )}
              >
                {done ? <Check className="size-2.5" aria-hidden="true" /> : step.n}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </span>
          </div>
        );
      })}
    </nav>
  );
}

export default function DocumentEditor() {
  const { id = "" } = useParams();
  const [searchParams] = useSearchParams();
  const isSelfSign = searchParams.get("self") === "1";
  const navigate = useNavigate();
  const { user } = useAuth();
  const viewerRef = useRef<PdfViewerHandle>(null);

  const [document, setDocument] = useState<SignDocument | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<SignRecipient[]>([]);
  const [activeRecipientId, setActiveRecipientId] = useState<string | null>(null);
  const [flowType, setFlowType] = useState<SignFlowType>("SEQUENTIAL");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showSend, setShowSend] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSelfSending, setIsSelfSending] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Once sent, placement is frozen — see assertDraft on the API side. The UI
  // mirrors that rule rather than letting the user edit into a 409.
  const readOnly = document?.status !== "DRAFT";
  const isDraft = document?.status === "DRAFT";

  const initialFields = useMemo(() => document?.fields ?? [], [document]);
  const designer = useFieldDesigner(id, initialFields, !readOnly);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const doc = await signingApi.getDocument(id);
        if (cancelled) return;

        setDocument(doc);
        setRecipients(doc.recipients ?? []);
        setFlowType(doc.flowType);
        setActiveRecipientId(doc.recipients?.[0]?.id ?? null);

        const { url } = await signingApi.getFileUrl(id);
        if (cancelled) return;
        setFileUrl(url);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Couldn't load this document.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleFlowTypeChange = async (flow: SignFlowType) => {
    const previous = flowType;
    setFlowType(flow); // optimistic — a select that lags feels broken
    try {
      await signingApi.updateDocument(id, { flowType: flow });
    } catch (err) {
      setFlowType(previous);
      toast.error(err instanceof Error ? err.message : "Couldn't change the signing order.");
    }
  };

  const handleQuickAdd = useCallback(
    (type: SignFieldType) => {
      // Click-to-place drops in the middle of the page the user is looking at.
      designer.addField(type, currentPage, 0.5, 0.5, activeRecipientId);
      setFieldsOpen(false);
    },
    [designer, currentPage, activeRecipientId]
  );

  const handleSelect = useCallback(
    (fieldId: string, additive: boolean) => {
      designer.setSelectedIds((current) =>
        additive
          ? current.includes(fieldId)
            ? current.filter((i) => i !== fieldId)
            : [...current, fieldId]
          : current.length === 1 && current[0] === fieldId
            ? current
            : [fieldId]
      );
    },
    [designer]
  );

  // Designer keyboard shortcuts. The viewer registers its own set; these are
  // scoped to editing and skipped while typing in a panel input.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (readOnly) return;

      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        designer.undo();
      } else if ((mod && e.key.toLowerCase() === "y") || (mod && e.shiftKey && e.key.toLowerCase() === "z")) {
        e.preventDefault();
        designer.redo();
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        designer.duplicateSelection();
      } else if (mod && e.key.toLowerCase() === "s") {
        // Autosave already handles this, but muscle memory says Ctrl+S — and
        // letting the browser open a Save-Page dialog here would be jarring.
        e.preventDefault();
        designer.save();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (designer.selectedIds.length) {
          e.preventDefault();
          designer.deleteSelection();
        }
      } else if (e.key === "Escape") {
        designer.setSelectedIds([]);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [designer, readOnly]);

  const fieldCountByRecipient = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of designer.fields) {
      if (f.recipientId) map.set(f.recipientId, (map.get(f.recipientId) ?? 0) + 1);
    }
    return map;
  }, [designer.fields]);

  const unassignedCount = designer.fields.filter((f) => !f.recipientId).length;

  /**
   * Why the document can't be sent yet, in plain language — or null when it can.
   * Mirrors the backend's /send preconditions so the user is told up front
   * rather than hitting a 400 after clicking. The order matters: report the
   * first thing they need to fix, not all of them at once.
   */
  const sendBlockedReason = useMemo(() => {
    const signers = recipients.filter((r) => r.role === "SIGNER" || r.role === "APPROVER");
    // SIGNER needs fields; APPROVER may approve with none.
    const withoutFields = signers.filter(
      (r) => r.role === "SIGNER" && (fieldCountByRecipient.get(r.id) ?? 0) === 0
    );
    const sms = recipients.filter((r) => r.authMethod === "SMS_OTP");

    if (recipients.length === 0) return "Add at least one person who needs to sign.";
    if (signers.length === 0) return "Add at least one signer or approver.";
    if (withoutFields.length > 0)
      return `Place at least one field for ${withoutFields.map((r) => r.name).join(", ")}.`;
    if (unassignedCount > 0)
      return `${unassignedCount} field${unassignedCount === 1 ? " is" : "s are"} unassigned — assign or delete ${unassignedCount === 1 ? "it" : "them"}.`;
    if (sms.length > 0)
      return `SMS verification isn't available yet — switch ${sms.map((r) => r.name).join(", ")} to email code or access code.`;
    if (isSelfSign) {
      const actionable = signers.filter((r) => r.role === "SIGNER" || r.role === "APPROVER");
      if (actionable.length !== 1 || !user?.email || actionable[0].email.toLowerCase() !== user.email.toLowerCase()) {
        return "Self-sign requires you as the only signer (with your account email).";
      }
    }
    return null;
  }, [recipients, fieldCountByRecipient, unassignedCount, isSelfSign, user?.email]);

  // Step 1 until people exist; step 2 while placing; step 3 when ready to send.
  const activeStep: 1 | 2 | 3 = useMemo(() => {
    if (!isDraft) return 3;
    if (recipients.length === 0) return 1;
    if (sendBlockedReason) return 2;
    return 3;
  }, [isDraft, recipients.length, sendBlockedReason]);

  const openSend = useCallback(async () => {
    // Flush any pending field edits so the server sends the current design, not
    // the last autosaved state.
    if (designer.saveState === "dirty" || designer.saveState === "saving") {
      await designer.save();
    }
    setShowSend(true);
  }, [designer]);

  const handleSelfSign = useCallback(async () => {
    if (designer.saveState === "dirty" || designer.saveState === "saving") {
      await designer.save();
    }
    setIsSelfSending(true);
    try {
      const result = await signingApi.sendSelf(id);
      toast.success("Opening your signing view…");
      navigate(`/s/${result.token}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start self-sign.");
    } finally {
      setIsSelfSending(false);
    }
  }, [designer, id, navigate]);

  const handleSaveTemplate = useCallback(async () => {
    if (designer.saveState === "dirty" || designer.saveState === "saving") {
      await designer.save();
    }
    setIsSavingTemplate(true);
    try {
      const name = window.prompt("Template name", document?.title || "Untitled template");
      if (name === null) return;
      await signingApi.createTemplate({ documentId: id, name: name.trim() || undefined });
      toast.success("Template saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the template.");
    } finally {
      setIsSavingTemplate(false);
    }
  }, [designer, document?.title, id]);

  const renderPageOverlay = useCallback(
    (pageNumber: number, size: { width: number; height: number }, scale: number) => (
      <PageFieldOverlay
        pageNumber={pageNumber}
        fields={designer.fieldsByPage.get(pageNumber) ?? []}
        recipients={recipients}
        selectedIds={designer.selectedIds}
        pageWidth={size.width * scale}
        pageHeight={size.height * scale}
        readOnly={readOnly}
        activeRecipientId={activeRecipientId}
        onSelect={handleSelect}
        onClearSelection={() => designer.setSelectedIds([])}
        onBeginTransaction={designer.beginTransaction}
        onMove={designer.moveSelection}
        onResize={designer.updateField}
        onDropField={(type, page, x, y) => designer.addField(type, page, x, y, activeRecipientId)}
        onContextMenu={(e, fieldId) => {
          e.preventDefault();
          if (!designer.selectedIds.includes(fieldId)) handleSelect(fieldId, false);
        }}
      />
    ),
    [designer, recipients, readOnly, activeRecipientId, handleSelect]
  );

  const recipientPanelProps = {
    documentId: id,
    recipients,
    flowType,
    activeRecipientId,
    readOnly,
    fieldCountByRecipient,
    onRecipientsChange: setRecipients,
    onFlowTypeChange: handleFlowTypeChange,
    onActiveChange: setActiveRecipientId,
    onRecipientRemoved: designer.clearRecipient,
  } as const;

  const propertiesPanelProps = {
    selected: designer.selectedFields,
    recipients,
    readOnly,
    onUpdate: designer.updateField,
    onDuplicate: designer.duplicateSelection,
    onDelete: designer.deleteSelection,
    onToggleLock: designer.toggleLock,
  } as const;

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-4" />
        Loading document…
      </div>
    );
  }

  if (loadError || !document) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="size-7 text-destructive" />
        </div>
        <div>
          <p className="font-semibold">Couldn't open this document</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{loadError}</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/sign")}>
          <ArrowLeft />
          Back to documents
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* --- Header --- */}
      <header className="flex shrink-0 flex-col gap-2 border-b border-border bg-card px-3 py-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate("/sign")} aria-label="Back to documents">
            <ArrowLeft />
          </Button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold">{document.title}</h1>
            <p className="truncate text-[11px] text-muted-foreground">{document.fileName}</p>
          </div>

          <Badge variant={document.status === "DRAFT" ? "secondary" : "default"}>
            {STATUS_LABEL[document.status]}
          </Badge>

          {unassignedCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="hidden gap-1 border-amber-500/40 text-amber-600 sm:inline-flex dark:text-amber-500">
                  <AlertTriangle className="size-3" />
                  {unassignedCount} unassigned
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                These fields aren't assigned to anyone and will be skipped.
              </TooltipContent>
            </Tooltip>
          )}

          <SaveIndicator state={designer.saveState} />

          {isDraft && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleSaveTemplate}
                  disabled={isSavingTemplate || recipients.length === 0}
                  aria-label="Save as template"
                >
                  {isSavingTemplate ? <Spinner className="size-3.5" /> : <FileStack className="size-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save as template</TooltipContent>
            </Tooltip>
          )}

          {!readOnly && (
            <div className="hidden items-center gap-0.5 sm:flex">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" onClick={designer.undo} disabled={!designer.canUndo} aria-label="Undo">
                    <Undo2 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" onClick={designer.redo} disabled={!designer.canRedo} aria-label="Redo">
                    <Redo2 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
              </Tooltip>
            </div>
          )}

          {isDraft &&
            (sendBlockedReason ? (
              // Disabled buttons don't fire hover events, so the tooltip wraps a
              // span — otherwise the user can't discover WHY they can't send.
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button disabled className="pointer-events-none">
                      {isSelfSign ? <PenLine /> : <Send />}
                      <span className="hidden sm:inline">{isSelfSign ? "Sign now" : "Send"}</span>
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{sendBlockedReason}</TooltipContent>
              </Tooltip>
            ) : isSelfSign ? (
              <Button onClick={handleSelfSign} disabled={isSelfSending}>
                {isSelfSending ? <Spinner className="size-4" /> : <PenLine />}
                <span className="hidden sm:inline">Sign now</span>
                <span className="sm:hidden">Sign</span>
              </Button>
            ) : (
              <Button onClick={openSend}>
                <Send />
                <span className="hidden sm:inline">Send for signature</span>
                <span className="sm:hidden">Send</span>
              </Button>
            ))}
        </div>

        {isDraft && (
          <WizardSteps
            activeStep={isSelfSign && recipients.length > 0 ? (sendBlockedReason ? 2 : 3) : activeStep}
            className="justify-center border-t border-border/60 pt-2 sm:justify-start"
          />
        )}
      </header>

      {/* --- Body --- */}
      {isDraft ? (
        // DRAFT: the full designer (place fields, assign recipients).
        <div className="relative flex min-h-0 flex-1">
          {/* Desktop left rail — hidden below lg */}
          <div className="hidden w-52 shrink-0 flex-col overflow-hidden border-r border-border bg-card lg:flex">
            <RecipientPanel {...recipientPanelProps} />
            <div className="min-h-0 flex-1 overflow-hidden">
              <FieldPalette
                activeRecipient={recipients.find((r) => r.id === activeRecipientId)}
                readOnly={readOnly}
                onQuickAdd={handleQuickAdd}
                className="h-full w-full border-0"
              />
            </div>
          </div>

          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
            <PdfViewer
              ref={viewerRef}
              source={fileUrl}
              className="min-h-0 flex-1 pb-14 lg:pb-0"
              renderPageOverlay={renderPageOverlay}
              pagesWithFields={designer.pagesWithFields}
              onPageChange={setCurrentPage}
              onPageCountChange={(count) => {
                // The server stores an advisory page count from upload; correct it
                // once pdf.js has authoritatively parsed the file.
                if (document.pageCount !== count) {
                  setDocument((d) => (d ? { ...d, pageCount: count } : d));
                }
              }}
            />

            {/* Mobile / tablet action bar — PDF stays primary above */}
            <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-around gap-1 border-t border-border bg-card/95 px-2 py-2 backdrop-blur-sm lg:hidden">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => setPeopleOpen(true)}
              >
                <Users className="size-3.5" />
                People
                {recipients.length > 0 && (
                  <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">{recipients.length}</span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => setFieldsOpen(true)}
              >
                <LayoutGrid className="size-3.5" />
                Fields
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings2 className="size-3.5" />
                Settings
                {designer.selectedIds.length > 0 && (
                  <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>

          {/* Desktop properties — progressive disclosure; hidden below lg */}
          <div className="hidden lg:contents">
            <PropertiesPanel {...propertiesPanelProps} hideWhenEmpty />
          </div>

          {/* People sheet */}
          <Sheet open={peopleOpen} onOpenChange={setPeopleOpen}>
            <SheetContent side="left" className="w-[min(100%,20rem)] p-0 sm:max-w-sm">
              <SheetHeader className="border-b border-border px-4 py-3 text-left">
                <SheetTitle>Who signs</SheetTitle>
                <SheetDescription>Add the people who need to sign or approve.</SheetDescription>
              </SheetHeader>
              <div className="overflow-y-auto">
                <RecipientPanel {...recipientPanelProps} />
              </div>
            </SheetContent>
          </Sheet>

          {/* Fields sheet */}
          <Sheet open={fieldsOpen} onOpenChange={setFieldsOpen}>
            <SheetContent side="bottom" className="flex h-[min(70vh,28rem)] flex-col p-0">
              <SheetHeader className="border-b border-border px-4 py-3 text-left">
                <SheetTitle>Place fields</SheetTitle>
                <SheetDescription>Tap a field type to drop it on the current page.</SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <FieldPalette
                  activeRecipient={recipients.find((r) => r.id === activeRecipientId)}
                  readOnly={readOnly}
                  onQuickAdd={handleQuickAdd}
                  className="h-full w-full border-0"
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Settings / properties sheet */}
          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetContent side="right" className="flex w-[min(100%,20rem)] flex-col p-0 sm:max-w-sm">
              <SheetHeader className="border-b border-border px-4 py-3 text-left">
                <SheetTitle>Field settings</SheetTitle>
                <SheetDescription>Who fills this in, and whether it is required.</SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <PropertiesPanel
                  {...propertiesPanelProps}
                  className="h-full w-full border-0"
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        // SENT / COMPLETED / DECLINED: the tracker replaces the designer — there
        // is nothing left to design, only progress to watch and results to fetch.
        <div className="min-h-0 flex-1 overflow-hidden bg-muted/30">
          <StatusTracker documentId={id} />
        </div>
      )}

      {showSend && document && (
        <SendDialog
          documentId={id}
          recipients={recipients}
          flowType={flowType}
          fieldCountByRecipient={fieldCountByRecipient}
          onClose={() => setShowSend(false)}
          onFlowTypeChange={handleFlowTypeChange}
          onSent={() => {
            setShowSend(false);
            // Flip to SENT so the body switches to the tracker without a reload.
            setDocument((d) => (d ? { ...d, status: "SENT" } : d));
          }}
        />
      )}
    </div>
  );
}
