import { z } from "zod";
import type { Cell, CellStyle, Graph } from "@maxgraph/core";
import { CUSTOM_SHAPE } from "./customShapes";

export const nodeStyleSchema = z.object({
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  dashed: z.boolean().optional(),
  fontSize: z.number().optional(),
  fontColor: z.string().optional(),
  fontFamily: z.string().optional(),
  fontStyle: z.number().optional(),
  rounded: z.boolean().optional(),
  shadow: z.boolean().optional(),
  opacity: z.number().optional(),
  align: z.string().optional(),
  verticalAlign: z.string().optional(),
  rotation: z.number().optional(),
});

export const edgeStyleSchema = z.object({
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  dashed: z.boolean().optional(),
  arrow: z.enum(["classic", "block", "open", "oval", "diamond", "none"]).optional(),
  startArrow: z.enum(["classic", "block", "open", "oval", "diamond", "none"]).optional(),
  edgeStyle: z.enum(["orthogonal", "straight", "entityRelation", "elbow"]).optional(),
  curved: z.boolean().optional(),
  fontSize: z.number().optional(),
  fontColor: z.string().optional(),
  exitX: z.number().optional(),
  exitY: z.number().optional(),
  entryX: z.number().optional(),
  entryY: z.number().optional(),
  points: z.array(z.tuple([z.number(), z.number()])).optional(),
});

export const freehandPointSchema = z.union([
  z.tuple([z.number(), z.number()]),
  z.tuple([z.number(), z.number(), z.number()]),
]);

export const freehandSchema = z.object({
  points: z.array(freehandPointSchema),
  size: z.number(),
  color: z.string(),
  opacity: z.number(),
  brush: z.enum(["pen", "brush"]),
});

export const tableCellSchema = z.object({
  r: z.number(),
  c: z.number(),
  rowSpan: z.number().optional(),
  colSpan: z.number().optional(),
  text: z.string().optional(),
  fill: z.string().optional(),
});

export const tableSchema = z.object({
  rows: z.number(),
  cols: z.number(),
  cells: z.array(tableCellSchema),
});

export const containerSchema = z.object({
  title: z.string().optional(),
  collapsed: z.boolean().optional(),
  childIds: z.array(z.string()).optional(),
});

export const nodeKindSchema = z.enum(["shape", "freehand", "table", "container", "text"]);

export const diagramNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().default(""),
  shape: z.string().default("rectangle"),
  x: z.number(),
  y: z.number(),
  w: z.number().positive().default(120),
  h: z.number().positive().default(60),
  style: nodeStyleSchema.optional(),
  kind: nodeKindSchema.optional().default("shape"),
  locked: z.boolean().optional(),
  groupId: z.string().optional(),
  freehand: freehandSchema.optional(),
  table: tableSchema.optional(),
  container: containerSchema.optional(),
});

export const diagramEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().optional().default(""),
  style: edgeStyleSchema.optional(),
});

export const diagramPageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nodes: z.array(diagramNodeSchema).default([]),
  edges: z.array(diagramEdgeSchema).default([]),
});

export const paperEnum = z.enum([
  "a0",
  "a1",
  "a2",
  "a3",
  "a4-portrait",
  "a4-landscape",
  "a5",
  "a6",
  "a7",
  "letter",
  "legal",
  "tabloid",
  "executive",
  "widescreen-16-9",
  "widescreen-16-10",
  "standard-4-3",
  "custom",
]);

export const themeEnum = z.enum(["automatic", "classic", "simple", "minimal", "sketch", "atlas"]);

export const diagramDocumentSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]).default(2),
  pages: z.array(diagramPageSchema).min(1),
  settings: z
    .object({
      grid: z.boolean().optional(),
      gridSize: z.number().optional(),
      pageView: z.boolean().optional(),
      background: z.string().optional(),
      connectionArrows: z.boolean().optional(),
      connectionPoints: z.boolean().optional(),
      guides: z.boolean().optional(),
      paper: paperEnum.optional(),
      pageWidth: z.number().optional(),
      pageHeight: z.number().optional(),
      theme: themeEnum.optional(),
    })
    .optional(),
});

