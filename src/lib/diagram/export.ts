import type { Graph } from "@maxgraph/core";
import { HierarchicalLayout } from "@maxgraph/core";
import { PDFDocument } from "pdf-lib";

/** Run hierarchical auto-layout on the current graph. */
export function runAutoLayout(graph: Graph): void {
  const layout = new HierarchicalLayout(graph);
  layout.orientation = "north";
  layout.intraCellSpacing = 40;
  layout.interRankCellSpacing = 60;
  const parent = graph.getDefaultParent();
  graph.getDataModel().beginUpdate();
  try {
    layout.execute(parent);
  } finally {
    graph.getDataModel().endUpdate();
  }
}

function getSvgElement(graph: Graph): SVGSVGElement | null {
  const container = graph.container;
  return container?.querySelector("svg") as SVGSVGElement | null;
}

/** Flatten foreignObject HTML tables into SVG text so rasterize is not blank. */
function flattenForeignObjects(clone: SVGSVGElement): void {
  const fos = Array.from(clone.querySelectorAll("foreignObject"));
  for (const fo of fos) {
    const textContent = (fo.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!textContent) {
      fo.remove();
      continue;
    }
    const x = Number(fo.getAttribute("x") ?? 0);
    const y = Number(fo.getAttribute("y") ?? 0);
    const w = Number(fo.getAttribute("width") ?? 100);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(x + 4));
    text.setAttribute("y", String(y + 14));
    text.setAttribute("font-size", "11");
    text.setAttribute("font-family", "Helvetica, Arial, sans-serif");
    text.setAttribute("fill", "#334155");
    // Wrap roughly by width
    const maxChars = Math.max(8, Math.floor(w / 7));
    const words = textContent.split(" ");
    let line = "";
    let lineY = y + 14;
    const lines: string[] = [];
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= 1) {
      text.textContent = lines[0] ?? textContent;
      fo.replaceWith(text);
    } else {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      lines.slice(0, 12).forEach((ln, i) => {
        const tspan = document.createElementNS("http://www.w3.org/2000/svg", "text");
        tspan.setAttribute("x", String(x + 4));
        tspan.setAttribute("y", String(lineY + i * 13));
        tspan.setAttribute("font-size", "11");
        tspan.setAttribute("font-family", "Helvetica, Arial, sans-serif");
        tspan.setAttribute("fill", "#334155");
        tspan.textContent = ln;
        g.appendChild(tspan);
      });
      fo.replaceWith(g);
    }
  }
}

export function exportSvg(graph: Graph, opts?: { flattenHtml?: boolean }): string {
  const svg = getSvgElement(graph);
  if (!svg) return "";
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  const bounds = graph.getGraphBounds();
  const pad = 20;
  const w = Math.max(1, Math.ceil(bounds.width + pad * 2));
  const h = Math.max(1, Math.ceil(bounds.height + pad * 2));
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  clone.setAttribute("viewBox", `${bounds.x - pad} ${bounds.y - pad} ${w} ${h}`);
  if (opts?.flattenHtml !== false) {
    flattenForeignObjects(clone);
  }
  return new XMLSerializer().serializeToString(clone);
}

async function rasterizeSvgString(svg: string, w: number, h: number): Promise<Blob> {
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to rasterize SVG"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))), "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Rasterize via an HTML wrapper when foreignObject is present — browsers often
 * refuse to draw foreignObject from blob: SVG into canvas.
 */
async function rasterizeViaHtmlWrapper(svg: string, w: number, h: number): Promise<Blob> {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:-99999px;top:0;width:1px;height:1px;border:0;opacity:0";
  document.body.appendChild(iframe);
  try {
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(
      `<!doctype html><html><head><style>html,body{margin:0;padding:0;background:#fff}</style></head><body>${svg}</body></html>`
    );
    doc.close();
    await new Promise((r) => setTimeout(r, 50));
    const svgEl = doc.querySelector("svg");
    if (!svgEl) throw new Error("No SVG in wrapper");
    // Prefer flattened path if html2canvas-like capture is unavailable — serialize again
    const serialized = new XMLSerializer().serializeToString(svgEl);
    return await rasterizeSvgString(serialized, w, h);
  } finally {
    iframe.remove();
  }
}

export async function exportPng(graph: Graph, scale = 2): Promise<Blob> {
  const bounds = graph.getGraphBounds();
  const pad = 20;
  const w = Math.max(1, Math.ceil((bounds.width + pad * 2) * scale));
  const h = Math.max(1, Math.ceil((bounds.height + pad * 2) * scale));

  // Always flatten foreignObject for reliable canvas drawImage
  const svg = exportSvg(graph, { flattenHtml: true });
  if (!svg) throw new Error("Nothing to export");

  try {
    return await rasterizeSvgString(svg, w, h);
  } catch {
    // Fallback: try HTML wrapper with unflattened SVG then flatten
    const raw = exportSvg(graph, { flattenHtml: false });
    try {
      return await rasterizeViaHtmlWrapper(raw, w, h);
    } catch {
      return await rasterizeSvgString(exportSvg(graph, { flattenHtml: true }), w, h);
    }
  }
}

export async function exportPdf(graph: Graph): Promise<Blob> {
  const png = await exportPng(graph, 2);
  const bytes = await png.arrayBuffer();
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(bytes);
  const page = pdf.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  const out = await pdf.save();
  return new Blob([out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer], {
    type: "application/pdf",
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function printSvg(graph: Graph) {
  const svg = exportSvg(graph, { flattenHtml: true });
  if (!svg) return;
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return;
  w.document.write(
    `<!doctype html><html><head><title>Print</title><style>@page{margin:12mm}body{margin:0;display:flex;justify-content:center}</style></head><body>${svg}</body></html>`
  );
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
    w.close();
  }, 250);
}
