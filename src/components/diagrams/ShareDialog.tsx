import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { diagramsApi, type DiagramShare } from "@/services/diagramsApi";

type Props = {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  diagramId: string;
};

export function ShareDialog({ open, onClose, organizationId, diagramId }: Props) {
  const [shares, setShares] = useState<DiagramShare[]>([]);
  const [role, setRole] = useState<"VIEW" | "EDIT">("VIEW");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await diagramsApi.listShares(organizationId, diagramId);
        if (!cancelled) setShares(res.shares.filter((s) => !s.revokedAt));
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load shares");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, organizationId, diagramId]);

  if (!open) return null;

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const { share } = await diagramsApi.createShare(organizationId, diagramId, role);
      setShares((prev) => [share, ...prev]);
    } catch (e: any) {
      setError(e?.message || "Could not create share link");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (shareId: string) => {
    await diagramsApi.revokeShare(organizationId, shareId);
    setShares((prev) => prev.filter((s) => s.id !== shareId));
  };

  const shareUrl = (token: string) => `${window.location.origin}/diagrams/shared/${token}`;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Share diagram</h2>
          <button type="button" className="text-sm text-[#64748b]" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mb-4 flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Permission</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "VIEW" | "EDIT")}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="VIEW">View only</option>
              <option value="EDIT">Can edit</option>
            </select>
          </div>
          <Button onClick={create} disabled={busy} className="rounded-lg">
            {busy ? <Spinner className="size-4" /> : "Create link"}
          </Button>
        </div>

        {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : (
          <ul className="max-h-56 space-y-2 overflow-y-auto">
            {shares.length === 0 && (
              <li className="text-xs text-muted-foreground">No active share links.</li>
            )}
            {shares.map((s) => (
              <li key={s.id} className="rounded-lg border border-[#e2e8f0] p-2">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{s.role}</span>
                  <button
                    type="button"
                    className="text-destructive"
                    onClick={() => revoke(s.id)}
                  >
                    Revoke
                  </button>
                </div>
                <div className="flex gap-1">
                  <Input readOnly value={shareUrl(s.token)} className="h-8 rounded-md text-[11px]" />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-md"
                    onClick={async () => {
                      await navigator.clipboard.writeText(shareUrl(s.token));
                      setCopied(s.id);
                      setTimeout(() => setCopied(null), 1500);
                    }}
                  >
                    {copied === s.id ? "Copied" : "Copy"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
