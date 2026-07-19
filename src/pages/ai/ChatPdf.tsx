import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, FileText, MessageSquare, SendHorizontal, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function ChatPdf() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [quota, setQuota] = useState<AiQuota | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    aiApi.getQuota().then(setQuota).catch(() => undefined);
  }, []);

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

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || !fileKey || thinking) return;

    // Optimistically show the user's message; roll it back if the call fails so
    // a failed turn doesn't leave a dangling unanswered question in the thread.
    const next: ChatMessage[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setThinking(true);
    try {
      const res = await aiApi.chat(fileKey, next);
      setMessages([...next, { role: "assistant", content: res.text }]);
      aiApi.getQuota().then(setQuota).catch(() => undefined);
      // Follow the answer as it types out — the message array doesn't change
      // during the reveal, so the [messages] scroll effect alone wouldn't keep up.
      const follow = window.setInterval(
        () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }),
        120
      );
      window.setTimeout(() => window.clearInterval(follow), 2800);
    } catch (err) {
      setMessages(messages); // roll back
      setInput(q);
      toast.error(err instanceof Error ? err.message : "Couldn't get a reply.");
    } finally {
      setThinking(false);
    }
  };

  if (!file) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
        <Header quota={quota} />
        {outOfCredits && <OutOfCredits plan={quota?.plan} />}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); pickFile(e.dataTransfer.files?.[0]); }}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "mt-4 flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 text-center transition-colors sm:p-20",
            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40"
          )}
        >
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            <Upload className="size-8 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold">Drop a PDF to chat with it</p>
            <p className="mt-1 text-sm text-muted-foreground">Up to {MAX_MB}MB · text-based PDFs</p>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="application/pdf" className="sr-only" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
        <BackLink />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-3xl flex-col p-3 sm:p-4">
      {/* Doc header */}
      <div className="mb-2 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <FileText className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
        {quota && <span className="shrink-0 text-[11px] text-muted-foreground">{quota.remaining} credits</span>}
        <Button variant="ghost" size="icon-sm" onClick={() => { setFile(null); setFileKey(null); setMessages([]); }} aria-label="Close">
          <X />
        </Button>
      </div>

      {/* Thread */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3">
        {uploading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            Reading your document…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-4 text-center">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10">
              <MessageSquare className="size-5 text-primary" />
            </div>
            <p className="text-sm font-medium">Ask anything about this document</p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={outOfCredits}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
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
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                  m.role === "user"
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm border border-border bg-card"
                )}
              >
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : (
                  // Only the newest reply types itself out; earlier ones render
                  // fully so a re-render doesn't replay the whole thread.
                  <AiStreamedText text={m.content} animate={i === messages.length - 1} />
                )}
              </div>
            </div>
          ))
        )}
        {thinking && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-border bg-card px-3.5 py-2.5">
              <Sparkles className="size-3.5 animate-pulse text-primary" />
              <span className="text-xs text-muted-foreground">Thinking…</span>
            </div>
          </div>
        )}
      </div>

      {outOfCredits && <OutOfCredits plan={quota?.plan} className="mt-2" />}

      {/* Composer */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="mt-2 flex items-center gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about the document…"
          disabled={uploading || thinking || outOfCredits}
          className="h-11"
        />
        <Button type="submit" size="icon-lg" disabled={!input.trim() || uploading || thinking || outOfCredits} aria-label="Send">
          {thinking ? <Spinner className="size-4" /> : <SendHorizontal />}
        </Button>
      </form>
    </div>
  );
}

function Header({ quota }: { quota: AiQuota | null }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
        <MessageSquare className="size-5 text-emerald-500" />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold tracking-tight">Chat with PDF</h1>
        <p className="text-sm text-muted-foreground">Ask questions and get answers grounded in your document.</p>
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
    <div className={cn("flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-500", className)}>
      <AlertTriangle className="size-3.5 shrink-0" />
      You've used all your AI credits this month.{plan === "FREE" && " Upgrade to PRO for more."}
    </div>
  );
}

function BackLink() {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate("/workspace")} className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-3.5" />
      Back to tools
    </button>
  );
}
