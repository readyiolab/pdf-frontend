import { AlertCircle, AlertTriangle, Info, RefreshCw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DiagramIssue } from "@/services/diagramsApi";

type Props = {
  open: boolean;
  issues: DiagramIssue[];
  onClose: () => void;
  onFocus: (nodeIds: string[]) => void;
  onRerun?: () => void;
  className?: string;
};

const severityMeta = {
  error: {
    label: "Error",
    icon: AlertCircle,
    badge: "destructive" as const,
    tone: "border-[#fecaca] bg-[#fef2f2]",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    badge: "outline" as const,
    tone: "border-[#fde68a] bg-[#fffbeb]",
  },
  info: {
    label: "Info",
    icon: Info,
    badge: "secondary" as const,
    tone: "border-[#bfdbfe] bg-[#eff6ff]",
  },
};

export function AnalyzePanel({
  open,
  issues,
  onClose,
  onFocus,
  onRerun,
  className,
}: Props) {
  if (!open) return null;

  return (
    <aside
      className={cn(
        "flex h-full w-[280px] shrink-0 flex-col border-l border-[#cfd8e3] bg-[#f8fafc]",
        className
      )}
    >
      <header className="flex h-11 items-center justify-between border-b border-[#e2e8f0] px-3">
        <h2 className="text-sm font-semibold text-[#0f172a]">Analyze</h2>
        <div className="flex items-center gap-0.5">
          {onRerun ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onRerun}
              aria-label="Re-run analysis"
            >
              <RefreshCw className="size-3.5" />
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="icon-xs" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
        {issues.length === 0 ? (
          <p className="p-2 text-xs text-[#94a3b8]">No issues found</p>
        ) : (
          issues.map((issue, i) => {
            const meta = severityMeta[issue.severity] ?? severityMeta.info;
            const Icon = meta.icon;
            return (
              <button
                key={`${issue.kind}-${i}`}
                type="button"
                className={cn(
                  "w-full rounded-md border p-2.5 text-left transition hover:shadow-sm",
                  meta.tone
                )}
                onClick={() => onFocus(issue.nodeIds ?? [])}
              >
                <div className="mb-1 flex items-center gap-1.5">
                  <Icon className="size-3.5 shrink-0 text-[#475569]" />
                  <Badge variant={meta.badge} className="h-5 text-[10px]">
                    {meta.label}
                  </Badge>
                  <span className="truncate text-[10px] uppercase tracking-wide text-[#94a3b8]">
                    {issue.kind}
                  </span>
                </div>
                <p className="text-xs leading-snug text-[#334155]">{issue.message}</p>
                {(issue.nodeIds?.length ?? 0) > 0 ? (
                  <p className="mt-1 text-[10px] text-[#64748b]">
                    Focus {issue.nodeIds!.length} node
                    {issue.nodeIds!.length === 1 ? "" : "s"}
                  </p>
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
