import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { apiService } from "@/services/api";
import { StudioPageHeader } from "@/components/letters/StudioPageHeader";
import { ImageIcon, Trash2 } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { useBrands, useCreateBrand } from "@/features/letters";

export default function BrandProfilesPage() {
  const { user } = useAuth();
  const brandsQuery = useBrands(user?.id);
  const createBrand = useCreateBrand(user?.id);
  const brands = brandsQuery.data?.brands ?? [];

  const [form, setForm] = useState({
    name: "Default brand",
    signatoryName: "",
    signatoryDesignation: "",
    footerText: "",
    defaultFont: "Georgia",
    logoKey: "" as string | null,
    letterheadKey: "" as string | null,
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [letterheadPreview, setLetterheadPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"logo" | "letterhead" | null>(null);

  useEffect(() => {
    if (brandsQuery.error) {
      toast.error(
        brandsQuery.error instanceof Error ? brandsQuery.error.message : "Failed to load brands"
      );
    }
  }, [brandsQuery.error]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      if (letterheadPreview) URL.revokeObjectURL(letterheadPreview);
    };
  }, [logoPreview, letterheadPreview]);

  const resetForm = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    if (letterheadPreview) URL.revokeObjectURL(letterheadPreview);
    setLogoPreview(null);
    setLetterheadPreview(null);
    setForm({
      name: "Default brand",
      signatoryName: "",
      signatoryDesignation: "",
      footerText: "",
      defaultFont: "Georgia",
      logoKey: null,
      letterheadKey: null,
    });
  };

  const uploadAsset = async (file: File, kind: "logo" | "letterhead") => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image (PNG or JPG). PDF is not supported here.");
      return;
    }
    setUploading(kind);
    try {
      const previewUrl = URL.createObjectURL(file);
      if (kind === "logo") {
        if (logoPreview) URL.revokeObjectURL(logoPreview);
        setLogoPreview(previewUrl);
      } else {
        if (letterheadPreview) URL.revokeObjectURL(letterheadPreview);
        setLetterheadPreview(previewUrl);
      }

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
      toast.success(`${kind === "logo" ? "Logo" : "Letterhead"} uploaded — preview shown below`);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const clearAsset = (kind: "logo" | "letterhead") => {
    if (kind === "logo") {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogoPreview(null);
      setForm((f) => ({ ...f, logoKey: null }));
    } else {
      if (letterheadPreview) URL.revokeObjectURL(letterheadPreview);
      setLetterheadPreview(null);
      setForm((f) => ({ ...f, letterheadKey: null }));
    }
  };

  const save = async () => {
    try {
      await createBrand.mutateAsync(form);
      toast.success("Brand profile saved");
      resetForm();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const saving = createBrand.isPending;

  return (
    <div className="flex min-h-full flex-col">
      <StudioPageHeader
        title="Company look"
        description="Add logo and signatory so letters look official (you can skip and add later). Images only (PNG/JPG) — not PDF."
      />
      <div className="grid flex-1 gap-0 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5 border-b border-slate-200 p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Company / brand name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Acme Pvt Ltd"
              />
            </div>
            <div>
              <Label>Font</Label>
              <select
                className="mt-0 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={form.defaultFont}
                onChange={(e) => setForm({ ...form, defaultFont: e.target.value })}
              >
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                <option value="Inter">Inter</option>
              </select>
            </div>
            <div>
              <Label>Who signs the letter</Label>
              <Input
                value={form.signatoryName}
                onChange={(e) => setForm({ ...form, signatoryName: e.target.value })}
                placeholder="Alok Kumar"
              />
            </div>
            <div>
              <Label>Their designation</Label>
              <Input
                value={form.signatoryDesignation}
                onChange={(e) =>
                  setForm({ ...form, signatoryDesignation: e.target.value })
                }
                placeholder="HR Manager"
              />
            </div>
          </div>
          <div>
            <Label>Footer text (optional)</Label>
            <Textarea
              value={form.footerText}
              onChange={(e) => setForm({ ...form, footerText: e.target.value })}
              placeholder="Confidential — for the named employee only"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <UploadPreviewCard
              title="Company logo"
              hint="PNG or JPG — shown at the top of every letter"
              previewUrl={logoPreview}
              ready={!!form.logoKey}
              uploading={uploading === "logo"}
              onPick={(file) => uploadAsset(file, "logo")}
              onClear={() => clearAsset("logo")}
            />
            <UploadPreviewCard
              title="Letterhead image"
              hint="Optional PNG/JPG banner — not a PDF file"
              previewUrl={letterheadPreview}
              ready={!!form.letterheadKey}
              uploading={uploading === "letterhead"}
              onPick={(file) => uploadAsset(file, "letterhead")}
              onClear={() => clearAsset("letterhead")}
            />
          </div>

          <Button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? "Saving…" : "Save brand profile"}
          </Button>
        </div>

        <div className="bg-[var(--studio-paper,#F4F6F8)]">
          <div className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Your company looks
          </div>
          <div className="grid gap-2 p-3 sm:grid-cols-1">
            {brands.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {b.name?.slice(0, 2) || "BR"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-900">{b.name}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {b.signatoryName || "No signatory"}
                      {b.signatoryDesignation ? ` · ${b.signatoryDesignation}` : ""}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] font-medium">
                      {b.logoKey ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                          Logo
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                          No logo
                        </span>
                      )}
                      {b.letterheadKey ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                          Letterhead
                        </span>
                      ) : null}
                      {b.defaultFont ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                          {b.defaultFont}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {brands.length === 0 && (
              <div className="px-2 py-8 text-center text-sm text-slate-500">
                No company look yet. Add logo and signatory, then click Save — or skip and do this
                later when you send letters.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadPreviewCard({
  title,
  hint,
  previewUrl,
  ready,
  uploading,
  onPick,
  onClear,
}: {
  title: string;
  hint: string;
  previewUrl: string | null;
  ready: boolean;
  uploading: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{hint}</p>
        </div>
        {ready && (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            Ready
          </span>
        )}
      </div>

      <div className="mt-3 flex min-h-[120px] items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-200 bg-slate-50">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={`${title} preview`}
            className="max-h-36 max-w-full object-contain p-2"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 px-3 py-6 text-center text-slate-400">
            <ImageIcon className="size-8 opacity-60" />
            <span className="text-xs">No image yet</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <label className="cursor-pointer">
          <span className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            {uploading ? "Uploading…" : previewUrl ? "Change image" : "Choose image"}
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPick(f);
              e.target.value = "";
            }}
          />
        </label>
        {previewUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-lg text-xs text-slate-500"
            onClick={onClear}
          >
            <Trash2 className="mr-1 size-3.5" />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
