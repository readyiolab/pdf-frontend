import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StudioPageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-5",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="font-heading text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function StudioPrimaryButton({
  children,
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className={cn(
        "h-10 rounded-xl bg-indigo-600 transition-colors duration-150 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500/40",
        className
      )}
    >
      {children}
    </Button>
  );
}

/** Shared body padding for studio pages (non-flush layouts). */
export function StudioPageBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-4 p-4 sm:p-5", className)}>{children}</div>;
}

export function StudioSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-slate-100", className || "h-24")}
      aria-hidden
    />
  );
}

