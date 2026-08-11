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
