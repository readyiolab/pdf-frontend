import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { lettersApi } from "@/services/lettersApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { apiService } from "@/services/api";

function orgId() {
  return localStorage.getItem("letter_org_id") || "";
}

export default function BrandProfilesPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "Default brand",
    signatoryName: "",
    signatoryDesignation: "",
    footerText: "",
    defaultFont: "Inter",
    logoKey: "" as string | null,
    letterheadKey: "" as string | null,
  });
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    let id = orgId();
    if (!id) {
      const boot = await lettersApi.bootstrap();
      id = boot.org.organization.id;
      localStorage.setItem("letter_org_id", id);
    }
    const { brands: list } = await lettersApi.listBrands(id);
    setBrands(list);
  };

  useEffect(() => {
    reload().catch((e) => toast.error(e.message));
  }, []);

  const uploadAsset = async (file: File, kind: "logo" | "letterhead") => {
    const { uploadUrl, fileKey } = (await apiService.getPresignedUrl(
      file.name,
      file.type || "application/octet-stream",
      file.size
    )) as { uploadUrl: string; fileKey: string };
    await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    setForm((f) => ({
      ...f,
      [kind === "logo" ? "logoKey" : "letterheadKey"]: fileKey,
    }));
    toast.success(`${kind} uploaded`);
  };

  const save = async () => {
    setSaving(true);
    try {
      await lettersApi.createBrand(orgId(), form);
      toast.success("Brand profile saved");
      setForm({
        name: "Default brand",
        signatoryName: "",
        signatoryDesignation: "",
        footerText: "",
        defaultFont: "Inter",
        logoKey: null,
        letterheadKey: null,
      });
      await reload();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/letters/studio" className="text-xs text-muted-foreground hover:underline">
            ← Letter Studio
          </Link>
          <h1 className="text-xl font-bold">Brand profiles</h1>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Profile name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Default font</Label>
            <Input
              value={form.defaultFont}
              onChange={(e) => setForm({ ...form, defaultFont: e.target.value })}
            />
          </div>
          <div>
            <Label>Signatory name</Label>
            <Input
              value={form.signatoryName}
              onChange={(e) => setForm({ ...form, signatoryName: e.target.value })}
            />
          </div>
          <div>
            <Label>Designation</Label>
            <Input
              value={form.signatoryDesignation}
              onChange={(e) => setForm({ ...form, signatoryDesignation: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label>Footer text</Label>
          <Textarea
            value={form.footerText}
            onChange={(e) => setForm({ ...form, footerText: e.target.value })}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="cursor-pointer text-sm">
            <span className="rounded-full border px-3 py-1.5 hover:bg-muted">Upload logo</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadAsset(e.target.files[0], "logo")}
            />
          </label>
          <label className="cursor-pointer text-sm">
            <span className="rounded-full border px-3 py-1.5 hover:bg-muted">Upload letterhead</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadAsset(e.target.files[0], "letterhead")}
            />
          </label>
          {form.logoKey && <span className="text-xs text-muted-foreground">Logo ready</span>}
          {form.letterheadKey && (
            <span className="text-xs text-muted-foreground">Letterhead ready</span>
          )}
        </div>
        <Button onClick={save} disabled={saving} className="rounded-full">
          {saving ? "Saving…" : "Save brand profile"}
        </Button>
      </div>

      <div className="divide-y rounded-xl border">
        {brands.map((b) => (
          <div key={b.id} className="px-4 py-3 text-sm">
            <div className="font-medium">{b.name}</div>
            <div className="text-xs text-muted-foreground">
              {b.signatoryName || "No signatory"} · {b.defaultFont}
            </div>
          </div>
        ))}
        {brands.length === 0 && (
          <div className="px-4 py-6 text-sm text-muted-foreground">No brand profiles yet.</div>
        )}
      </div>
    </div>
  );
}
