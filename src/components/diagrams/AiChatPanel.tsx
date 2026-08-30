import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import {
  ImagePlus,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { diagramsApi } from "@/services/diagramsApi";
import type { DiagramDocument, DiagramPage } from "@/lib/diagram/model";

type InsertMode = "replace" | "append" | "newPage";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  document?: DiagramDocument;
  page?: DiagramPage;
  previewSvg?: string;
  error?: boolean;
  timedOut?: boolean;
};

type ChatSession = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  diagramId: string | null;
  currentPage: DiagramPage | null;
  onInsertDocument: (doc: DiagramDocument, mode: InsertMode) => void;
  onInsertPage: (page: DiagramPage) => void;
  onEditedPage: (page: DiagramPage) => void;
  className?: string;
};

const SUGGESTED = [
  "Create a payment gateway architecture for eMoce: customer → checkout → payment service → bank APIs, with fraud checks and webhook callbacks.",
  "Draw a layered AWS architecture with VPC, ALB, ECS services, RDS, and Redis cache.",
  "Sequence diagram for user signup with email verification and OAuth.",
  "ER diagram for an e-commerce catalog: products, variants, categories, inventory.",
];

function storageKey(diagramId: string | null) {
  return `diagram_ai_sessions:${diagramId || "new"}`;
}

