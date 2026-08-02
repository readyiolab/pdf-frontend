import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Server,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { ProviderLogo } from "@/components/byoc/ProviderLogo";
import type { ProviderLogoId } from "@/components/byoc/motion";

type Provider = "PLATFORM" | "AWS_S3" | "AZURE_BLOB" | "GCS" | "R2" | "MINIO";

const PROVIDERS: {
  id: Provider;
  name: string;
  blurb: string;
  logo?: ProviderLogoId;
}[] = [
  { id: "AWS_S3", name: "Amazon S3", blurb: "Standard S3 buckets", logo: "AWS" },
  { id: "R2", name: "Cloudflare R2", blurb: "S3-compatible R2", logo: "R2" },
  { id: "AZURE_BLOB", name: "Azure Blob", blurb: "Azure storage containers", logo: "Azure" },
  { id: "GCS", name: "Google Cloud", blurb: "GCS via HMAC keys", logo: "GCS" },
  { id: "MINIO", name: "MinIO", blurb: "Self-hosted S3 API", logo: "MinIO" },
  { id: "PLATFORM", name: "Platform storage", blurb: "Use Zuvigo Spaces" },
];

type StorageStatus = {
  provider: Provider;
  bucket: string | null;
  region: string | null;
  endpoint: string | null;
  status: string;
  lastTestedAt: string | null;
  lastError: string | null;
  hasSecret: boolean;
};

