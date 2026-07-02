import React from "react";
import { Download, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";


interface SuccessScreenProps {
  fileName?: string;
  fileSize?: number;
  downloadUrl?: string;
  onDownload?: () => void;
  onProcessAnother?: () => void;
  className?: string;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({
  fileName,
  downloadUrl,
  onDownload,
  onProcessAnother,
  className,
}) => {
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else if (downloadUrl) {
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", fileName || "result");
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center animate-fade-in-up", className)}>
      {/* Animated checkmark */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-pulse-ring" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/25">
          <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 48,
                strokeDashoffset: 0,
                animation: "checkmark-draw 0.5s ease-out 0.2s both",
              }}
            />
          </svg>
        </div>
      </div>

      {/* Success message */}
      <h3 className="text-lg font-bold text-foreground mb-1">
        Processing Complete!
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        Your file has been processed successfully and is ready for download.
      </p>

      {/* File info */}
      {fileName && (
        <div className="mb-6 rounded-xl border bg-muted/50 px-4 py-3 max-w-sm w-full">
          <p className="text-xs font-semibold text-foreground truncate">{fileName}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        {(downloadUrl || onDownload) && (
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all hover:shadow-md active:scale-[0.98]"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        )}
        {onProcessAnother && (
          <button
            type="button"
            onClick={onProcessAnother}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-all active:scale-[0.98]"
          >
            Process Another
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
