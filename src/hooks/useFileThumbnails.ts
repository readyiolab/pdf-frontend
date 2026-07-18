import { useEffect, useRef, useState } from "react";
import { loadPdfDocument } from "@/lib/pdf";

async function renderPdfFirstPage(file: File): Promise<string | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await loadPdfDocument(arrayBuffer);
    const page = await pdf.getPage(1);
    // Rendered large enough to stay sharp in the grid preview tiles.
    const viewport = page.getViewport({ scale: 0.8 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return null;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport }).promise;
    // Release the worker-side document; the thumbnail is already rasterized.
    pdf.destroy();
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch (err) {
    console.error("File thumbnail generation error:", err);
    return null;
  }
}

/**
 * Per-file thumbnail for a multi-file list (both images and PDFs — a PDF gets
 * its first page rendered small). Cached by File reference so reordering or
 * re-rendering the list never regenerates an already-computed thumbnail.
 */
export function useFileThumbnails(files: File[]): (string | undefined)[] {
  const [thumbs, setThumbs] = useState<(string | undefined)[]>([]);
  const cacheRef = useRef(new Map<File, string>());
  const objectUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setThumbs(files.map((file) => cacheRef.current.get(file)));

    files.forEach((file, idx) => {
      if (cacheRef.current.has(file)) return;

      const setThumbAt = (url: string) => {
        cacheRef.current.set(file, url);
        if (cancelled) return;
        setThumbs((prev) => {
          const next = [...prev];
          next[idx] = url;
          return next;
        });
      };

      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        objectUrlsRef.current.add(url);
        setThumbAt(url);
      } else if (file.name.toLowerCase().endsWith(".pdf")) {
        renderPdfFirstPage(file).then((url) => url && setThumbAt(url));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [files]);

  // Object URLs (images only — PDF thumbnails are data: URIs) are revoked once,
  // when the hook itself unmounts, not on every list change.
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  return thumbs;
}
