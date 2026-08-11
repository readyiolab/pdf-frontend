import { useEffect, useState } from "react";
import { GitCompare, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { diagramsApi } from "@/services/diagramsApi";

type VersionRow = {
  id: string;
  version: number;
  createdAt: string;
  createdBy: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  diagramId: string;
  currentVersion?: number | null;
  onRestore: (version: number) => void;
  className?: string;
};

export function VersionHistoryPanel({
  open,
  onClose,
  organizationId,
  diagramId,
  currentVersion,
  onRestore,
  className,
}: Props) {
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [diffSummary, setDiffSummary] = useState<string | null>(null);
  const [diffBusy, setDiffBusy] = useState(false);

  useEffect(() => {
    if (!open || !diagramId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDiffSummary(null);
    setSelected([]);
    void diagramsApi
      .listVersions(organizationId, diagramId)
      .then((res) => {
        if (!cancelled) setVersions(res.versions ?? []);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load versions");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, organizationId, diagramId]);

  const toggleSelect = (version: number) => {
    setSelected((prev) => {
      if (prev.includes(version)) return prev.filter((v) => v !== version);
      if (prev.length >= 2) return [prev[1]!, version];
      return [...prev, version];
    });
    setDiffSummary(null);
  };

  const runDiff = async () => {
    if (selected.length !== 2) return;
    const [a, b] = [...selected].sort((x, y) => x - y);
    setDiffBusy(true);
    setDiffSummary(null);
    try {
      const { summary } = await diagramsApi.aiDiffSummary(
        organizationId,
        diagramId,
        a!,
        b!
      );
      setDiffSummary(summary);
    } catch (e) {
      setDiffSummary(e instanceof Error ? e.message : "Diff summary failed");
    } finally {
      setDiffBusy(false);
    }
  };

  if (!open) return null;

  return (
    <aside
      className={cn(
        "flex h-full w-[300px] shrink-0 flex-col border-l border-[#cfd8e3] bg-[#f8fafc]",
        className
      )}
    >
      <header className="flex h-11 items-center justify-between border-b border-[#e2e8f0] px-3">
        <h2 className="text-sm font-semibold text-[#0f172a]">Version history</h2>
        <Button type="button" variant="ghost" size="icon-xs" onClick={onClose} aria-label="Close">
          <X className="size-4" />
        </Button>
      </header>

      <div className="flex items-center gap-1.5 border-b border-[#e2e8f0] px-3 py-2">
        <Button
          type="button"
          size="xs"
          variant="outline"
          className="rounded-md gap-1"
          disabled={selected.length !== 2 || diffBusy}
          onClick={() => void runDiff()}
        >
          {diffBusy ? <Spinner className="size-3" /> : <Sparkles className="size-3" />}
          AI diff
        </Button>
        <span className="text-[10px] text-[#94a3b8]">
          {selected.length === 2
            ? `v${Math.min(...selected)} → v${Math.max(...selected)}`
            : "Select two versions"}
        </span>
      </div>

      {diffSummary ? (
        <div className="mx-3 mt-2 rounded-md border border-[#e2e8f0] bg-white p-2 text-xs text-[#334155]">
          {diffSummary}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-[#64748b]">
            <Spinner className="size-4" />
            Loading…
          </div>
        ) : error ? (
          <p className="p-2 text-xs text-destructive">{error}</p>
        ) : versions.length === 0 ? (
          <p className="p-2 text-xs text-[#94a3b8]">No versions yet</p>
        ) : (
          <ul className="space-y-1">
            {versions.map((v) => {
              const checked = selected.includes(v.version);
              const isCurrent = currentVersion === v.version;
              return (
                <li
                  key={v.id}
                  className={cn(
                    "rounded-md border bg-white p-2",
                    checked ? "border-[#93c5fd]" : "border-[#e2e8f0]"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-3.5"
                      checked={checked}
                      onChange={() => toggleSelect(v.version)}
                      aria-label={`Select version ${v.version}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#0f172a]">
                          v{v.version}
                        </span>
                        {isCurrent ? (
                          <span className="rounded bg-[#dbeafe] px-1.5 py-0.5 text-[10px] text-[#1d4ed8]">
                            Current
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-[10px] text-[#94a3b8]" title={v.id}>
                        {v.id}
                      </p>
                      <p className="text-[11px] text-[#64748b]">
                        {formatDate(v.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-1">
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      className="rounded-md gap-1"
                      onClick={() => onRestore(v.version)}
                    >
                      <RotateCcw className="size-3" />
                      Restore
                    </Button>
                    {selected.length === 1 && selected[0] !== v.version ? (
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        className="rounded-md gap-1"
                        onClick={() => toggleSelect(v.version)}
                      >
                        <GitCompare className="size-3" />
                        Compare
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}
