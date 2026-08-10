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

export function exportSvg(graph: Graph): string {
  const svg = getSvgElement(graph);
  if (!svg) return "";
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const bounds = graph.getGraphBounds();
  const pad = 20;
  const w = Math.max(1, Math.ceil(bounds.width + pad * 2));
  const h = Math.max(1, Math.ceil(bounds.height + pad * 2));
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  clone.setAttribute(
    "viewBox",
    `${bounds.x - pad} ${bounds.y - pad} ${w} ${h}`
  );
  return new XMLSerializer().serializeToString(clone);
}

export async function exportPng(graph: Graph, scale = 2): Promise<Blob> {
  const svg = exportSvg(graph);
  if (!svg) throw new Error("Nothing to export");
  const bounds = graph.getGraphBounds();
  const pad = 20;
  const w = Math.max(1, Math.ceil((bounds.width + pad * 2) * scale));
  const h = Math.max(1, Math.ceil((bounds.height + pad * 2) * scale));

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
  const svg = exportSvg(graph);
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
