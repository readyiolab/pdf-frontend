import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  MessageSquare,
  SendHorizontal,
  Upload,
  X,
  PanelLeft,
  PanelRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { AiStreamedText } from "@/components/ai/AiStreamedText";
import { aiApi, type AiQuota, type ChatMessage } from "@/services/aiApi";

const MAX_MB = 30;
const STARTERS = [
  "What is this document about?",
  "Summarize the key points.",
  "Are there any important dates or deadlines?",
  "What should I be careful about?",
];

type MobilePane = "pdf" | "chat";

export default function ChatPdf() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [quota, setQuota] = useState<AiQuota | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>("chat");

  useEffect(() => {
    aiApi.getQuota().then(setQuota).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!file) {
      setPdfUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const outOfCredits = quota ? quota.remaining <= 0 : false;

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please choose a PDF file.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`That PDF is larger than the ${MAX_MB}MB limit.`);
      return;
    }
    setFile(f);
    setMessages([]);
    setMobilePane("chat");
    setUploading(true);
    try {
      const key = await aiApi.uploadPdf(f);
      setFileKey(key);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setFileKey(null);
    setMessages([]);
    setInput("");
  };

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || !fileKey || thinking) return;

    const next: ChatMessage[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setThinking(true);
    setMobilePane("chat");
    try {
      const res = await aiApi.chat(fileKey, next);
      setMessages([...next, { role: "assistant", content: res.text }]);
      aiApi.getQuota().then(setQuota).catch(() => undefined);
      const follow = window.setInterval(
        () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }),
        120
      );
      window.setTimeout(() => window.clearInterval(follow), 2800);
    } catch (err) {
      setMessages(messages);
      setInput(q);
      toast.error(err instanceof Error ? err.message : "Couldn't get a reply.");
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  };

  if (!file) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <Header quota={quota} />
        {outOfCredits && <OutOfCredits plan={quota?.plan} className="mt-4" />}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            pickFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "mt-6 flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed p-12 text-center transition-all sm:p-20",
            isDragging
              ? "border-emerald-500 bg-emerald-500/5 scale-[1.01]"
              : "border-border hover:border-emerald-500/40 hover:bg-muted/40"
          )}
        >
          <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/25 to-teal-500/10">
            <Upload className="size-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-base font-semibold">Drop a PDF to start chatting</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Document on the left · chat on the right · up to {MAX_MB}MB
            </p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => {
            pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <BackLink />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      {/* Mobile pane switcher */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-card px-2 py-1.5 md:hidden">
        <button
          type="button"
          onClick={() => setMobilePane("pdf")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors",
            mobilePane === "pdf" ? "bg-muted text-foreground" : "text-muted-foreground"
          )}
        >
          <PanelLeft className="size-3.5" />
          Document
        </button>
        <button
          type="button"
          onClick={() => setMobilePane("chat")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors",
            mobilePane === "chat" ? "bg-muted text-foreground" : "text-muted-foreground"
          )}
        >
          <PanelRight className="size-3.5" />
          Chat
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* ── PDF pane ───────────────────────────────────────────────────── */}
        <aside
          className={cn(
            "min-h-0 w-full flex-col border-r border-border bg-[#1a1a1a] md:flex md:w-[46%] lg:w-[48%]",
            mobilePane === "pdf" ? "flex" : "hidden"
          )}
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#202c33] px-3 py-2.5 text-white">
            <FileText className="size-4 shrink-0 text-emerald-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-[11px] text-white/50">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
                {quota ? ` · ${quota.remaining} credits left` : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={reset}
              className="text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Close document"
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 bg-[#0b141a]">
            {pdfUrl ? (
              <iframe
                title={file.name}
                src={`${pdfUrl}#view=FitH`}
                className="h-full w-full border-0 bg-white"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-white/40">
                Loading PDF…
              </div>
            )}
          </div>
        </aside>

        {/* ── Chat pane (WhatsApp-style) ─────────────────────────────────── */}
        <section
          className={cn(
            "relative min-h-0 w-full flex-1 flex-col md:flex",
            mobilePane === "chat" ? "flex" : "hidden"
          )}
        >
          {/* Chat wallpaper */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.55] dark:opacity-40"
            style={{
              backgroundColor: "var(--chat-bg, #efeae2)",
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 dark:bg-[#0b141a]/92" aria-hidden />

          {/* Chat header */}
          <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-border/60 bg-[#f0f2f5] px-3 py-2.5 dark:bg-[#202c33]">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <MessageSquare className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">PDF Assistant</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {uploading ? "Reading your document…" : thinking ? "typing…" : "Online · answers from this PDF"}
              </p>
            </div>
            {quota && (
              <span className="hidden shrink-0 rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-medium tabular-nums sm:inline">
                {quota.remaining}/{quota.limit}
              </span>
            )}
          </header>

          {/* Messages */}
          <div ref={scrollRef} className="relative z-10 min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-5">
            {uploading ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <Spinner className="size-5 text-emerald-600" />
                Preparing chat for your document…
              </div>
            ) : messages.length === 0 ? (
              <div className="mx-auto flex max-w-md flex-col items-center gap-4 pt-8 text-center">
                <div className="rounded-2xl bg-card/90 px-4 py-3 text-xs leading-relaxed text-muted-foreground shadow-sm backdrop-blur dark:bg-[#182229]/90">
                  Messages are private to this session. Ask anything about{" "}
                  <span className="font-medium text-foreground">{file.name}</span>.
                </div>
                <div className="flex w-full flex-col gap-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      disabled={outOfCredits || uploading}
                      className="rounded-2xl border border-border/80 bg-card/95 px-4 py-2.5 text-left text-sm text-foreground shadow-sm transition hover:border-emerald-500/40 hover:bg-card disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "relative max-w-[min(92%,28rem)] px-3 py-2 text-[14px] leading-relaxed shadow-sm",
                      m.role === "user"
                        ? "rounded-2xl rounded-tr-sm bg-[#d9fdd3] text-slate-900 dark:bg-emerald-700 dark:text-emerald-50"
                        : "rounded-2xl rounded-tl-sm bg-white text-slate-900 dark:bg-[#202c33] dark:text-slate-100"
                    )}
                  >
                    {m.role === "user" ? (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      <AiStreamedText text={m.content} animate={i === messages.length - 1 && !thinking} />
                    )}
                  </div>
                </div>
              ))
            )}

            {thinking && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 shadow-sm dark:bg-[#202c33]">
                  <span className="flex gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:0ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:150ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:300ms]" />
                  </span>
                  <span className="text-xs text-muted-foreground">Thinking…</span>
                </div>
              </div>
            )}
          </div>

          {outOfCredits && <OutOfCredits plan={quota?.plan} className="relative z-10 mx-3 mb-1" />}

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="relative z-10 flex shrink-0 items-end gap-2 border-t border-border/50 bg-[#f0f2f5] px-2 py-2 dark:bg-[#202c33] sm:px-3 sm:py-2.5"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Type a message"
              disabled={uploading || thinking || outOfCredits}
              className="max-h-28 min-h-[44px] flex-1 resize-none rounded-3xl border-0 bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none ring-0 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:opacity-60 dark:bg-[#2a3942]"
            />
            <Button
              type="submit"
              size="icon-lg"
              disabled={!input.trim() || uploading || thinking || outOfCredits}
              className="size-11 shrink-0 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
              aria-label="Send"
            >
              {thinking ? <Spinner className="size-4" /> : <SendHorizontal className="size-5" />}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}

function Header({ quota }: { quota: AiQuota | null }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/25 to-teal-500/10">
        <MessageSquare className="size-6 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold tracking-tight">Chat with PDF</h1>
        <p className="text-sm text-muted-foreground">
          Split view — read the PDF while you chat, WhatsApp-style.
        </p>
      </div>
      {quota && (
        <div className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium">
          <span className="tabular-nums">{quota.remaining}</span>
          <span className="text-muted-foreground"> / {quota.limit} AI credits</span>
        </div>
      )}
    </div>
  );
}

function OutOfCredits({ plan, className }: { plan?: "FREE" | "PRO"; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-500",
        className
      )}
    >
      <AlertTriangle className="size-3.5 shrink-0" />
      You&apos;ve used all your AI credits this month.
      {plan === "FREE" && " Upgrade to PRO for more."}
    </div>
  );
}

function BackLink() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate("/workspace")}
      className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" />
      Back to tools
    </button>
  );
}