export type NodeStyle = z.infer<typeof nodeStyleSchema>;
export type EdgeStyle = z.infer<typeof edgeStyleSchema>;
export type FreehandData = z.infer<typeof freehandSchema>;
export type TableData = z.infer<typeof tableSchema>;
export type ContainerData = z.infer<typeof containerSchema>;
export type NodeKind = z.infer<typeof nodeKindSchema>;
export type DiagramNode = z.infer<typeof diagramNodeSchema>;
export type DiagramEdge = z.infer<typeof diagramEdgeSchema>;
export type DiagramPage = z.infer<typeof diagramPageSchema>;
export type DiagramDocument = z.infer<typeof diagramDocumentSchema>;
export type DiagramSettings = NonNullable<DiagramDocument["settings"]>;
export type ThemeId = z.infer<typeof themeEnum>;

export const PAPER_SIZES = {
  a0: { w: 3179, h: 4494, label: "A0" },
  a1: { w: 2245, h: 3179, label: "A1" },
  a2: { w: 1587, h: 2245, label: "A2" },
  a3: { w: 1123, h: 1587, label: "A3" },
  "a4-portrait": { w: 794, h: 1123, label: 'A4 (210 mm × 297 mm)' },
  "a4-landscape": { w: 1123, h: 794, label: "A4 Landscape" },
  a5: { w: 559, h: 794, label: "A5" },
  a6: { w: 397, h: 559, label: "A6" },
  a7: { w: 280, h: 397, label: "A7" },
  letter: { w: 816, h: 1056, label: 'US-Letter (8.5" × 11")' },
  legal: { w: 816, h: 1344, label: 'US-Legal (8.5" × 14")' },
  tabloid: { w: 1056, h: 1632, label: 'US-Tabloid (11" × 17")' },
  executive: { w: 696, h: 1008, label: 'US-Executive (7.25" × 10.5")' },
  "widescreen-16-9": { w: 1600, h: 900, label: "16:9 (1600 × 900)" },
  "widescreen-16-10": { w: 1920, h: 1200, label: "16:10 (1920 × 1200)" },
  "standard-4-3": { w: 1600, h: 1200, label: "4:3 (1600 × 1200)" },
} as const;

export type PaperKey = keyof typeof PAPER_SIZES;

/** Cell value payload for non-shape kinds (serialized as JSON string). */
type CellValuePayload = {
  kind: NodeKind;
  label?: string;
  freehand?: FreehandData;
  table?: TableData;
  container?: ContainerData;
};

function isCellValuePayload(v: unknown): v is CellValuePayload {
  return (
    typeof v === "object" &&
    v !== null &&
    "kind" in v &&
    typeof (v as CellValuePayload).kind === "string"
  );
}

function parseCellValue(raw: unknown): {
  label: string;
  kind: NodeKind;
  freehand?: FreehandData;
  table?: TableData;
  container?: ContainerData;
} {
  if (raw == null) return { label: "", kind: "shape" };
  if (typeof raw === "object" && isCellValuePayload(raw)) {
    return {
      label: raw.label ?? "",
      kind: raw.kind,
      freehand: raw.freehand,
      table: raw.table,
      container: raw.container,
    };
  }
  const str = String(raw);
  if (str.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(str);
      if (isCellValuePayload(parsed)) {
        return {
          label: parsed.label ?? "",
          kind: parsed.kind,
          freehand: parsed.freehand,
          table: parsed.table,
          container: parsed.container,
        };
      }
    } catch {
      /* plain label that happens to start with { */
    }
  }
  return { label: str, kind: "shape" };
}

function encodeCellValue(node: DiagramNode): string {
  const kind = node.kind ?? "shape";
  if (kind === "shape" || kind === "text") {
    return node.label ?? "";
  }
  const payload: CellValuePayload = {
    kind,
    label: node.label ?? "",
  };
  if (node.freehand) payload.freehand = node.freehand;
  if (node.table) payload.table = node.table;
  if (node.container) payload.container = node.container;
  return JSON.stringify(payload);
}

