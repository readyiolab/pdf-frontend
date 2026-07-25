import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  FileText,
  PanelLeft,
  PanelRight,
  RefreshCw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AiStreamedText } from "@/components/ai/AiStreamedText";
import { aiApi, type AiQuota, type AiResult } from "@/services/aiApi";

export interface AiPreset {
  id: string;
  label: string;
  hint: string;
}

interface AiDocPanelProps {
  title: string;
  subtitle: string;
  actionLabel: string;
  presets: AiPreset[];
  onRun: (fileKey: string, preset: string) => Promise<AiResult>;
  accent?: string;
  /** Soft tint for the result pane header (WhatsApp-studio cousin). */
  tone?: "fuchsia" | "sky";
}

const MAX_MB = 30;

type MobilePane = "pdf" | "result";

/**
 * Full-bleed document studio: PDF on the left, AI result on the right —
 * same split language as Chat with PDF, tuned for one-shot summarize / explain.
 */
export function AiDocPanel({
  title,
  subtitle,
  actionLabel,
  presets,
  onRun,
  accent,
  tone = "fuchsia",
}: AiDocPanelProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultScrollRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState<string | null>(null);
  const [preset, setPreset] = useState(presets[0]?.id ?? "");
  const [isDragging, setIsDragging] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AiResult | null>(null);
  const [quota, setQuota] = useState<AiQuota | null>(null);
  const [copied, setCopied] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>("result");

  const toneBar =
    tone === "sky"
      ? "from-sky-500 to-cyan-600"
      : "from-fuchsia-500 to-violet-600";
  const toneSoft =
    tone === "sky"
      ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
      : "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400";

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
    if (result) {
      resultScrollRef.current?.scrollTo({ top: 0 });
    }
  }, [result]);

  const outOfCredits = Boolean(quota && quota.remaining <= 0);
  const runId = result ? `${fileKey}:${preset}` : "";

  const pickFile = (f: File | undefined) => {
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
    setFileKey(null);
    setResult(null);
    setMobilePane("result");
  };

  const reset = () => {
    setFile(null);
    setFileKey(null);
    setResult(null);
  };

  const go = async () => {
    if (!file) return;
    setIsWorking(true);
    setProgress(0);
    setResult(null);
    setMobilePane("result");
    try {
      let key = fileKey;
      if (!key) {
        key = await aiApi.uploadPdf(file, setProgress);
        setFileKey(key);
      }
      setProgress(100);
      const res = await onRun(key, preset);
      setResult(res);
      aiApi.getQuota().then(setQuota).catch(() => undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsWorking(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!file) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br",
              accent ?? "from-primary/20 to-primary/5"
            )}
          >
            <Sparkles className="size-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {quota && (
            <div className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium">
              <span className="tabular-nums">{quota.remaining}</span>
              <span className="text-muted-foreground"> / {quota.limit} AI credits</span>
            </div>
          )}
        </div>

        {outOfCredits && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-500">
            <AlertTriangle className="size-3.5 shrink-0" />
            You&apos;ve used all your AI credits this month.
            {quota?.plan === "FREE" && " Upgrade to PRO for more."}
          </div>
        )}

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
              ? "scale-[1.01] border-primary bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-muted/40"
          )}
        >
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            <Upload className="size-8 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold">Drop a PDF — document left, AI right</p>
            <p className="mt-1 text-sm text-muted-foreground">Up to {MAX_MB}MB · live split studio</p>
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

        <button
          type="button"
          onClick={() => navigate("/workspace")}
          className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to tools
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
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
          onClick={() => setMobilePane("result")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors",
            mobilePane === "result" ? "bg-muted text-foreground" : "text-muted-foreground"
          )}
        >
          <PanelRight className="size-3.5" />
          {actionLabel}
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* PDF pane */}
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
              disabled={isWorking}
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

        {/* Result / controls pane */}
        <section
          className={cn(
            "relative min-h-0 w-full flex-1 flex-col md:flex",
            mobilePane === "result" ? "flex" : "hidden"
          )}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-50"
            style={{
              backgroundColor: "#f6f3ee",
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.035'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 dark:bg-[#0b141a]/94" aria-hidden />

          <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-border/60 bg-[#f0f2f5] px-3 py-2.5 dark:bg-[#202c33]">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-sm",
                toneBar
              )}
            >
              <Sparkles className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{title.replace(" with AI", "")}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {isWorking
                  ? progress < 100
                    ? `Uploading… ${progress}%`
                    : "Reading your document…"
                  : result
                    ? "Ready · verify important details"
                    : "Pick a style, then run"}
              </p>
            </div>
            {quota && (
              <span className="hidden shrink-0 rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-medium tabular-nums sm:inline">
                {quota.remaining}/{quota.limit}
              </span>
            )}
          </header>

          <div className="relative z-10 shrink-0 border-b border-border/40 bg-[#f0f2f5]/80 px-3 py-2.5 dark:bg-[#202c33]/80 sm:px-4">
            <div className={cn("grid gap-2", presets.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  disabled={isWorking}
                  aria-pressed={preset === p.id}
                  className={cn(
                    "rounded-2xl border px-2.5 py-2 text-left transition-all disabled:opacity-60",
                    preset === p.id
                      ? "border-transparent bg-white shadow-sm ring-2 ring-offset-0 dark:bg-[#2a3942] " +
                          (tone === "sky" ? "ring-sky-500/50" : "ring-fuchsia-500/50")
                      : "border-border/70 bg-white/70 hover:bg-white dark:border-white/10 dark:bg-[#182229] dark:hover:bg-[#1f2c33]"
                  )}
                >
                  <span className="block text-xs font-semibold sm:text-sm">{p.label}</span>
                  <span className="mt-0.5 block text-[10px] leading-tight text-muted-foreground sm:text-[11px]">
                    {p.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div ref={resultScrollRef} className="relative z-10 min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
            {outOfCredits && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-500">
                <AlertTriangle className="size-3.5 shrink-0" />
                Out of AI credits this month.
              </div>
            )}

            {result ? (
              <div className="mx-auto max-w-xl">
                <div className="mb-2 flex items-center gap-2">
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", toneSoft)}>
                    {actionLabel} result
                  </span>
                  <Button variant="ghost" size="xs" onClick={copy} className="ml-auto h-7 gap-1 text-xs">
                    {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-[14px] leading-relaxed text-slate-900 shadow-sm dark:bg-[#202c33] dark:text-slate-100">
                  <AiStreamedText key={runId} text={result.text} />
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  AI · {result.usage.inputTokens.toLocaleString()} in /{" "}
                  {result.usage.outputTokens.toLocaleString()} out · Always verify important details.
                </p>
              </div>
            ) : isWorking ? (
              <div className="mx-auto flex max-w-md flex-col items-center gap-3 pt-16 text-center">
                <div className="relative flex size-14 items-center justify-center">
                  <Sparkles className="size-6 text-primary" />
                  <span
                    className="absolute inset-0 animate-ping rounded-full border-2 border-primary/25"
                    style={{ animationDuration: "2s" }}
                  />
                </div>
                <p className="text-sm font-medium">
                  {progress < 100 ? `Uploading… ${progress}%` : "Reading your document…"}
                </p>
                <div className="w-full space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-4/6" />
                </div>
              </div>
            ) : (
              <div className="mx-auto flex max-w-md flex-col items-center gap-3 pt-12 text-center">
                <div className="rounded-2xl bg-card/90 px-4 py-3 text-xs leading-relaxed text-muted-foreground shadow-sm backdrop-blur dark:bg-[#182229]/90">
                  Keep the PDF open on the left. Choose a style, then {actionLabel.toLowerCase()} — results
                  stream here like a chat reply.
                </div>
              </div>
            )}
          </div>

          <div className="relative z-10 flex shrink-0 items-center gap-2 border-t border-border/50 bg-[#f0f2f5] px-3 py-2.5 dark:bg-[#202c33]">
            <Button
              onClick={go}
              disabled={isWorking || outOfCredits}
              size="lg"
              className={cn(
                "h-11 flex-1 rounded-full text-white shadow-sm",
                tone === "sky"
                  ? "bg-sky-600 hover:bg-sky-700"
                  : "bg-fuchsia-600 hover:bg-fuchsia-700"
              )}
            >
              {isWorking ? (
                <Spinner className="size-4" />
              ) : result ? (
                <RefreshCw className="size-4" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {isWorking ? "Working…" : result ? `${actionLabel} again` : actionLabel}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
