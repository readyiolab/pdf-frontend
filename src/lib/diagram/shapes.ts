export type ShapeDef = {
  id: string;
  label: string;
  shape: string;
  w?: number;
  h?: number;
  category: string;
  /** Simple SVG path/preview hint for the palette thumbnail */
  preview: "rect" | "rounded" | "ellipse" | "diamond" | "hex" | "cyl" | "cloud" | "actor" | "tri" | "arrow" | "line" | "doc" | "note" | "dellipse" | "swimlane" | "parallelogram";
};

export type ShapeCategory = {
  id: string;
  label: string;
  defaultOpen?: boolean;
  shapes: ShapeDef[];
};

const general: ShapeDef[] = [
  { id: "rect", label: "Rectangle", shape: "rectangle", preview: "rect", category: "general" },
  { id: "rounded", label: "Rounded", shape: "rounded", preview: "rounded", category: "general" },
  { id: "ellipse", label: "Ellipse", shape: "ellipse", preview: "ellipse", category: "general" },
  { id: "circle", label: "Circle", shape: "circle", w: 80, h: 80, preview: "ellipse", category: "general" },
  { id: "diamond", label: "Diamond", shape: "diamond", preview: "diamond", category: "general" },
  { id: "parallelogram", label: "Parallelogram", shape: "parallelogram", preview: "parallelogram", category: "general" },
  { id: "hexagon", label: "Hexagon", shape: "hexagon", preview: "hex", category: "general" },
  { id: "triangle", label: "Triangle", shape: "triangle", preview: "tri", category: "general" },
  { id: "cylinder", label: "Cylinder", shape: "cylinder", preview: "cyl", category: "general" },
  { id: "cloud", label: "Cloud", shape: "cloud", preview: "cloud", category: "general" },
  { id: "actor", label: "Actor", shape: "actor", w: 40, h: 80, preview: "actor", category: "general" },
  { id: "document", label: "Document", shape: "document", preview: "doc", category: "general" },
  { id: "note", label: "Note", shape: "note", preview: "note", category: "general" },
  { id: "dellipse", label: "Double Ellipse", shape: "doubleEllipse", preview: "dellipse", category: "general" },
  { id: "text", label: "Text", shape: "text", w: 100, h: 30, preview: "rect", category: "general" },
  { id: "line", label: "Line", shape: "line", w: 120, h: 10, preview: "line", category: "general" },
  { id: "arrow", label: "Arrow", shape: "arrow", w: 100, h: 40, preview: "arrow", category: "general" },
  { id: "swimlane", label: "Swimlane", shape: "swimlane", w: 200, h: 200, preview: "swimlane", category: "general" },
];

const flowchart: ShapeDef[] = [
  { id: "fc-process", label: "Process", shape: "process", preview: "rounded", category: "flowchart" },
  { id: "fc-decision", label: "Decision", shape: "decision", preview: "diamond", category: "flowchart" },
  { id: "fc-start", label: "Start / End", shape: "terminator", preview: "ellipse", category: "flowchart" },
  { id: "fc-data", label: "Data", shape: "parallelogram", preview: "parallelogram", category: "flowchart" },
  { id: "fc-doc", label: "Document", shape: "document", preview: "doc", category: "flowchart" },
  { id: "fc-db", label: "Database", shape: "cylinder", preview: "cyl", category: "flowchart" },
  { id: "fc-prep", label: "Preparation", shape: "hexagon", preview: "hex", category: "flowchart" },
  { id: "fc-manual", label: "Manual Input", shape: "parallelogram", preview: "parallelogram", category: "flowchart" },
  { id: "fc-display", label: "Display", shape: "ellipse", preview: "ellipse", category: "flowchart" },
  { id: "fc-or", label: "Or", shape: "circle", w: 50, h: 50, preview: "ellipse", category: "flowchart" },
  { id: "fc-sum", label: "Summing Junction", shape: "circle", w: 50, h: 50, preview: "dellipse", category: "flowchart" },
  { id: "fc-offpage", label: "Off-page", shape: "triangle", preview: "tri", category: "flowchart" },
];

const arrows: ShapeDef[] = [
  { id: "arr-right", label: "Arrow Right", shape: "arrow", w: 100, h: 40, preview: "arrow", category: "arrows" },
  { id: "arr-bi", label: "Double Arrow", shape: "arrow", w: 100, h: 40, preview: "arrow", category: "arrows" },
  { id: "arr-line", label: "Directional Line", shape: "line", w: 120, h: 10, preview: "line", category: "arrows" },
];