export function emptyDocument(_title = "Untitled Diagram"): DiagramDocument {
  return {
    version: 2,
    pages: [{ id: crypto.randomUUID(), name: "Page-1", nodes: [], edges: [] }],
    settings: {
      grid: true,
      gridSize: 10,
      pageView: true,
      background: "#ffffff",
      connectionArrows: true,
      connectionPoints: true,
      guides: true,
      paper: "a4-portrait",
      pageWidth: PAPER_SIZES["a4-portrait"].w,
      pageHeight: PAPER_SIZES["a4-portrait"].h,
      theme: "automatic",
    },
  };
}

export function emptyPage(name = "Page-1"): DiagramPage {
  return { id: crypto.randomUUID(), name, nodes: [], edges: [] };
}

/** Upgrade a v1 (or partially migrated) document to DiagramDocument v2. */
export function upgradeDocument(doc: DiagramDocument): DiagramDocument {
  const pages = doc.pages.map((page) => ({
    ...page,
    nodes: page.nodes.map((node) => ({
      ...node,
      kind: node.kind ?? "shape",
    })),
  }));
  return {
    ...doc,
    version: 2,
    pages,
    settings: {
      ...doc.settings,
      theme: doc.settings?.theme ?? "automatic",
    },
  };
}

/** Map app shape names → maxGraph CellStyle shape props (place + load). */
export function shapeToMaxStyle(shape: string): Partial<CellStyle> {
  const map: Record<string, Partial<CellStyle>> = {
    rectangle: { shape: "rectangle" },
    rounded: { shape: "rectangle", rounded: true, arcSize: 20 },
    ellipse: { shape: "ellipse" },
    circle: { shape: "ellipse" },
    diamond: { shape: "rhombus" },
    rhombus: { shape: "rhombus" },
    parallelogram: { shape: CUSTOM_SHAPE.parallelogram },
    hexagon: { shape: "hexagon" },
    cylinder: { shape: "cylinder" },
    cloud: { shape: "cloud" },
    actor: { shape: "actor" },
    triangle: { shape: "triangle" },
    doubleEllipse: { shape: "doubleEllipse" },
    document: { shape: CUSTOM_SHAPE.document },
    note: { shape: CUSTOM_SHAPE.note },
    process: { shape: "rectangle", rounded: true, arcSize: 20 },
    decision: { shape: "rhombus" },
    terminator: { shape: "ellipse" },
    data: { shape: CUSTOM_SHAPE.parallelogram },
    text: { shape: "rectangle", fillColor: "none", strokeColor: "none" },
    arrow: { shape: "arrow" },
    line: { shape: "line" },
    swimlane: { shape: "swimlane" },
    plus: { shape: CUSTOM_SHAPE.plus },
    [CUSTOM_SHAPE.freehand]: { shape: CUSTOM_SHAPE.freehand, fillColor: "none" },
  };
  return map[shape] ?? { shape: shape as CellStyle["shape"] };
}

function nodeToCellStyle(node: DiagramNode): CellStyle {
  const s = node.style ?? {};
  const kind = node.kind ?? "shape";
  const shapeName =
    kind === "freehand" ? CUSTOM_SHAPE.freehand : node.shape || "rectangle";
  const base: CellStyle = {
    ...shapeToMaxStyle(shapeName),
    fillColor:
      kind === "freehand"
        ? "none"
        : (s.fill ?? (shapeName === "text" ? "none" : "#dae8fc")),
    strokeColor:
      kind === "freehand"
        ? (s.stroke ?? node.freehand?.color ?? "#111827")
        : (s.stroke ?? (shapeName === "text" ? "none" : "#6c8ebf")),
    strokeWidth: s.strokeWidth ?? (kind === "freehand" ? Math.max(1, (node.freehand?.size ?? 2) / 2) : 1.5),
    dashed: s.dashed ?? false,
    fontSize: s.fontSize ?? (kind === "freehand" ? 1 : 12),
    fontColor: s.fontColor ?? (kind === "freehand" ? "none" : "#333333"),
    fontFamily: s.fontFamily ?? "Helvetica",
    fontStyle: s.fontStyle ?? 0,
    shadow: s.shadow ?? false,
    opacity: s.opacity ?? (kind === "freehand" ? Math.round((node.freehand?.opacity ?? 1) * 100) : 100),
    align: (s.align as CellStyle["align"]) ?? "center",
    verticalAlign: (s.verticalAlign as CellStyle["verticalAlign"]) ?? "middle",
    whiteSpace: "wrap",
    ...(typeof s.rotation === "number" ? { rotation: s.rotation } : {}),
  };
  // Persist kind / lock / group as style string props for round-trip hints
  (base as Record<string, unknown>).diagramKind = kind;
  if (node.locked != null) (base as Record<string, unknown>).diagramLocked = node.locked ? "1" : "0";
  if (node.groupId) (base as Record<string, unknown>).diagramGroupId = node.groupId;
  return base;
}

