import { useState, useCallback, useRef } from "react";
import { apiService } from "@/services/api";
import type { Job } from "@/services/api";
import type { ProcessingStep } from "@/lib/design-tokens";
import { S3_BASE_URL, MAX_POLL_ATTEMPTS, POLL_INTERVAL_MS } from "@/lib/design-tokens";

interface UseJobProcessorResult {
  step: ProcessingStep;
  job: Job | null;
  error: string | null;
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
  const [isProcessing, setIsProcessing] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setStep("idle");
    setJob(null);
    setError(null);
    setIsProcessing(false);
  }, [cleanup]);

  const downloadResult = useCallback(() => {
    if (job?.outputFile) {
      const downloadUrl = `${S3_BASE_URL}/${job.outputFile}`;
      const link = document.createElement("a");
      link.href = downloadUrl;
      const fileParts = job.outputFile.split("/");
      link.setAttribute("download", fileParts[fileParts.length - 1]);
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [job]);

  const processFiles = useCallback(async (
    tool: string,
    uploadedKeys: string[],
    options: Record<string, any>
  ): Promise<Job> => {
    setIsProcessing(true);
    setError(null);
    setStep("queue");

    try {
      const jobResponse = await apiService.createJob(tool, uploadedKeys, options);
      const jobId = jobResponse.job.id;
      setJob(jobResponse.job);
      setStep("poll");

      // Poll for completion
      const finishedJob = await new Promise<Job>((resolve, reject) => {
        let attempts = 0;

        pollIntervalRef.current = setInterval(async () => {
          attempts++;
          if (attempts > MAX_POLL_ATTEMPTS) {
            cleanup();
            reject(new Error("Processing timeout. Please try again."));
            return;
          }

          try {
            const checkData = await apiService.getJobStatus(jobId);
            setJob(checkData.job);

            if (checkData.job.status === "COMPLETED") {
              cleanup();
              resolve(checkData.job);
            } else if (checkData.job.status === "FAILED") {
              cleanup();
              reject(new Error(checkData.job.errorMessage || "Processing failed."));
            }
          } catch (pollErr: any) {
            cleanup();
            reject(pollErr);
          }
        }, POLL_INTERVAL_MS);
      });

      setStep("done");
      setJob(finishedJob);

      // Auto-download
      if (finishedJob.outputFile) {
        const downloadUrl = `${S3_BASE_URL}/${finishedJob.outputFile}`;
        const link = document.createElement("a");
        link.href = downloadUrl;
        const fileParts = finishedJob.outputFile.split("/");
        link.setAttribute("download", fileParts[fileParts.length - 1]);
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      return finishedJob;
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setStep("failed");
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [cleanup]);

  return {
    step,
    job,
    error,
    isProcessing,
    processFiles,
    reset,
    downloadResult,
  };
}
