import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/** Outlet-level fallback while a lazy route chunk loads — keeps app chrome mounted. */
export function RouteFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 animate-fade-in",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <Spinner className="h-6 w-6 text-primary" />
      <div className="mx-auto w-full max-w-md space-y-2 px-6">
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
