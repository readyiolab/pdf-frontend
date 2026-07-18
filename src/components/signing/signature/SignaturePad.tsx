import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import SignaturePadLib from "signature_pad";
import { cn } from "@/lib/utils";

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  /** Trimmed PNG data URL, or null when nothing has been drawn. */
  toDataURL: () => string | null;
}

interface SignaturePadProps {
  penColor?: string;
  className?: string;
  onChange?: (isEmpty: boolean) => void;
  "aria-label"?: string;
}

/**
 * Drawing surface for a hand-drawn signature.
 *
 * Wraps `signature_pad` directly rather than using `react-signature-canvas`.
 * That package is a thin wrapper around this same library, but its only
 * React-19-compatible release is `1.1.0-alpha.2`, and it depends on
 * `signature_pad@^2` — which would install a second, 2018-era copy alongside
 * the v5 we already use, plus `prop-types` and `@babel/runtime`. An alpha
 * dependency with a duplicated engine is not what belongs under a signature.
 *
 * The wrapper itself is the easy part; the parts worth getting right are the
 * HiDPI backing store and the resize behaviour, both handled below.
 */
export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
  { penColor = "#0f172a", className, onChange, "aria-label": ariaLabel = "Draw your signature" },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pad = new SignaturePadLib(canvas, {
      penColor,
      // Transparent: the signature is composited onto the PDF page, and a white
      // box would blank out whatever it is placed over.
      backgroundColor: "rgba(0,0,0,0)",
      // Tuned for a signature rather than the library's general-purpose default:
      // a slightly heavier floor keeps thin, fast strokes from disappearing.
      minWidth: 0.8,
      maxWidth: 2.4,
      // Smooths the jitter of a trackpad or an unsteady hand without turning
      // the signature into a different shape.
      velocityFilterWeight: 0.7,
    });
    padRef.current = pad;

    const handleEnd = () => {
      const empty = pad.isEmpty();
      setIsEmpty(empty);
      onChange?.(empty);
    };
    pad.addEventListener("endStroke", handleEnd);

    /**
     * Sizes the canvas backing store to the device pixel ratio.
     *
     * Without this the signature renders soft on every retina/HiDPI screen —
     * and it is then rasterized into a legal document at that softness. Note
     * resizing a canvas CLEARS it, so existing strokes are saved and restored
     * around the resize rather than being silently lost when a phone rotates.
     */
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;

      const data = pad.isEmpty() ? null : pad.toData();

      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.getContext("2d")?.scale(ratio, ratio);

      pad.clear(); // resizing already wiped the pixels; reset the library's state too
      if (data) pad.fromData(data);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      pad.removeEventListener("endStroke", handleEnd);
      pad.off(); // detach the library's own pointer listeners
      padRef.current = null;
    };
    // penColor/onChange are deliberately excluded: re-creating the pad would
    // destroy in-progress strokes. Colour is applied in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (padRef.current) padRef.current.penColor = penColor;
  }, [penColor]);

  useImperativeHandle(
    ref,
    () => ({
      clear: () => {
        padRef.current?.clear();
        setIsEmpty(true);
        onChange?.(true);
      },
      isEmpty: () => padRef.current?.isEmpty() ?? true,
      toDataURL: () => {
        const pad = padRef.current;
        if (!pad || pad.isEmpty()) return null;
        // Trimmed to the ink's bounding box. An untrimmed export is mostly
        // transparent padding, which would make the stamped signature float
        // arbitrarily inside its field box instead of filling it.
        return trimToInk(pad.toDataURL("image/png"), canvasRef.current!);
      },
    }),
    [onChange]
  );

  return (
    <div className={cn("relative", className)}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel}
        className="h-full w-full touch-none rounded-lg border border-border bg-white"
        // touch-none is required: without it the browser scrolls the page
        // instead of delivering pointer events, and drawing is impossible on a
        // phone — which is where most signatures actually happen.
      />
      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-sm text-muted-foreground/60">Sign here</span>
        </div>
      )}
    </div>
  );
});

/**
 * Crops transparent padding from a signature PNG.
 *
 * `trim-canvas` (which react-signature-canvas uses) does exactly this in ~40
 * lines; inlined here to avoid the dependency. Scans the alpha channel for the
 * ink's bounding box and re-draws just that region.
 */
function trimToInk(dataUrl: string, source: HTMLCanvasElement): string {
  const ctx = source.getContext("2d");
  if (!ctx) return dataUrl;

  const { width, height } = source;
  const { data } = ctx.getImageData(0, 0, width, height);

  let top = height;
  let left = width;
  let right = 0;
  let bottom = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Alpha byte of this pixel. Anything non-zero counts as ink.
      if (data[(y * width + x) * 4 + 3] === 0) continue;
      found = true;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }

  if (!found) return dataUrl;

  // A couple of pixels of margin so the ink isn't clipped flush at the edge.
  const pad = 2;
  left = Math.max(0, left - pad);
  top = Math.max(0, top - pad);
  right = Math.min(width - 1, right + pad);
  bottom = Math.min(height - 1, bottom + pad);

  const out = document.createElement("canvas");
  out.width = right - left + 1;
  out.height = bottom - top + 1;
  out.getContext("2d")?.drawImage(source, left, top, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}
