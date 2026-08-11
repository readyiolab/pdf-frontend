import {
  Shape,
  ShapeRegistry,
  type AbstractCanvas2D,
  type Cell,
} from "@maxgraph/core";

/** Custom shape names registered for the diagram editor. */
export const CUSTOM_SHAPE = {
  freehand: "diagramFreehand",
  parallelogram: "parallelogram",
  document: "document",
  note: "note",
  plus: "plus",
} as const;

function parseFreehandPoints(cell: Cell | null | undefined): {
  points: Array<[number, number, number?]>;
  size: number;
} | null {
  if (!cell) return null;
  const raw = cell.getValue();
  let parsed: { freehand?: { points?: Array<[number, number] | [number, number, number]>; size?: number } } | null =
    null;
  if (typeof raw === "string" && raw.startsWith("{")) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  } else if (raw && typeof raw === "object") {
    parsed = raw as typeof parsed;
  }
  const pts = parsed?.freehand?.points;
  if (!pts?.length) return null;
  return {
    points: pts.map((p) => [p[0], p[1], p[2] ?? 0.5] as [number, number, number?]),
    size: parsed?.freehand?.size ?? 2,
  };
}

/**
 * Freehand ink as a stroked polyline (not a filled outline).
 * Filled outlines self-intersect on loops and often leave a thin horizontal chord
 * through the cell midpoint — the gray line users were seeing.
 */
class FreehandShape extends Shape {
  paintVertexShape(c: AbstractCanvas2D, x: number, y: number, _w: number, _h: number) {
    const data = parseFreehandPoints(this.state?.cell);
    if (!data?.points.length) return;

    const ink = this.stroke && this.stroke !== "none" ? this.stroke : "#111827";
    const size = Math.max(1, data.size);
    c.translate(x, y);
    c.setFillColor("none");
    c.setStrokeColor(ink);
    c.setStrokeWidth(size);
    // Round caps/joins so short segments read as a continuous stroke
    c.setLineCap("round");
    c.setLineJoin("round");

    if (data.points.length === 1) {
      const p0 = data.points[0]!;
      c.ellipse(p0[0]! - size / 2, p0[1]! - size / 2, size, size);
      c.setFillColor(ink);
      c.setStrokeColor("none");
      c.fill();
      return;
    }

    c.begin();
    c.moveTo(data.points[0]![0]!, data.points[0]![1]!);
    for (let i = 1; i < data.points.length; i++) {
      c.lineTo(data.points[i]![0]!, data.points[i]![1]!);
    }
    c.stroke();
  }
}

class ParallelogramShape extends Shape {
  paintVertexShape(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const skew = Math.min(w * 0.22, 28);
    c.translate(x, y);
    c.begin();
    c.moveTo(skew, 0);
    c.lineTo(w, 0);
    c.lineTo(w - skew, h);
    c.lineTo(0, h);
    c.close();
    c.fillAndStroke();
  }
}

class DocumentShape extends Shape {
  paintVertexShape(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const fold = Math.min(w * 0.22, 18);
    c.translate(x, y);
    c.begin();
    c.moveTo(0, 0);
    c.lineTo(w - fold, 0);
    c.lineTo(w, fold);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.close();
    c.fillAndStroke();
    // Fold crease
    c.begin();
    c.moveTo(w - fold, 0);
    c.lineTo(w - fold, fold);
    c.lineTo(w, fold);
    c.stroke();
  }
}

class NoteShape extends Shape {
  paintVertexShape(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const fold = Math.min(w * 0.2, 16);
    c.translate(x, y);
    c.begin();
    c.moveTo(0, 0);
    c.lineTo(w, 0);
    c.lineTo(w, h - fold);
    c.lineTo(w - fold, h);
    c.lineTo(0, h);
    c.close();
    c.fillAndStroke();
    c.begin();
    c.moveTo(w, h - fold);
    c.lineTo(w - fold, h - fold);
    c.lineTo(w - fold, h);
    c.stroke();
  }
}

class PlusShape extends Shape {
  paintVertexShape(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const t = Math.min(w, h) * 0.28;
    const cx = w / 2;
    const cy = h / 2;
    c.translate(x, y);
    c.begin();
    c.moveTo(cx - t / 2, 0);
    c.lineTo(cx + t / 2, 0);
    c.lineTo(cx + t / 2, cy - t / 2);
    c.lineTo(w, cy - t / 2);
    c.lineTo(w, cy + t / 2);
    c.lineTo(cx + t / 2, cy + t / 2);
    c.lineTo(cx + t / 2, h);
    c.lineTo(cx - t / 2, h);
    c.lineTo(cx - t / 2, cy + t / 2);
    c.lineTo(0, cy + t / 2);
    c.lineTo(0, cy - t / 2);
    c.lineTo(cx - t / 2, cy - t / 2);
    c.close();
    c.fillAndStroke();
  }
}

let registered = false;

/** Idempotent registration of diagram custom shapes into maxGraph. */
export function registerDiagramCustomShapes() {
  if (registered) return;
  registered = true;
  ShapeRegistry.add(CUSTOM_SHAPE.freehand, FreehandShape);
  ShapeRegistry.add(CUSTOM_SHAPE.parallelogram, ParallelogramShape);
  ShapeRegistry.add(CUSTOM_SHAPE.document, DocumentShape);
  ShapeRegistry.add(CUSTOM_SHAPE.note, NoteShape);
  ShapeRegistry.add(CUSTOM_SHAPE.plus, PlusShape);
}
