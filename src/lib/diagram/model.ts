import { z } from "zod";
import type { Cell, CellStyle, Graph } from "@maxgraph/core";

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
});

export const diagramNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().default(""),
  shape: z.string().default("rectangle"),
  x: z.number(),
  y: z.number(),
  w: z.number().positive().default(120),
  h: z.number().positive().default(60),
  style: nodeStyleSchema.optional(),
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

export const diagramDocumentSchema = z.object({
  version: z.literal(1).default(1),
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
      paper: z.enum(["a4-portrait", "a4-landscape", "letter", "custom"]).optional(),
      pageWidth: z.number().optional(),
      pageHeight: z.number().optional(),
    })
    .optional(),
});

export type NodeStyle = z.infer<typeof nodeStyleSchema>;
export type EdgeStyle = z.infer<typeof edgeStyleSchema>;
export type DiagramNode = z.infer<typeof diagramNodeSchema>;
export type DiagramEdge = z.infer<typeof diagramEdgeSchema>;
export type DiagramPage = z.infer<typeof diagramPageSchema>;
export type DiagramDocument = z.infer<typeof diagramDocumentSchema>;
export type DiagramSettings = NonNullable<DiagramDocument["settings"]>;

export const PAPER_SIZES = {
  "a4-portrait": { w: 794, h: 1123 },
  "a4-landscape": { w: 1123, h: 794 },
  letter: { w: 816, h: 1056 },
} as const;

export function emptyDocument(_title = "Untitled Diagram"): DiagramDocument {
  return {
    version: 1,
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
    },
  };
}

export function emptyPage(name = "Page-1"): DiagramPage {
  return { id: crypto.randomUUID(), name, nodes: [], edges: [] };
}

function shapeToMaxStyle(shape: string): Partial<CellStyle> {
  const map: Record<string, Partial<CellStyle>> = {
    rectangle: { shape: "rectangle" },
    rounded: { shape: "rectangle", rounded: true, arcSize: 20 },
    ellipse: { shape: "ellipse" },
    circle: { shape: "ellipse" },
    diamond: { shape: "rhombus" },
    rhombus: { shape: "rhombus" },
    parallelogram: { shape: "hexagon" },
    hexagon: { shape: "hexagon" },
    cylinder: { shape: "cylinder" },
    cloud: { shape: "cloud" },
    actor: { shape: "actor" },
    triangle: { shape: "triangle" },
    doubleEllipse: { shape: "doubleEllipse" },
    document: { shape: "label" },
    note: { shape: "label" },
    process: { shape: "rectangle", rounded: true },
    decision: { shape: "rhombus" },
    terminator: { shape: "ellipse" },
    data: { shape: "parallelogram" as CellStyle["shape"] },
    text: { shape: "rectangle", fillColor: "none", strokeColor: "none" },
    arrow: { shape: "arrow" },
    line: { shape: "line" },
    swimlane: { shape: "swimlane" },
  };
  return map[shape] ?? { shape: shape as CellStyle["shape"] };
}

function nodeToCellStyle(node: DiagramNode): CellStyle {
  const s = node.style ?? {};
  return {
    ...shapeToMaxStyle(node.shape),
    fillColor: s.fill ?? "#dae8fc",
    strokeColor: s.stroke ?? "#6c8ebf",
    strokeWidth: s.strokeWidth ?? 1.5,
    dashed: s.dashed ?? false,
    fontSize: s.fontSize ?? 12,
    fontColor: s.fontColor ?? "#333333",
    fontFamily: s.fontFamily ?? "Helvetica",
    fontStyle: s.fontStyle ?? 0,
    shadow: s.shadow ?? false,
    opacity: s.opacity ?? 100,
    align: (s.align as CellStyle["align"]) ?? "center",
    verticalAlign: (s.verticalAlign as CellStyle["verticalAlign"]) ?? "middle",
    whiteSpace: "wrap",
  };
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
        value: node.label ?? "",
        position: [node.x, node.y],
        size: [node.w, node.h],
        style: nodeToCellStyle(node),
      });
      cell.setId(node.id);
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
    }
  } finally {
    model.endUpdate();
  }
}

function cellShapeName(style: CellStyle): string {
  const shape = String(style.shape ?? "rectangle");
  if (shape === "rectangle" && style.rounded) return "rounded";
  if (shape === "rhombus") return "diamond";
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
    return {
      id: cell.getId() || crypto.randomUUID(),
      label: String(cell.getValue() ?? ""),
      shape: cellShapeName(style),
      x: geo?.x ?? 0,
      y: geo?.y ?? 0,
      w: geo?.width ?? 120,
      h: geo?.height ?? 60,
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
  return diagramDocumentSchema.parse(raw);
}
