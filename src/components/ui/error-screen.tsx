import React from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorScreenProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  className?: string;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({
  title = "Processing Failed",
  message,
  onRetry,
  onGoBack,
  className,
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center animate-fade-in-up", className)}>
      {/* Error icon */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>

      {/* Error message */}
      <h3 className="text-lg font-bold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm leading-relaxed">
        {message}
      </p>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all active:scale-[0.98]"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        )}
        {onGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-card px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-all active:scale-[0.98]"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        )}
      </div>
    </div>
  );
};
