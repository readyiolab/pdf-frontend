import { useState, useCallback, useRef } from "react";
import { apiService, API_BASE_URL } from "@/services/api";
import type { Job } from "@/services/api";
import type { ProcessingStep } from "@/lib/design-tokens";
import { MAX_POLL_ATTEMPTS, POLL_INTERVAL_MS } from "@/lib/design-tokens";

/**
 * Fetches a short-lived signed URL for the job's private result and triggers a
 * browser download. Results are no longer publicly accessible.
 */
async function triggerDownload(jobId: string, outputFile: string | null) {
  const { url } = await apiService.getDownloadUrl(jobId);
  const link = document.createElement("a");
  link.href = url;
  const fileParts = (outputFile ?? "download.pdf").split("/");
  link.setAttribute("download", fileParts[fileParts.length - 1]);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

interface UseJobProcessorResult {
  step: ProcessingStep;
  job: Job | null;
  error: string | null;
  progress: number;
  isProcessing: boolean;
  processFiles: (
    tool: string,
    uploadedKeys: string[],
    options: Record<string, any>
  ) => Promise<Job>;
  reset: () => void;
  downloadResult: () => void;
}

export function useJobProcessor(): UseJobProcessorResult {
  const [step, setStep] = useState<ProcessingStep>("idle");
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const cleanup = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setStep("idle");
    setJob(null);
    setError(null);
    setProgress(0);
    setIsProcessing(false);
  }, [cleanup]);

  const downloadResult = useCallback(() => {
    if (job?.id && job.outputFile) {
      triggerDownload(job.id, job.outputFile).catch((err) => {
        setError(err?.message || "Failed to start download.");
      });
    }
  }, [job]);

  /**
   * Waits for a job to finish. Prefers a Server-Sent Events stream (server push,
   * live progress); if the stream can't be established or drops before the job
   * finishes, it transparently falls back to polling.
   */
  const waitForCompletion = useCallback(
    (jobId: string): Promise<Job> => {
      return new Promise<Job>((resolve, reject) => {
        let settled = false;

        const finishOk = async () => {
          if (settled) return;
          settled = true;
          cleanup();
          try {
            const data = await apiService.getJobStatus(jobId);
            setJob(data.job);
            resolve(data.job);
          } catch (e) {
            reject(e as Error);
          }
        };
        const finishFail = (msg: string) => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new Error(msg || "Processing failed."));
        };

        const startPolling = () => {
          if (settled || pollIntervalRef.current) return;
          let attempts = 0;
          pollIntervalRef.current = setInterval(async () => {
            attempts++;
            if (attempts > MAX_POLL_ATTEMPTS) {
              finishFail("Processing timeout. Please try again.");
              return;
            }
            try {
              const checkData = await apiService.getJobStatus(jobId);
              setJob(checkData.job);
              if (checkData.job.status === "COMPLETED") {
                setProgress(100);
                finishOk();
              } else if (checkData.job.status === "FAILED") {
                finishFail(checkData.job.errorMessage || "Processing failed.");
              }
            } catch (pollErr: any) {
              finishFail(pollErr?.message);
            }
          }, POLL_INTERVAL_MS);
        };

        const token = localStorage.getItem("saas_jwt_token");
        if (token && typeof EventSource !== "undefined") {
          const url = `${API_BASE_URL}/jobs/${jobId}/stream?token=${encodeURIComponent(token)}`;
          const es = new EventSource(url);
          esRef.current = es;

          const onTick = (e: MessageEvent) => {
            try {
              const d = JSON.parse(e.data);
              if (typeof d.progress === "number") setProgress(d.progress);
            } catch {
              /* ignore */
            }
          };
          es.addEventListener("status", onTick as EventListener);
          es.addEventListener("progress", onTick as EventListener);
          es.addEventListener("done", ((e: MessageEvent) => {
            try {
              const d = JSON.parse(e.data);
              if (d.status === "COMPLETED") {
                setProgress(100);
                finishOk();
              } else {
                finishFail(d.errorMessage || "Processing failed.");
              }
            } catch {
              finishFail("Processing failed.");
            }
          }) as EventListener);
          es.addEventListener("timeout", (() => {
            es.close();
            startPolling();
          }) as EventListener);
          es.onerror = () => {
            // Stream dropped before completion — fall back to polling.
            es.close();
            esRef.current = null;
            startPolling();
          };
        } else {
          startPolling();
        }
      });
    },
    [cleanup]
  );

  const processFiles = useCallback(
    async (
      tool: string,
      uploadedKeys: string[],
      options: Record<string, any>
    ): Promise<Job> => {
      setIsProcessing(true);
      setError(null);
      setProgress(0);
      setStep("queue");

      try {
        const jobResponse = await apiService.createJob(tool, uploadedKeys, options);
        const jobId = jobResponse.job.id;
        setJob(jobResponse.job);
        setStep("poll");

        const finishedJob = await waitForCompletion(jobId);

        setStep("done");
        setJob(finishedJob);

        // Auto-download via signed URL (best-effort; user can retry from the UI).
        if (finishedJob.outputFile) {
          await triggerDownload(finishedJob.id, finishedJob.outputFile).catch(
            () => undefined
          );
        }

        return finishedJob;
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred.");
        setStep("failed");
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [waitForCompletion]
  );

  return {
    step,
    job,
    error,
    progress,
    isProcessing,
    processFiles,
    reset,
    downloadResult,
  };
}
