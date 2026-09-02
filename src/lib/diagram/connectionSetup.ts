import {
  ConnectionConstraint,
  ImageBox,
  InternalMouseEvent,
  Point,
  type Cell,
  type CellState,
  type Graph,
} from "@maxgraph/core";
import { parseCellValue } from "./model";

/** How many evenly-spaced ports to show around each shape perimeter. */
const PERIMETER_SAMPLE_COUNT = 16;

const CONNECTION_DOT_SVG = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8">' +
    '<circle cx="4" cy="4" r="3.25" fill="#3b82f6" stroke="#ffffff" stroke-width="1.25"/>' +
    "</svg>"
);
const CONNECTION_DOT_URI = `data:image/svg+xml,${CONNECTION_DOT_SVG}`;

type ConnectionHandlerPlugin = {
  constraintHandler?: ConstraintHandlerLike;
  insertEdge?: (
    parent: Cell,
    id: string,
    value: unknown,
    source: Cell | null,
    target: Cell | null,
    style: Record<string, unknown>
  ) => Cell;
  isConnecting?: () => boolean;
};

type ConstraintHandlerLike = {
  pointImage: InstanceType<typeof ImageBox>;
  highlightColor: string;
  enabled: boolean;
  currentFocus: { cell: Cell } | null;
  setFocus: (me: InternalMouseEvent, state: CellState | null, source: boolean) => void;
  update: (
    me: InternalMouseEvent,
    source: boolean,
    existingEdge: boolean,
    point: Point | null
  ) => void;
  redraw: () => void;
  reset: () => void;
};

export type ConnectionSetupOptions = {
  connectionPointsEnabled: () => boolean;
};

export type PinConnectionOptions = {
  graphX?: number;
  graphY?: number;
  evt?: MouseEvent;
};

/** Relative coords on the unit bounding box for a point at parameter t ∈ [0, 1) along the perimeter. */
function perimeterParamToRelative(t: number): { x: number; y: number } {
  const seg = Math.floor(t * 4);
  const u = t * 4 - seg;
  switch (seg) {
    case 0:
      return { x: u, y: 0 };
    case 1:
      return { x: 1, y: u };
    case 2:
      return { x: 1 - u, y: 1 };
    default:
      return { x: 0, y: 1 - u };
  }
}

function constraintNear(
  constraints: ConnectionConstraint[],
  point: Point,
  threshold = 0.06
): boolean {
  return constraints.some((c) => {
    if (!c.point) return false;
    const dx = c.point.x - point.x;
    const dy = c.point.y - point.y;
    return dx * dx + dy * dy < threshold * threshold;
  });
}

/** Hover context used to place a cursor-aligned port anywhere on the perimeter. */
let hoverContext: { cellId: string; graphX: number; graphY: number } | null = null;
let pinnedCellId: string | null = null;
let pinnedMouse = { x: NaN, y: NaN };

function buildPerimeterConstraints(
  graph: Graph,
  terminal: CellState,
  source: boolean
): ConnectionConstraint[] {
  const constraints: ConnectionConstraint[] = [];

  for (let i = 0; i < PERIMETER_SAMPLE_COUNT; i += 1) {
    const { x, y } = perimeterParamToRelative(i / PERIMETER_SAMPLE_COUNT);
    constraints.push(new ConnectionConstraint(new Point(x, y), true, `s${i}`));
  }

  if (
    hoverContext &&
    hoverContext.cellId === (terminal.cell.getId() || "") &&
    Number.isFinite(hoverContext.graphX) &&
    Number.isFinite(hoverContext.graphY)
  ) {
    const me = new InternalMouseEvent(new MouseEvent("mousemove"), terminal);
    me.graphX = hoverContext.graphX;
    me.graphY = hoverContext.graphY;
    const outline = graph.getOutlineConstraint(
      new Point(hoverContext.graphX, hoverContext.graphY),
      terminal,
      me
    );
    if (outline?.point && !constraintNear(constraints, outline.point)) {
      constraints.push(
        new ConnectionConstraint(
          new Point(outline.point.x, outline.point.y),
          true,
          "cursor"
        )
      );
    }
  }

  void source;
  return constraints;
}