function edgeToCellStyle(edge: DiagramEdge): CellStyle {
  const s = edge.style ?? {};
  const endArrow = s.arrow === "none" ? undefined : (s.arrow ?? "classic");
  const startArrow = s.startArrow === "none" ? undefined : s.startArrow;
  const edgeStyleMap: Record<string, string> = {
    orthogonal: "orthogonalEdgeStyle",
    straight: "none",
    entityRelation: "entityRelationEdgeStyle",
    elbow: "elbowEdgeStyle",
  };
  return {
    strokeColor: s.stroke ?? "#64748b",
    strokeWidth: s.strokeWidth ?? 1.5,
    dashed: s.dashed ?? false,
    endArrow,
    startArrow,
    edgeStyle: s.edgeStyle ? edgeStyleMap[s.edgeStyle] : "orthogonalEdgeStyle",
    curved: s.curved ?? false,
    fontSize: s.fontSize ?? 11,
    fontColor: s.fontColor ?? "#475569",
    rounded: true,
    ...(typeof s.exitX === "number" ? { exitX: s.exitX } : {}),
    ...(typeof s.exitY === "number" ? { exitY: s.exitY } : {}),
    ...(typeof s.entryX === "number" ? { entryX: s.entryX } : {}),
    ...(typeof s.entryY === "number" ? { entryY: s.entryY } : {}),
  };
}

/** Clear the graph and render a page into it. */
export function toMaxGraph(graph: Graph, page: DiagramPage): void {
  const model = graph.getDataModel();
  const parent = graph.getDefaultParent();
  model.beginUpdate();
  try {
    const cells = graph.getChildCells(parent, true, true);
    if (cells.length) graph.removeCells(cells, true);

    const byId = new Map<string, Cell>();
    for (const node of page.nodes) {
      const cell = graph.insertVertex({
        parent,
        id: node.id,
        value: encodeCellValue(node),
        position: [node.x, node.y],
        size: [node.w, node.h],
        style: nodeToCellStyle(node),
      });
      cell.setId(node.id);
      if (node.locked) cell.setConnectable(false);
      byId.set(node.id, cell);
    }

    for (const edge of page.edges) {
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      if (!source || !target) continue;
      const cell = graph.insertEdge({
        parent,
        id: edge.id,
        value: edge.label ?? "",
        source,
        target,
        style: edgeToCellStyle(edge),
      });
      cell.setId(edge.id);
      const pts = edge.style?.points;
      if (pts?.length) {
        const geo = cell.getGeometry()?.clone();
        if (geo) {
          geo.points = pts.map(([x, y]) => ({ x, y } as never));
          cell.setGeometry(geo);
        }
      }
    }
  } finally {
    model.endUpdate();
  }
}

function cellShapeName(style: CellStyle): string {
  const shape = String(style.shape ?? "rectangle");
  if (shape === "rectangle" && style.rounded) return "rounded";
  if (shape === "rhombus") return "diamond";
  if (shape === CUSTOM_SHAPE.freehand || shape === "diagramFreehand") return CUSTOM_SHAPE.freehand;
  return shape;
}

