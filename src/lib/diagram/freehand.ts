/**
 * Lightweight freehand stroke helpers.
 * Uses a simple consecutive-point average smoother (no perfect-freehand dependency).
 */

export type StrokePoint = {
  x: number;
  y: number;
  pressure?: number;
};

export type StrokeOutlineOptions = {
  size?: number;
  thinning?: number;
  smoothing?: number;
  /** Number of averaging passes (default 2). */
  passes?: number;
};

function averagePoints(points: StrokePoint[], window = 3): StrokePoint[] {
  if (points.length < 2) return points.slice();
  const half = Math.floor(window / 2);
  const out: StrokePoint[] = [];
  for (let i = 0; i < points.length; i++) {
    let sx = 0;
    let sy = 0;
    let sp = 0;
    let n = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(points.length - 1, i + half); j++) {
      const p = points[j]!;
      sx += p.x;
      sy += p.y;
      sp += p.pressure ?? 0.5;
      n++;
    }
    out.push({ x: sx / n, y: sy / n, pressure: sp / n });
  }
  return out;
}

function smoothPoints(points: StrokePoint[], passes = 2): StrokePoint[] {
  let cur = points;
  for (let i = 0; i < passes; i++) cur = averagePoints(cur, 3);
  return cur;
}

function radiusAt(p: StrokePoint, size: number, thinning: number): number {
  const pressure = p.pressure ?? 0.5;
  const t = 1 - thinning * (0.5 - pressure) * 2;
  return Math.max(0.5, (size / 2) * Math.max(0.2, Math.min(1.5, t)));
}

/**
 * Build a closed outline polygon around the stroke (left + reverse right offsets).
 */
export function getStrokeOutline(
  points: StrokePoint[],
  options: StrokeOutlineOptions = {}
): [number, number][] {
  const size = options.size ?? 8;
  const thinning = options.thinning ?? 0.5;
  const passes = options.passes ?? 2;
  if (points.length === 0) return [];
  if (points.length === 1) {
    const r = radiusAt(points[0]!, size, thinning);
    const { x, y } = points[0]!;
    const circle: [number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      circle.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    return circle;
  }

  const smoothed = smoothPoints(points, passes);
  const left: [number, number][] = [];
  const right: [number, number][] = [];

  for (let i = 0; i < smoothed.length; i++) {
    const prev = smoothed[Math.max(0, i - 1)]!;
    const next = smoothed[Math.min(smoothed.length - 1, i + 1)]!;
    const cur = smoothed[i]!;
    let dx = next.x - prev.x;
    let dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const nx = -dy;
    const ny = dx;
    const r = radiusAt(cur, size, thinning);
    left.push([cur.x + nx * r, cur.y + ny * r]);
    right.push([cur.x - nx * r, cur.y - ny * r]);
  }

  return [...left, ...right.reverse()];
}

/** Convert stroke points to an SVG path `d` string (outline fill path). */
export function strokeToSvgPath(points: StrokePoint[], size: number): string {
  const outline = getStrokeOutline(points, { size });
  if (outline.length === 0) return "";
  const [first, ...rest] = outline;
  if (!first) return "";
  let d = `M ${first[0].toFixed(2)} ${first[1].toFixed(2)}`;
  for (const [x, y] of rest) {
    d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  d += " Z";
  return d;
}

function dist2(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/** Minimum distance from point P to segment AB. */
function pointToSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-8) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * abx + (py - ay) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
}

function pointNearEraser(p: StrokePoint, eraserPts: StrokePoint[], radius: number): boolean {
  const r2 = radius * radius;
  for (const e of eraserPts) {
    if (dist2(p.x, p.y, e.x, e.y) <= r2) return true;
  }
  // Also check distance to eraser path segments for denser coverage
  for (let i = 1; i < eraserPts.length; i++) {
    const a = eraserPts[i - 1]!;
    const b = eraserPts[i]!;
    if (pointToSegmentDistance(p.x, p.y, a.x, a.y, b.x, b.y) <= radius) return true;
  }
  return false;
}

/**
 * Erase portions of a polyline within `radius` of any eraser sample.
 * Returns kept contiguous runs (each with ≥2 points). Empty array = fully erased.
 */
export function erasePolylineByRadius(
  points: StrokePoint[],
  eraserPts: StrokePoint[],
  radius: number
): StrokePoint[][] {
  if (!points.length) return [];
  if (!eraserPts.length || radius <= 0) return [points.slice()];

  const keepFlags = points.map((p) => !pointNearEraser(p, eraserPts, radius));

  // Also erase segment midpoints that pass through the eraser (dense strokes)
  for (let i = 0; i < points.length - 1; i++) {
    if (!keepFlags[i] && !keepFlags[i + 1]) continue;
    const a = points[i]!;
    const b = points[i + 1]!;
    for (const e of eraserPts) {
      if (pointToSegmentDistance(e.x, e.y, a.x, a.y, b.x, b.y) <= radius) {
        // Mark both endpoints of a hit segment so the segment is dropped
        keepFlags[i] = false;
        keepFlags[i + 1] = false;
        break;
      }
    }
  }

  const runs: StrokePoint[][] = [];
  let cur: StrokePoint[] = [];
  for (let i = 0; i < points.length; i++) {
    if (keepFlags[i]) {
      cur.push(points[i]!);
    } else if (cur.length) {
      if (cur.length >= 2) runs.push(cur);
      cur = [];
    }
  }
  if (cur.length >= 2) runs.push(cur);
  return runs;
}

