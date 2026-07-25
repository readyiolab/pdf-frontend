import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, Copy, FileText, RefreshCw, Upload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePdfPreviews } from "@/hooks/usePdfPreviews";
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
  /** Verb on the primary button, e.g. "Summarize" / "Explain". */
  actionLabel: string;
  presets: AiPreset[];
  /** Runs the AI action for the uploaded file + chosen preset. */
  onRun: (fileKey: string, preset: string) => Promise<AiResult>;
  /** Accent gradient for the header icon. */
  accent?: string;
}

const MAX_MB = 30;

/**
 * Shared UI for a one-shot AI document action (Summarize, Explain, …).
 *
 * The action itself is injected via `onRun`, so a new AI tool is a thin wrapper
 * that passes presets and an aiApi call — no duplicated upload/preview/quota UI.
 */
export function AiDocPanel({ title, subtitle, actionLabel, presets, onRun, accent }: AiDocPanelProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState<string | null>(null);
  const [preset, setPreset] = useState(presets[0]?.id ?? "");
  const [isDragging, setIsDragging] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AiResult | null>(null);
  const [quota, setQuota] = useState<AiQuota | null>(null);
  const [copied, setCopied] = useState(false);

  const previews = usePdfPreviews(file, 1);
  const heroPreview = previews.previews[0];

  useEffect(() => {
    aiApi.getQuota().then(setQuota).catch(() => undefined);
  }, []);

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
    setFileKey(null); // new file → must re-upload
    setResult(null);
  };

  const go = async () => {
    if (!file) return;
    setIsWorking(true);
    setProgress(0);
    setResult(null);
    try {
      // Upload once; reuse the key for re-runs with a different preset.
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

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br", accent ?? "from-primary/20 to-primary/5")}>
          <FileText className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {quota && (
          <div className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium">
            <span className="tabular-nums">{quota.remaining}</span>
            <span className="text-muted-foreground"> / {quota.limit} AI credits left</span>
          </div>
        )}
      </div>

      {outOfCredits && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-500">
          <AlertTriangle className="size-3.5 shrink-0" />
          You've used all your AI credits this month.
          {quota?.plan === "FREE" && " Upgrade to PRO for more."}
        </div>
      )}

      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); pickFile(e.dataTransfer.files?.[0]); }}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 text-center transition-colors sm:p-20",
            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40"
          )}
        >
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            <Upload className="size-8 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold">Drop a PDF here, or click to browse</p>
            <p className="mt-1 text-sm text-muted-foreground">Up to {MAX_MB}MB · text-based PDFs</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
              <Button variant="ghost" size="icon-sm" onClick={() => { setFile(null); setFileKey(null); setResult(null); }} disabled={isWorking} aria-label="Remove file">
                <X />
              </Button>
            </div>
            <div className="flex min-h-64 flex-1 items-center justify-center bg-muted/30 p-4">
              {heroPreview ? (
                <img src={heroPreview} alt="First page" className="max-h-[60vh] w-auto rounded-lg border border-border shadow-sm" />
              ) : (
                <Spinner className="size-5 text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
            <div className={cn("grid gap-2", presets.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  disabled={isWorking}
                  aria-pressed={preset === p.id}
                  className={cn(
                    "rounded-xl border-2 p-2.5 text-left transition-colors disabled:opacity-60",
                    preset === p.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                  )}
                >
                  <span className="block text-sm font-semibold">{p.label}</span>
                  <span className="block text-[11px] leading-tight text-muted-foreground">{p.hint}</span>
                </button>
              ))}
            </div>

            <div className="relative flex max-h-[72vh] min-h-64 flex-col rounded-2xl border border-border bg-card">
              {result ? (
                <>
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                    <FileText className="size-4 text-primary" />
                    <span className="text-sm font-semibold">Result</span>
                    <Button variant="ghost" size="xs" onClick={copy} className="ml-auto">
                      {copied ? <Check className="text-emerald-500" /> : <Copy />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    <AiStreamedText key={runId} text={result.text} />
                  </div>
                  <div className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
                    Generated by AI · {result.usage.inputTokens.toLocaleString()} in / {result.usage.outputTokens.toLocaleString()} out tokens · Always verify important details.
                  </div>
                </>
              ) : isWorking ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                  <div className="relative flex size-12 items-center justify-center">
                    <FileText className="size-6 text-primary" />
                    <span className="absolute inset-0 animate-ping rounded-full border-2 border-primary/20" style={{ animationDuration: "2s" }} />
                  </div>
                  <p className="text-sm font-medium">{progress < 100 ? `Uploading… ${progress}%` : "Reading your document…"}</p>
                  <div className="w-full max-w-xs space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-4/6" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
                  <FileText className="size-6" />
                  <p className="text-sm">Pick an option and go.</p>
                </div>
              )}
            </div>

            <Button onClick={go} disabled={isWorking || outOfCredits} size="lg" className="w-full">
              {isWorking ? <Spinner className="size-4" /> : result ? <RefreshCw /> : <FileText />}
              {isWorking ? "Working…" : result ? `${actionLabel} again` : actionLabel}
            </Button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }}
      />

      <button onClick={() => navigate("/workspace")} className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Back to tools
      </button>
    </div>
  );
}