function loadSessions(diagramId: string | null): ChatSession[] {
  try {
    const raw = localStorage.getItem(storageKey(diagramId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSessions(diagramId: string | null, sessions: ChatSession[]) {
  try {
    localStorage.setItem(storageKey(diagramId), JSON.stringify(sessions));
  } catch {
    /* quota */
  }
}

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isTimeoutError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  return /timeout|timed out|AbortError|aborted/i.test(msg);
}

export function AiChatPanel({
  open,
  onClose,
  organizationId,
  diagramId,
  currentPage,
  onInsertDocument,
  onInsertPage,
  onEditedPage,
  className,
}: Props) {
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions(diagramId));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loaded = loadSessions(diagramId);
    setSessions(loaded);
    setActiveId(loaded[0]?.id ?? null);
  }, [diagramId]);

  useEffect(() => {
    saveSessions(diagramId, sessions);
  }, [diagramId, sessions]);

  const active = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId]
  );

  const persist = useCallback((next: ChatSession[]) => {
    setSessions(next);
  }, []);

  const newChat = () => {
    const s: ChatSession = {
      id: uid(),
      title: "New chat",
      updatedAt: Date.now(),
      messages: [],
    };
    persist([s, ...sessions]);
    setActiveId(s.id);
    setPrompt("");
  };

  const deleteSession = (id: string) => {
    const next = sessions.filter((s) => s.id !== id);
    persist(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
  };

  const ensureSession = (): string => {
    if (activeId) return activeId;
    const s: ChatSession = {
      id: uid(),
      title: "New chat",
      updatedAt: Date.now(),
      messages: [],
    };
    persist([s, ...sessions]);
    setActiveId(s.id);
    return s.id;
  };

  const appendMessages = (sessionId: string, msgs: ChatMessage[], title?: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const nextMsgs = [...s.messages, ...msgs];
        return {
          ...s,
          title: title ?? s.title,
          updatedAt: Date.now(),
          messages: nextMsgs,
        };
      })
    );
  };

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages.length, busy]);

  const runGenerate = async (text: string) => {
    const sessionId = ensureSession();
    const userMsg: ChatMessage = { id: uid(), role: "user", text };
    appendMessages(
      sessionId,
      [userMsg],
      text.length > 48 ? `${text.slice(0, 48)}…` : text
    );
    setPrompt("");
    setBusy(true);
    try {
      const { document } = await diagramsApi.aiGenerate(organizationId, text);
      appendMessages(sessionId, [
        {
          id: uid(),
          role: "assistant",
          text: "Here's a diagram from your description.",
          document,
        },
      ]);
    } catch (e) {
      appendMessages(sessionId, [
        {
          id: uid(),
          role: "assistant",
          text: isTimeoutError(e)
            ? "That took too long. Please try again — the request timed out."
            : e instanceof Error
              ? e.message
              : "AI generate failed",
          error: true,
          timedOut: isTimeoutError(e),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const runEdit = async (text: string) => {
    if (!diagramId || !currentPage) {
      const sessionId = ensureSession();
      appendMessages(sessionId, [
        { id: uid(), role: "user", text },
        {
          id: uid(),
          role: "assistant",
          text: "Save the diagram first, then try AI edit.",
          error: true,
        },
      ]);
      setPrompt("");
      return;
    }
    const sessionId = ensureSession();
    appendMessages(sessionId, [{ id: uid(), role: "user", text }]);
    setPrompt("");
    setBusy(true);
    try {
      const { page } = await diagramsApi.aiEdit(organizationId, diagramId, text, currentPage);
      appendMessages(sessionId, [
        {
          id: uid(),
          role: "assistant",
          text: "Edit applied. Insert the updated page when ready.",
          page,
        },
      ]);
      onEditedPage(page);
    } catch (e) {
      appendMessages(sessionId, [
        {
          id: uid(),
          role: "assistant",
          text: isTimeoutError(e)
            ? "Edit timed out. Please retry."
            : e instanceof Error
              ? e.message
              : "AI edit failed",
          error: true,
          timedOut: isTimeoutError(e),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const runFromImage = async (file: File, hint?: string) => {
    if (file.size > 5 * 1024 * 1024) {
      const sessionId = ensureSession();
      appendMessages(sessionId, [
        {
          id: uid(),
          role: "assistant",
          text: "Image must be 5MB or smaller.",
          error: true,
        },
      ]);
      return;
    }
    const sessionId = ensureSession();
    appendMessages(sessionId, [
      {
        id: uid(),
        role: "user",
        text: hint?.trim() || `Image: ${file.name}`,
      },
    ]);
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
      const imageBase64 = btoa(binary);
      const { document } = await diagramsApi.aiFromImage(organizationId, {
        imageBase64,
        mimeType: (file.type as "image/png" | "image/jpeg") || "image/png",
        prompt: hint || undefined,
      });
      appendMessages(sessionId, [
        {
          id: uid(),
          role: "assistant",
          text: "Diagram generated from your image.",
          document,
        },
      ]);
    } catch (e) {
      appendMessages(sessionId, [
        {
          id: uid(),
          role: "assistant",
          text: isTimeoutError(e)
            ? "Image conversion timed out. Please retry."
            : e instanceof Error
              ? e.message
              : "Image-to-diagram failed",
          error: true,
          timedOut: isTimeoutError(e),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const send = () => {
    const text = prompt.trim();
    if (text.length < 2 || busy) return;
    void runGenerate(text);
  };

  if (!open) return null;

  const empty = !active || active.messages.length === 0;

  return (
    <aside
      className={cn(
        "flex h-full w-[520px] max-w-full shrink-0 flex-col border-l border-[#cfd8e3] bg-white",
        className
      )}
    >
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#e2e8f0] px-3">
        <h2 className="text-sm font-semibold text-[#0f172a]">Generate</h2>
        <Button type="button" variant="ghost" size="icon-xs" onClick={onClose} aria-label="Close">
          <X className="size-4" />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sessions */}
        <div className="flex w-[160px] shrink-0 flex-col border-r border-[#e2e8f0] bg-[#f8fafc]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="m-2 justify-start gap-1.5 rounded-md text-xs"
            onClick={newChat}
          >
            <Plus className="size-3.5" />
            New Chat
          </Button>
          <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1.5 pb-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "group flex items-center gap-1 rounded-md px-2 py-1.5 text-xs",
                  s.id === activeId
                    ? "bg-white text-[#0f172a] shadow-sm ring-1 ring-[#e2e8f0]"
                    : "text-[#64748b] hover:bg-[#eef2f7]"
                )}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left"
                  onClick={() => setActiveId(s.id)}
                >
                  {s.title}
                </button>
                <button
                  type="button"
                  className="opacity-0 transition group-hover:opacity-100"
                  aria-label="Delete session"
                  onClick={() => deleteSession(s.id)}
                >
                  <Trash2 className="size-3 text-[#94a3b8]" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Conversation */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {empty ? (
              <div className="space-y-2">
                <p className="text-xs text-[#64748b]">Try a prompt</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED.map((chip) => (
                    <button
                      key={chip.slice(0, 24)}
                      type="button"
                      className="rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-1 text-left text-[11px] leading-snug text-[#334155] transition hover:border-[#93c5fd] hover:bg-white"
                      onClick={() => setPrompt(chip)}
                    >
                      {chip.length > 72 ? `${chip.slice(0, 72)}…` : chip}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              active?.messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[95%] rounded-lg px-3 py-2 text-xs",
                    m.role === "user"
                      ? "ml-auto bg-[#2563eb] text-white"
                      : m.error
                        ? "bg-[#fef2f2] text-[#991b1b] ring-1 ring-[#fecaca]"
                        : "bg-[#f1f5f9] text-[#0f172a]"
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>

                  {m.document || m.page ? (
                    <div className="mt-2 space-y-2">
                      <button
                        type="button"
                        className="flex h-24 w-full items-center justify-center overflow-hidden rounded-md border border-[#cbd5e1] bg-white"
                        onClick={() => {
                          if (m.document) onInsertDocument(m.document, "append");
                          else if (m.page) onInsertPage(m.page);
                        }}
                        title="Click to insert"
                      >
                        {m.previewSvg ? (
                          <div
                            className="h-full w-full [&_svg]:h-full [&_svg]:w-full"
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(m.previewSvg, {
                                USE_PROFILES: { svg: true, svgFilters: true },
                              }),
                            }}
                          />
                        ) : (
                          <span className="text-[11px] text-[#64748b]">
                            Diagram preview — Click to insert
                          </span>
                        )}
                      </button>
                      {m.document ? (
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            className="rounded-md"
                            onClick={() => onInsertDocument(m.document!, "append")}
                          >
                            Insert on canvas
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            className="rounded-md"
                            onClick={() => onInsertDocument(m.document!, "replace")}
                          >
                            Replace page
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            variant="ghost"
                            className="rounded-md"
                            onClick={() => onInsertDocument(m.document!, "newPage")}
                          >
                            New page
                          </Button>
                        </div>
                      ) : null}
                      {m.page && !m.document ? (
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          className="rounded-md"
                          onClick={() => onInsertPage(m.page!)}
                        >
                          Insert on canvas
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  {m.timedOut ? (
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      className="mt-2 rounded-md"
                      disabled={busy}
                      onClick={() => {
                        const lastUser = [...(active?.messages ?? [])]
                          .reverse()
                          .find((x) => x.role === "user");
                        if (lastUser) void runGenerate(lastUser.text);
                      }}
                    >
                      Retry
                    </Button>
                  ) : null}
                </div>
              ))
            )}

            {busy ? (
              <div className="flex items-center gap-2 text-xs text-[#64748b]">
                <Spinner className="size-4" />
                Generating…
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-[#e2e8f0] p-2.5">
            <div className="relative rounded-lg border border-[#e2e8f0] bg-[#f8fafc] focus-within:border-[#93c5fd] focus-within:ring-2 focus-within:ring-[#93c5fd]/30">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your diagram"
                className="min-h-[72px] resize-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <div className="flex items-center justify-between px-2 pb-2">
                <div className="flex items-center gap-1">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void runFromImage(f, prompt);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={busy}
                    onClick={() => fileRef.current?.click()}
                    aria-label="Attach image"
                  >
                    <ImagePlus className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="rounded-md text-[11px]"
                    disabled={busy || prompt.trim().length < 2 || !diagramId}
                    onClick={() => void runEdit(prompt.trim())}
                    title={!diagramId ? "Save diagram first" : "Edit current page with AI"}
                  >
                    Edit page
                  </Button>
                </div>
                <Button
                  type="button"
                  size="icon-xs"
                  className="rounded-md"
                  disabled={busy || prompt.trim().length < 2}
                  onClick={send}
                  aria-label="Send"
                >
                  {busy ? <Spinner className="size-3.5" /> : <Send className="size-3.5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