export default function CloudStorageSettings() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [orgName, setOrgName] = useState("");
  const [provider, setProvider] = useState<Provider>("AWS_S3");
  const [bucket, setBucket] = useState("");
  const [region, setRegion] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [connectionString, setConnectionString] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountKey, setAccountKey] = useState("");
  const [busy, setBusy] = useState<"load" | "test" | "save" | "reset" | null>("load");
  const [audit, setAudit] = useState<any[]>([]);
  const [corsConfig, setCorsConfig] = useState<string | null>(null);
  const [corsOk, setCorsOk] = useState<boolean | null>(null);
  const [lastTestMessage, setLastTestMessage] = useState<string | null>(null);

  const isEnterprise = user?.plan === "ENTERPRISE";

  const load = useCallback(async () => {
    setBusy("load");
    try {
      const orgRes = await apiService.getEnterpriseOrganization();
      setOrgName(orgRes.data.organization.name);
      setStorage(orgRes.data.storage);
      const p = orgRes.data.storage.provider as Provider;
      setProvider(p === "PLATFORM" ? "AWS_S3" : p);
      setBucket(orgRes.data.storage.bucket || "");
      setRegion(orgRes.data.storage.region || "");
      setEndpoint(orgRes.data.storage.endpoint || "");
      const auditRes = await apiService.getEnterpriseAudit(20);
      setAudit(auditRes.data.entries || []);
    } catch (err: any) {
      toast.error(err.message || "Could not load cloud storage settings");
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!loading && user && isEnterprise) void load();
  }, [loading, user, isEnterprise, load]);

  const credentialsPayload = useMemo(() => {
    if (provider === "PLATFORM") return undefined;
    if (provider === "AZURE_BLOB") {
      if (connectionString.trim()) return { connectionString: connectionString.trim() };
      if (accountName.trim() && accountKey.trim()) {
        return { accountName: accountName.trim(), accountKey: accountKey.trim() };
      }
      return undefined;
    }
    if (accessKeyId.trim() && secretAccessKey.trim()) {
      return {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
      };
    }
    return undefined;
  }, [provider, connectionString, accountName, accountKey, accessKeyId, secretAccessKey]);

  const bodyFor = (p: Provider) => ({
    provider: p,
    bucket: bucket.trim() || undefined,
    region: region.trim() || undefined,
    endpoint: endpoint.trim() || undefined,
    credentials: credentialsPayload,
    useSavedSecrets: !credentialsPayload && storage?.hasSecret,
  });

  const onTest = async () => {
    setBusy("test");
    setCorsConfig(null);
    setCorsOk(null);
    setLastTestMessage(null);
    try {
      const res = await apiService.testEnterpriseStorage(bodyFor(provider));
      const data = res.data || res;
      setCorsOk(Boolean(data.corsOk));
      setCorsConfig(data.requiredCorsConfig || null);
      setLastTestMessage(data.message || null);
      if (data.reachable && data.canWrite && data.corsOk) {
        toast.success(data.message || "Connection successful");
      } else if (data.reachable && data.canWrite) {
        toast.warning(data.message || "Connected, but CORS needs fixing before Save");
      } else {
        toast.error(data.message || "Connection test failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Connection test failed");
    } finally {
      setBusy(null);
    }
  };

  const onSave = async () => {
    if (provider !== "PLATFORM" && corsOk === false) {
      toast.error("Fix bucket CORS (use Test connection), then Save.");
      return;
    }
    setBusy("save");
    try {
      const res = await apiService.saveEnterpriseStorage(bodyFor(provider));
      setStorage(res.data);
      setAccessKeyId("");
      setSecretAccessKey("");
      setConnectionString("");
      setAccountKey("");
      toast.success("Cloud storage saved");
      void load();
    } catch (err: any) {
      toast.error(err.message || "Could not save storage settings");
    } finally {
      setBusy(null);
    }
  };

  const onReset = async () => {
    setBusy("reset");
    try {
      const res = await apiService.resetEnterpriseStorage();
      setStorage(res.data);
      toast.success("Switched back to platform storage");
      void load();
    } catch (err: any) {
      toast.error(err.message || "Could not reset storage");
    } finally {
      setBusy(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!isEnterprise) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center animate-fade-in">
        <Cloud className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight">Cloud storage</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bring-your-own-cloud storage is available on the Enterprise plan. Your files would stay in
          your bucket — we only keep metadata.
        </p>
        <Button className="mt-6" onClick={() => navigate("/billing")}>
          View plans
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-8 animate-fade-in">
      <button
        type="button"
        onClick={() => navigate("/profile")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to account
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Cloud storage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your own S3-compatible or Azure bucket for {orgName || "your organization"}.
          Credentials are encrypted at rest and never shown again.
        </p>
      </div>

      {storage && (
        <div
          className={cn(
            "mb-6 flex items-start gap-3 rounded-2xl border p-4",
            storage.status === "CONNECTED" && "border-emerald-500/30 bg-emerald-500/5",
            storage.status === "ERROR" && "border-destructive/30 bg-destructive/5",
            storage.status === "UNCONFIGURED" && "bg-muted/40"
          )}
        >
          {storage.status === "CONNECTED" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
          ) : storage.status === "ERROR" ? (
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
          ) : (
            <Server className="mt-0.5 h-5 w-5 text-muted-foreground" />
          )}
          <div className="text-sm">
            <p className="font-semibold">
              Status: {storage.status}
              {storage.provider !== "PLATFORM" ? ` · ${storage.provider}` : " · Platform"}
            </p>
            {storage.bucket && (
              <p className="text-muted-foreground">
                Bucket: {storage.bucket}
                {storage.region ? ` · ${storage.region}` : ""}
              </p>
            )}
            {storage.lastError && <p className="mt-1 text-destructive">{storage.lastError}</p>}
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setProvider(p.id)}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors",
              provider === p.id
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "hover:bg-muted/50"
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              {p.logo ? (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-border">
                  <ProviderLogo id={p.logo} />
                </span>
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Server className="h-4 w-4 text-muted-foreground" />
                </span>
              )}
              <p className="text-sm font-semibold">{p.name}</p>
            </div>
            <p className="text-xs text-muted-foreground">{p.blurb}</p>
          </button>
        ))}
      </div>

      {provider !== "PLATFORM" && (
        <div className="mb-6 space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>{provider === "AZURE_BLOB" ? "Container name" : "Bucket name"}</Label>
              <Input value={bucket} onChange={(e: ChangeEvent<HTMLInputElement>) => setBucket(e.target.value)} placeholder="my-pdf-bucket" />
            </div>
            {provider !== "AZURE_BLOB" && (
              <>
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Input
                    value={region}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setRegion(e.target.value)}
                    placeholder={provider === "R2" ? "auto" : "us-east-1"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Endpoint {provider === "AWS_S3" ? "(optional)" : ""}</Label>
                  <Input
                    value={endpoint}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEndpoint(e.target.value)}
                    placeholder={
                      provider === "R2"
                        ? "https://<accountid>.r2.cloudflarestorage.com"
                        : provider === "GCS"
                          ? "https://storage.googleapis.com"
                          : "https://minio.example.com"
                    }
                  />
                </div>
              </>
            )}
          </div>

          {provider === "AZURE_BLOB" ? (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Connection string (preferred)</Label>
                <Input
                  type="password"
                  value={connectionString}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setConnectionString(e.target.value)}
                  placeholder={storage?.hasSecret ? "•••• saved — leave blank to keep" : "DefaultEndpointsProtocol=…"}
                />
              </div>
              <p className="text-xs text-muted-foreground">Or use account name + key:</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Account name</Label>
                  <Input value={accountName} onChange={(e: ChangeEvent<HTMLInputElement>) => setAccountName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Account key</Label>
                  <Input
                    type="password"
                    value={accountKey}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setAccountKey(e.target.value)}
                    placeholder={storage?.hasSecret ? "•••• saved" : ""}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Access key ID {provider === "GCS" ? "(HMAC)" : ""}</Label>
                <Input
                  value={accessKeyId}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setAccessKeyId(e.target.value)}
                  placeholder={storage?.hasSecret ? "•••• saved — leave blank to keep" : ""}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label>Secret access key</Label>
                <Input
                  type="password"
                  value={secretAccessKey}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSecretAccessKey(e.target.value)}
                  placeholder={storage?.hasSecret ? "•••• saved" : ""}
                  autoComplete="off"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-10 flex flex-wrap gap-3">
        {provider !== "PLATFORM" && (
          <Button variant="outline" disabled={!!busy} onClick={onTest}>
            {busy === "test" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Test connection
          </Button>
        )}
        <Button
          disabled={!!busy || (provider !== "PLATFORM" && corsOk === false)}
          onClick={provider === "PLATFORM" ? onReset : onSave}
        >
          {busy === "save" || busy === "reset" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {provider === "PLATFORM" ? "Use platform storage" : "Save"}
        </Button>
        {storage?.provider !== "PLATFORM" && provider !== "PLATFORM" && (
          <Button variant="ghost" disabled={!!busy} onClick={onReset}>
            Disconnect cloud storage
          </Button>
        )}
      </div>

      {corsConfig && (
        <div className="mb-10 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-bold">
            {corsOk ? "CORS verified" : "Apply this CORS config to your bucket"}
          </h2>
          {lastTestMessage && (
            <p className="mb-3 text-sm text-muted-foreground">{lastTestMessage}</p>
          )}
          {!corsOk && (
            <p className="mb-3 text-sm text-muted-foreground">
              Browser uploads PUT directly to your bucket. Without CORS allowing your app origin,
              every upload fails. Paste this into your bucket/account CORS settings, then Test again.
            </p>
          )}
          <pre className="max-h-64 overflow-auto rounded-lg bg-muted/60 p-3 text-xs">
            {corsConfig}
          </pre>
          <Button
            className="mt-3"
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(corsConfig);
              toast.success("CORS config copied");
            }}
          >
            Copy CORS config
          </Button>
        </div>
      )}

      {audit.length > 0 && (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Recent activity</h2>
          <ul className="space-y-3 text-sm">
            {audit.map((e) => (
              <li key={e.id} className="flex justify-between gap-4 border-b border-border/60 pb-2 last:border-0">
                <div>
                  <p className="font-medium">{e.action}</p>
                  {e.detail && <p className="text-muted-foreground">{e.detail}</p>}
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {e.createdAt ? new Date(e.createdAt).toLocaleString() : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
