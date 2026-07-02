import React from "react";
import { Check, Upload, Cpu, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProcessingStep } from "@/lib/design-tokens";

interface ProcessingStepperProps {
  currentStep: ProcessingStep;
  className?: string;
}

const steps = [
  { key: "upload" as const, label: "Upload", icon: Upload },
  { key: "queue" as const, label: "Queue", icon: Cpu },
  { key: "poll" as const, label: "Process", icon: Loader2 },
  { key: "done" as const, label: "Done", icon: Download },
];

const stepOrder: ProcessingStep[] = ["upload", "queue", "poll", "done"];

function getStepStatus(stepKey: string, currentStep: ProcessingStep): "completed" | "active" | "pending" {
  const currentIndex = stepOrder.indexOf(currentStep);
  const stepIndex = stepOrder.indexOf(stepKey as ProcessingStep);
  
  if (currentStep === "failed") {
    return currentIndex >= stepIndex ? "completed" : "pending";
  }
  if (stepIndex < currentIndex) return "completed";
  if (stepIndex === currentIndex) return "active";
  return "pending";
}

export const ProcessingStepper: React.FC<ProcessingStepperProps> = ({
  currentStep,
  className,
}) => {
  if (currentStep === "idle") return null;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, i) => {
          const status = getStepStatus(step.key, currentStep);
          const Icon = step.icon;

          return (
            <React.Fragment key={step.key}>
              {/* Step circle */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-500",
                    status === "completed" && "border-emerald-500 bg-emerald-500 text-white",
                    status === "active" && "border-primary bg-primary/10 text-primary",
                    status === "pending" && "border-border bg-muted text-muted-foreground"
                  )}
                >
                  {status === "completed" ? (
                    <Check className="h-4 w-4 animate-scale-in" />
                  ) : status === "active" ? (
                    <Icon className={cn("h-4 w-4", step.key === "poll" && "animate-spin")} />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[11px] font-semibold transition-colors",
                    status === "completed" && "text-emerald-600 dark:text-emerald-400",
                    status === "active" && "text-primary font-bold",
                    status === "pending" && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="flex-1 mx-2 mb-6">
                  <div className="h-0.5 w-full rounded-full bg-border overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700 ease-out",
                        getStepStatus(steps[i + 1].key, currentStep) !== "pending"
                          ? "bg-emerald-500 w-full"
                          : getStepStatus(step.key, currentStep) === "active"
                          ? "bg-primary/50 w-1/2 animate-pulse"
                          : "w-0"
                      )}
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