/** Serialize the current graph contents into a page JSON. */
export function fromMaxGraph(graph: Graph, pageMeta: Pick<DiagramPage, "id" | "name">): DiagramPage {
  const parent = graph.getDefaultParent();
  const vertices = graph.getChildVertices(parent);
  const edges = graph.getChildEdges(parent);

  const nodes: DiagramNode[] = vertices.map((cell) => {
    const geo = cell.getGeometry();
    const style = cell.getStyle() ?? {};
    const styleRec = style as Record<string, unknown>;
    const parsed = parseCellValue(cell.getValue());
    const kindFromStyle = typeof styleRec.diagramKind === "string" ? styleRec.diagramKind : undefined;
    const kind = (kindFromStyle as NodeKind | undefined) ?? parsed.kind;
    const locked =
      styleRec.diagramLocked === "1" || styleRec.diagramLocked === true
        ? true
        : styleRec.diagramLocked === "0" || styleRec.diagramLocked === false
          ? false
          : undefined;
    const groupId = typeof styleRec.diagramGroupId === "string" ? styleRec.diagramGroupId : undefined;

    return {
      id: cell.getId() || crypto.randomUUID(),
      label: parsed.label,
      shape: cellShapeName(style),
      x: geo?.x ?? 0,
      y: geo?.y ?? 0,
      w: geo?.width ?? 120,
      h: geo?.height ?? 60,
      kind,
      locked,
      groupId,
      freehand: parsed.freehand,
      table: parsed.table,
      container: parsed.container,
      style: {
        fill: style.fillColor as string | undefined,
        stroke: style.strokeColor as string | undefined,
        strokeWidth: style.strokeWidth as number | undefined,
        dashed: Boolean(style.dashed),
        fontSize: style.fontSize as number | undefined,
        fontColor: style.fontColor as string | undefined,
        fontFamily: style.fontFamily as string | undefined,
        fontStyle: style.fontStyle as number | undefined,
        rounded: Boolean(style.rounded),
        shadow: Boolean(style.shadow),
        opacity: style.opacity as number | undefined,
        rotation: typeof style.rotation === "number" ? style.rotation : undefined,
      },
    };
  });

  const pageEdges: DiagramEdge[] = edges
    .map((cell) => {
      const source = cell.getTerminal(true);
      const target = cell.getTerminal(false);
      if (!source || !target) return null;
      const style = cell.getStyle() ?? {};
      let edgeStyle: EdgeStyle["edgeStyle"] = "orthogonal";
      const es = String(style.edgeStyle ?? "");
      if (es === "none" || !es) edgeStyle = "straight";
      else if (es.includes("entityRelation")) edgeStyle = "entityRelation";
      else if (es.includes("elbow")) edgeStyle = "elbow";
      const geo = cell.getGeometry();
      const points =
        geo?.points?.map((p) => [p.x, p.y] as [number, number]).filter(Boolean) ?? undefined;
      return {
        id: cell.getId() || crypto.randomUUID(),
        source: source.getId() || "",
        target: target.getId() || "",
        label: String(cell.getValue() ?? ""),
        style: {
          stroke: style.strokeColor as string | undefined,
          strokeWidth: style.strokeWidth as number | undefined,
          dashed: Boolean(style.dashed),
          arrow: (style.endArrow as EdgeStyle["arrow"]) ?? "classic",
          startArrow: (style.startArrow as EdgeStyle["startArrow"]) ?? "none",
          edgeStyle,
          curved: Boolean(style.curved),
          fontSize: style.fontSize as number | undefined,
          fontColor: style.fontColor as string | undefined,
          exitX: typeof style.exitX === "number" ? style.exitX : undefined,
          exitY: typeof style.exitY === "number" ? style.exitY : undefined,
          entryX: typeof style.entryX === "number" ? style.entryX : undefined,
          entryY: typeof style.entryY === "number" ? style.entryY : undefined,
          points: points?.length ? points : undefined,
        },
      } satisfies DiagramEdge;
    })
    .filter(Boolean) as DiagramEdge[];

  return {
    id: pageMeta.id,
    name: pageMeta.name,
    nodes,
    edges: pageEdges,
  };
}

export function parseDocument(raw: unknown): DiagramDocument {
  return upgradeDocument(diagramDocumentSchema.parse(raw));
}
