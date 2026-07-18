import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Check, CloudOff, Loader2, Redo2, Send, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { signingApi } from "@/services/signingApi";
import type { SignDocument, SignFieldType, SignFlowType, SignRecipient } from "@/lib/signing/types";
import { PdfViewer, type PdfViewerHandle } from "@/components/signing/viewer/PdfViewer";
import { FieldPalette } from "@/components/signing/designer/FieldPalette";
import { PageFieldOverlay } from "@/components/signing/designer/PageFieldOverlay";
import { PropertiesPanel } from "@/components/signing/designer/PropertiesPanel";
import { RecipientPanel } from "@/components/signing/designer/RecipientPanel";
import { useFieldDesigner } from "@/components/signing/designer/useFieldDesigner";
import { SendDialog } from "@/components/signing/send/SendDialog";
import { StatusTracker } from "@/components/signing/send/StatusTracker";

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

export default function DocumentEditor() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
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
    const withoutFields = signers.filter((r) => (fieldCountByRecipient.get(r.id) ?? 0) === 0);
    const sms = recipients.filter((r) => r.authMethod === "SMS_OTP");

    if (recipients.length === 0) return "Add at least one recipient first.";
    if (signers.length === 0) return "Add at least one signer or approver.";
    if (withoutFields.length > 0)
      return `Place at least one field for ${withoutFields.map((r) => r.name).join(", ")}.`;
    if (unassignedCount > 0)
      return `${unassignedCount} field${unassignedCount === 1 ? " is" : "s are"} unassigned — assign or delete ${unassignedCount === 1 ? "it" : "them"}.`;
    if (sms.length > 0)
      return `SMS verification isn't available yet — switch ${sms.map((r) => r.name).join(", ")} to email.`;
    return null;
  }, [recipients, fieldCountByRecipient, unassignedCount]);

  const openSend = useCallback(async () => {
    // Flush any pending field edits so the server sends the current design, not
    // the last autosaved state.
    if (designer.saveState === "dirty" || designer.saveState === "saving") {
      await designer.save();
    }
    setShowSend(true);
  }, [designer]);

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
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
      {/* --- Header --- */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-3 py-2">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate("/sign")} aria-label="Back to documents">
          <ArrowLeft />
        </Button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">{document.title}</h1>
          <p className="truncate text-[11px] text-muted-foreground">{document.fileName}</p>
        </div>

        <Badge variant={document.status === "DRAFT" ? "secondary" : "default"}>{document.status}</Badge>

        {unassignedCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-600 dark:text-amber-500">
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

        {!readOnly && (
          <div className="flex items-center gap-0.5">
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
                    <Send />
                    Send
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{sendBlockedReason}</TooltipContent>
            </Tooltip>
          ) : (
            <Button onClick={openSend}>
              <Send />
              Send for signature
            </Button>
          ))}
      </header>

      {/* --- Body --- */}
      {isDraft ? (
        // DRAFT: the full designer (place fields, assign recipients).
        <div className="flex min-h-0 flex-1">
          <div className="flex w-52 shrink-0 flex-col overflow-hidden border-r border-border bg-card">
            <RecipientPanel
              documentId={id}
              recipients={recipients}
              flowType={flowType}
              activeRecipientId={activeRecipientId}
              readOnly={readOnly}
              fieldCountByRecipient={fieldCountByRecipient}
              onRecipientsChange={setRecipients}
              onFlowTypeChange={handleFlowTypeChange}
              onActiveChange={setActiveRecipientId}
              onRecipientRemoved={designer.clearRecipient}
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              <FieldPalette
                activeRecipient={recipients.find((r) => r.id === activeRecipientId)}
                readOnly={readOnly}
                onQuickAdd={handleQuickAdd}
              />
            </div>
          </div>

          <PdfViewer
            ref={viewerRef}
            source={fileUrl}
            className="flex-1"
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

          <PropertiesPanel
            selected={designer.selectedFields}
            recipients={recipients}
            readOnly={readOnly}
            onUpdate={designer.updateField}
            onDuplicate={designer.duplicateSelection}
            onDelete={designer.deleteSelection}
            onToggleLock={designer.toggleLock}
          />
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
