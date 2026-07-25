import { useEffect, useRef, useState } from "react";
import { Check, Pen, Trash2, Type, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { SignaturePad, type SignaturePadHandle } from "@/components/signing/signature/SignaturePad";

type Mode = "draw" | "type" | "upload";

interface SignatureModalProps {
  open: boolean;
  /** INITIALS renders a smaller pad and a shorter default. */
  variant: "SIGNATURE" | "INITIALS" | "STAMP" | "IMAGE";
  signerName: string;
  onClose: () => void;
  onApply: (dataUrl: string) => void;
}

/**
 * Typeface options for a typed signature.
 *
 * Rendered to a canvas with the browser's own fonts, so what the signer sees is
 * exactly the PNG we upload — no server-side font substitution to disagree
 * with. Each stack ends in `cursive`/`serif` so a machine missing the named
 * face still produces something signature-like rather than falling back to the
 * UI font.
 */
const TYPE_FONTS = [
  { label: "Signature", stack: "'Segoe Script', 'Brush Script MT', 'Snell Roundhand', cursive" },
  { label: "Classic", stack: "'Palatino Linotype', Palatino, 'Book Antiqua', serif" },
  { label: "Formal", stack: "'Gabriola', 'Edwardian Script ITC', 'Apple Chancery', cursive" },
];

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

/** Renders typed text to a transparent PNG at the size we want in the PDF. */
function typedSignatureToPng(text: string, fontStack: string): string | null {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx || !text.trim()) return null;

  const fontSize = 64;
  // Measure first, then size the canvas to the text — a fixed canvas would clip
  // long names and leave short ones swimming in transparent padding.
  ctx.font = `${fontSize}px ${fontStack}`;
  const metrics = ctx.measureText(text);
  const width = Math.ceil(metrics.width) + 24;
  const height = Math.ceil(fontSize * 1.6);

  canvas.width = width;
  canvas.height = height;

  // Re-set after resizing: changing canvas dimensions resets the context.
  ctx.font = `${fontSize}px ${fontStack}`;
  ctx.fillStyle = "#0f172a";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 12, height / 2);

  return canvas.toDataURL("image/png");
}

export function SignatureModal({ open, variant, signerName, onClose, onApply }: SignatureModalProps) {
  const padRef = useRef<SignaturePadHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("draw");
  const [typed, setTyped] = useState("");
  const [fontIndex, setFontIndex] = useState(0);
  const [uploaded, setUploaded] = useState<string | null>(null);
  const [padEmpty, setPadEmpty] = useState(true);

  const isInitials = variant === "INITIALS";

  useEffect(() => {
    if (!open) return;
    // Prefill from the signer's name — the overwhelmingly common case is that
    // the typed signature IS their name.
    setTyped(
      isInitials
        ? signerName.split(/\s+/).map((p) => p[0] ?? "").join("").toUpperCase().slice(0, 4)
        : signerName
    );
    setUploaded(null);
    setPadEmpty(true);
    setMode("draw");
  }, [open, signerName, isInitials]);

  // Escape closes. Signing is a modal, focused act; trapping someone in it is rude.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("That image is too large — please use one under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setUploaded(String(reader.result));
    reader.onerror = () => toast.error("Couldn't read that image.");
    reader.readAsDataURL(file);
  };

  const handleApply = () => {
    let dataUrl: string | null = null;

    if (mode === "draw") {
      dataUrl = padRef.current?.toDataURL() ?? null;
      if (!dataUrl) {
        toast.error("Please draw your signature first.");
        return;
      }
    } else if (mode === "type") {
      dataUrl = typedSignatureToPng(typed, TYPE_FONTS[fontIndex].stack);
      if (!dataUrl) {
        toast.error("Please type your name first.");
        return;
      }
    } else {
      dataUrl = uploaded;
      if (!dataUrl) {
        toast.error("Please choose an image first.");
        return;
      }
    }

    onApply(dataUrl);
    onClose();
  };

  const title = isInitials ? "Add your initials" : variant === "SIGNATURE" ? "Add your signature" : "Add an image";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Bottom sheet on mobile, centred dialog on desktop — most signatures
          are drawn on a phone, where a centred box leaves the pad under the thumb. */}
      <div className="w-full max-w-lg animate-fade-in-up rounded-t-2xl bg-card p-4 shadow-xl sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList className="w-full">
            <TabsTrigger value="draw" className="flex-1 gap-1.5">
              <Pen className="size-3.5" />
              Draw
            </TabsTrigger>
            <TabsTrigger value="type" className="flex-1 gap-1.5">
              <Type className="size-3.5" />
              Type
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex-1 gap-1.5">
              <Upload className="size-3.5" />
              Upload
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-3">
          {/* All three panes stay mounted: unmounting the pad would destroy an
              in-progress drawing the moment someone peeked at another tab. */}
          <div className={cn(mode !== "draw" && "hidden")}>
            <SignaturePad
              ref={padRef}
              className={isInitials ? "h-32" : "h-40"}
              onChange={setPadEmpty}
              aria-label={isInitials ? "Draw your initials" : "Draw your signature"}
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">Use your finger, stylus, or mouse.</p>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => padRef.current?.clear()}
                disabled={padEmpty}
              >
                <Trash2 />
                Clear
              </Button>
            </div>
          </div>

          <div className={cn("space-y-3", mode !== "type" && "hidden")}>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              maxLength={isInitials ? 6 : 60}
              placeholder={isInitials ? "AB" : "Your name"}
              aria-label="Type your signature"
            />
            <div className="space-y-1.5">
              {TYPE_FONTS.map((font, i) => (
                <button
                  key={font.label}
                  type="button"
                  onClick={() => setFontIndex(i)}
                  aria-pressed={fontIndex === i}
                  className={cn(
                    "flex h-16 w-full items-center justify-center rounded-lg border-2 bg-white px-3 transition-colors",
                    fontIndex === i ? "border-primary" : "border-border hover:border-border/80"
                  )}
                >
                  <span
                    className="truncate text-2xl text-slate-900"
                    style={{ fontFamily: font.stack }}
                  >
                    {typed || (isInitials ? "AB" : "Your name")}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className={cn(mode !== "upload" && "hidden")}>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = "";
              }}
            />
            {uploaded ? (
              <div className="space-y-2">
                <div className="flex h-40 items-center justify-center rounded-lg border border-border bg-white p-2">
                  <img src={uploaded} alt="Your uploaded signature" className="max-h-full max-w-full object-contain" />
                </div>
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="w-full">
                  Choose a different image
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border transition-colors hover:border-primary/40 hover:bg-muted/50"
              >
                <Upload className="size-5 text-muted-foreground" />
                <span className="text-sm font-medium">Choose an image</span>
                <span className="text-[11px] text-muted-foreground">PNG or JPG, up to 2MB</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 h-12 rounded-xl text-xs font-semibold border-border cursor-pointer">
            Cancel
          </Button>
          <Button onClick={handleApply} className="flex-1 h-12 rounded-xl text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-md cursor-pointer">
            <Check className="h-4 w-4 mr-1.5" />
            Apply Signature
          </Button>
        </div>

        <p className="mt-3 text-center text-[10px] leading-relaxed text-muted-foreground font-normal">
          By applying, you agree this is a legal representation of your signature for this document.
        </p>
      </div>
    </div>
  );
}