export function isConnectableDiagramVertex(cell: Cell | null): cell is Cell {
  if (!cell?.isVertex() || !cell.isConnectable()) return false;
  const kind = parseCellValue(cell.getValue()).kind;
  return kind !== "freehand";
}

export function getConnectionHandler(graph: Graph): ConnectionHandlerPlugin | null {
  return graph.getPlugin("ConnectionHandler") as ConnectionHandlerPlugin | null;
}

export function getConstraintHandler(graph: Graph): ConstraintHandlerLike | null {
  return getConnectionHandler(graph)?.constraintHandler ?? null;
}

/** Show native connection-point dots on a vertex (hover or selection). */
export function pinConnectionPoints(
  graph: Graph,
  cell: Cell | null,
  opts?: PinConnectionOptions | MouseEvent
) {
  const conn = getConnectionHandler(graph);
  if (conn?.isConnecting?.()) return;

  const normalized: PinConnectionOptions =
    opts instanceof MouseEvent ? { evt: opts } : (opts ?? {});

  const ch = getConstraintHandler(graph);
  if (!ch) return;
  if (!cell || !isConnectableDiagramVertex(cell)) {
    pinnedCellId = null;
    hoverContext = null;
    ch.reset();
    return;
  }

  const cellId = cell.getId() || "";
  const state = graph.getView().getState(cell);
  if (!state) {
    pinnedCellId = null;
    hoverContext = null;
    ch.reset();
    return;
  }

  const gx = normalized.graphX ?? hoverContext?.graphX ?? state.getCenterX();
  const gy = normalized.graphY ?? hoverContext?.graphY ?? state.getCenterY();
  const mouseMoved =
    gx !== pinnedMouse.x || gy !== pinnedMouse.y || pinnedCellId !== cellId;

  hoverContext = { cellId, graphX: gx, graphY: gy };
  pinnedCellId = cellId;
  pinnedMouse = { x: gx, y: gy };

  if (!mouseMoved && ch.currentFocus?.cell === cell) {
    ch.redraw();
    return;
  }

  const me = new InternalMouseEvent(normalized.evt ?? new MouseEvent("mousemove"), state);
  me.graphX = gx;
  me.graphY = gy;
  ch.setFocus(me, state, true);
  ch.redraw();
}

/** Clear connection-point dots unless a connection drag is active. */
export function clearConnectionPoints(graph: Graph) {
  const conn = getConnectionHandler(graph);
  if (conn?.isConnecting?.()) return;
  pinnedCellId = null;
  hoverContext = null;
  pinnedMouse = { x: NaN, y: NaN };
  getConstraintHandler(graph)?.reset();
}

export function configureGraphConnections(graph: Graph, opts: ConnectionSetupOptions) {
  const baseOutline = graph.getOutlineConstraint.bind(graph);

  graph.getOutlineConstraint = (point, terminalState, me) => {
    const constraint = baseOutline(point, terminalState, me);
    if (constraint?.point) constraint.perimeter = true;
    return constraint;
  };

  graph.getAllConnectionConstraints = (terminal: CellState | null, source: boolean) => {
    if (!opts.connectionPointsEnabled()) return null;
    if (!terminal?.cell || !isConnectableDiagramVertex(terminal.cell)) return null;
    return buildPerimeterConstraints(graph, terminal, source);
  };

  const connectionHandler = getConnectionHandler(graph);
  const constraintHandler = connectionHandler?.constraintHandler;
  if (constraintHandler) {
    constraintHandler.pointImage = new ImageBox(CONNECTION_DOT_URI, 8, 8);
    constraintHandler.highlightColor = "#93c5fd";
  }
}