const uml: ShapeDef[] = [
  { id: "uml-class", label: "Class", shape: "swimlane", w: 160, h: 120, preview: "swimlane", category: "uml" },
  { id: "uml-actor", label: "Actor", shape: "actor", w: 40, h: 80, preview: "actor", category: "uml" },
  { id: "uml-usecase", label: "Use Case", shape: "ellipse", w: 140, h: 60, preview: "ellipse", category: "uml" },
  { id: "uml-note", label: "Note", shape: "note", preview: "note", category: "uml" },
  { id: "uml-component", label: "Component", shape: "rectangle", preview: "rect", category: "uml" },
  { id: "uml-interface", label: "Interface", shape: "circle", w: 40, h: 40, preview: "ellipse", category: "uml" },
  { id: "uml-package", label: "Package", shape: "swimlane", w: 180, h: 140, preview: "swimlane", category: "uml" },
  { id: "uml-state", label: "State", shape: "rounded", preview: "rounded", category: "uml" },
];

const er: ShapeDef[] = [
  { id: "er-entity", label: "Entity", shape: "rectangle", preview: "rect", category: "er" },
  { id: "er-weak", label: "Weak Entity", shape: "rectangle", preview: "rect", category: "er" },
  { id: "er-attr", label: "Attribute", shape: "ellipse", preview: "ellipse", category: "er" },
  { id: "er-key", label: "Key Attribute", shape: "ellipse", preview: "ellipse", category: "er" },
  { id: "er-rel", label: "Relationship", shape: "diamond", preview: "diamond", category: "er" },
  { id: "er-ident", label: "Identifying Rel.", shape: "diamond", preview: "diamond", category: "er" },
];

const network: ShapeDef[] = [
  { id: "net-server", label: "Server", shape: "cylinder", preview: "cyl", category: "network" },
  { id: "net-cloud", label: "Cloud", shape: "cloud", w: 120, h: 80, preview: "cloud", category: "network" },
  { id: "net-router", label: "Router", shape: "hexagon", preview: "hex", category: "network" },
  { id: "net-pc", label: "Workstation", shape: "rectangle", preview: "rect", category: "network" },
  { id: "net-db", label: "Database", shape: "cylinder", preview: "cyl", category: "network" },
  { id: "net-firewall", label: "Firewall", shape: "hexagon", preview: "hex", category: "network" },
  { id: "net-lb", label: "Load Balancer", shape: "ellipse", preview: "ellipse", category: "network" },
  { id: "net-container", label: "Container", shape: "rounded", preview: "rounded", category: "network" },
];

const misc: ShapeDef[] = [
  { id: "misc-callout", label: "Callout", shape: "cloud", preview: "cloud", category: "misc" },
  { id: "misc-card", label: "Card", shape: "rounded", preview: "rounded", category: "misc" },
  { id: "misc-badge", label: "Badge", shape: "ellipse", w: 60, h: 40, preview: "ellipse", category: "misc" },
  { id: "misc-step", label: "Step", shape: "hexagon", preview: "hex", category: "misc" },
];

const advanced: ShapeDef[] = [
  { id: "adv-cross", label: "Cross", shape: "plus" as string, preview: "rect", category: "advanced", w: 60, h: 60 },
  { id: "adv-tape", label: "Tape Data", shape: "cylinder", preview: "cyl", category: "advanced" },
  { id: "adv-or-gate", label: "Or Gate", shape: "ellipse", preview: "ellipse", category: "advanced" },
  { id: "adv-and-gate", label: "And Gate", shape: "ellipse", preview: "ellipse", category: "advanced" },
];

const basic: ShapeDef[] = [
  { id: "basic-rect", label: "Rectangle", shape: "rectangle", preview: "rect", category: "basic" },
  { id: "basic-ell", label: "Ellipse", shape: "ellipse", preview: "ellipse", category: "basic" },
  { id: "basic-tri", label: "Triangle", shape: "triangle", preview: "tri", category: "basic" },
  { id: "basic-dia", label: "Diamond", shape: "diamond", preview: "diamond", category: "basic" },
  { id: "basic-line", label: "Line", shape: "line", w: 120, h: 10, preview: "line", category: "basic" },
];

/** Categories shown by default (General expanded). Extra ones behind "More Shapes…". */
export const DEFAULT_CATEGORY_IDS = new Set(["general", "flowchart", "arrows"]);

export const SHAPE_CATEGORIES: ShapeCategory[] = [
  { id: "general", label: "General", defaultOpen: true, shapes: general },
  { id: "misc", label: "Misc", shapes: misc },
  { id: "advanced", label: "Advanced", shapes: advanced },
  { id: "basic", label: "Basic", shapes: basic },
  { id: "arrows", label: "Arrows", shapes: arrows },
  { id: "flowchart", label: "Flowchart", defaultOpen: true, shapes: flowchart },
  { id: "uml", label: "UML", shapes: uml },
  { id: "er", label: "Entity Relation", shapes: er },
  { id: "network", label: "Network / Cloud", shapes: network },
];

export function allShapes(): ShapeDef[] {
  return SHAPE_CATEGORIES.flatMap((c) => c.shapes);
}

export function findShape(id: string): ShapeDef | undefined {
  return allShapes().find((s) => s.id === id);
}
