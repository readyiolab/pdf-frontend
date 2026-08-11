import type { DiagramEdge, DiagramNode, DiagramPage } from "../model";

function escId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, "_");
  return /^[0-9]/.test(cleaned) ? `n_${cleaned}` : cleaned || "n";
}

function escLabel(label: string): string {
  return label.replace(/"/g, "#quot;").replace(/[\[\]]/g, "");
}

function mermaidShape(node: DiagramNode): string {
  const id = escId(node.id);
  const label = escLabel(node.label || node.id);
  const shape = (node.shape || "rectangle").toLowerCase();
  switch (shape) {
    case "ellipse":
    case "circle":
    case "terminator":
      return `${id}(("${label}"))`;
    case "diamond":
    case "rhombus":
    case "decision":
      return `${id}{"${label}"}`;
    case "cylinder":
      return `${id}[("${label}")]`;
    case "hexagon":
      return `${id}{{"${label}"}}`;
    case "rounded":
    case "process":
      return `${id}("${label}")`;
    case "parallelogram":
    case "data":
      return `${id}[/"${label}"/]`;
    default:
      return `${id}["${label}"]`;
  }
}

/** Export page as Mermaid flowchart TD. */
export function toMermaid(page: DiagramPage): string {
  const lines: string[] = ["flowchart TD"];
  const ids = new Set(page.nodes.map((n) => n.id));

  for (const node of page.nodes) {
    if (node.kind === "freehand") continue;
    lines.push(`  ${mermaidShape(node)}`);
  }

  for (const edge of page.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) continue;
    const src = escId(edge.source);
    const tgt = escId(edge.target);
    const label = (edge.label || "").trim();
    if (label) {
      lines.push(`  ${src} -->|"${escLabel(label)}"| ${tgt}`);
    } else {
      lines.push(`  ${src} --> ${tgt}`);
    }
  }

  return lines.join("\n");
}

function sqlIdent(label: string): string {
  const base = (label || "table")
    .trim()
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  const name = base || "table";
  return /^[0-9]/.test(name) ? `t_${name}` : name;
}

/** CREATE TABLE stubs from rectangle/cylinder labeled nodes. */
export function toSql(page: DiagramPage): string {
  const tables = page.nodes.filter((n) => {
    if (n.kind && n.kind !== "shape" && n.kind !== "table") return false;
    if (n.kind === "table") return true;
    const s = (n.shape || "").toLowerCase();
    return s === "rectangle" || s === "rounded" || s === "cylinder" || s === "swimlane";
  });

  if (!tables.length) {
    return "-- No table-like shapes found\n";
  }

  const lines: string[] = ["-- Generated from diagram", ""];
  for (const node of tables) {
    const name = sqlIdent(node.label || node.id);
    if (node.table?.cells?.length) {
      const cols = node.table.cells
        .filter((c) => c.r === 0 || (c.text && c.r === 1))
        .map((c) => c.text)
        .filter(Boolean) as string[];
      const header = cols.length
        ? cols
        : ["id UUID PRIMARY KEY", "created_at TIMESTAMPTZ DEFAULT now()"];
      lines.push(`CREATE TABLE ${name} (`);
      header.forEach((col, i) => {
        const isLast = i === header.length - 1;
        const colDef = col.includes(" ") ? col : `${sqlIdent(col)} TEXT`;
        lines.push(`  ${colDef}${isLast ? "" : ","}`);
      });
      lines.push(");", "");
    } else {
      lines.push(`CREATE TABLE ${name} (`);
      lines.push("  id UUID PRIMARY KEY,");
      lines.push("  name TEXT,");
      lines.push("  created_at TIMESTAMPTZ DEFAULT now()");
      lines.push(");", "");
    }
  }

  // FK stubs from edges between tables
  const tableIds = new Set(tables.map((t) => t.id));
  const byId = new Map(tables.map((t) => [t.id, t]));
  for (const edge of page.edges) {
    if (!tableIds.has(edge.source) || !tableIds.has(edge.target)) continue;
    const src = sqlIdent(byId.get(edge.source)!.label || edge.source);
    const tgt = sqlIdent(byId.get(edge.target)!.label || edge.target);
    lines.push(
      `-- ALTER TABLE ${src} ADD COLUMN ${tgt}_id UUID REFERENCES ${tgt}(id);`
    );
  }

  return lines.join("\n");
}

/** Stub Terraform aws_resource comments from nodes. */
export function toTerraform(page: DiagramPage): string {
  const lines: string[] = [
    "# Generated Terraform stubs from diagram",
    "",
  ];
  for (const node of page.nodes) {
    if (node.kind === "freehand") continue;
    const name = sqlIdent(node.label || node.id);
    const shape = (node.shape || "rectangle").toLowerCase();
    let resource = "aws_resource";
    if (shape === "cylinder") resource = "aws_db_instance";
    else if (shape === "cloud") resource = "aws_cloudformation_stack";
    else if (shape === "ellipse" || shape === "circle") resource = "aws_lb";
    else if (shape === "hexagon") resource = "aws_security_group";
    else resource = "aws_instance";

    lines.push(`# ${node.label || node.id}`);
    lines.push(`resource "${resource}" "${name}" {`);
    lines.push(`  # TODO: configure from diagram node ${node.id}`);
    lines.push(`  tags = {`);
    lines.push(`    Name = "${(node.label || name).replace(/"/g, '\\"')}"`);
    lines.push(`  }`);
    lines.push(`}`, "");
  }
  if (page.nodes.filter((n) => n.kind !== "freehand").length === 0) {
    lines.push("# No nodes to export");
  }
  return lines.join("\n");
}

/** Stub Kubernetes YAML from nodes. */
export function toKubernetes(page: DiagramPage): string {
  const docs: string[] = [];
  for (const node of page.nodes) {
    if (node.kind === "freehand") continue;
    const name = sqlIdent(node.label || node.id).replace(/_/g, "-");
    const shape = (node.shape || "").toLowerCase();
    if (shape === "cylinder") {
      docs.push(
        [
          "apiVersion: v1",
          "kind: PersistentVolumeClaim",
          "metadata:",
          `  name: ${name}-pvc`,
          "spec:",
          "  accessModes: [ReadWriteOnce]",
          "  resources:",
          "    requests:",
          "      storage: 1Gi",
        ].join("\n")
      );
    } else {
      docs.push(
        [
          "apiVersion: apps/v1",
          "kind: Deployment",
          "metadata:",
          `  name: ${name}`,
          "  labels:",
          `    app: ${name}`,
          "spec:",
          "  replicas: 1",
          "  selector:",
          "    matchLabels:",
          `      app: ${name}`,
          "  template:",
          "    metadata:",
          "      labels:",
          `        app: ${name}`,
          "    spec:",
          "      containers:",
          "        - name: app",
          "          image: nginx:alpine",
          "          ports:",
          "            - containerPort: 80",
        ].join("\n")
      );
    }
  }
  if (!docs.length) return "# No nodes to export\n";
  return docs.join("\n---\n") + "\n";
}

function looksLikeApi(label: string): boolean {
  const t = label.trim();
  if (/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/i.test(t)) return true;
  if (t.startsWith("/")) return true;
  if (/\bapi\b/i.test(t)) return true;
  return false;
}

function pathFromLabel(label: string): { method: string; path: string } {
  const m = label.trim().match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)/i);
  if (m) return { method: m[1]!.toLowerCase(), path: m[2]! };
  if (label.trim().startsWith("/")) return { method: "get", path: label.trim().split(/\s+/)[0]! };
  const slug = "/" + sqlIdent(label).replace(/_/g, "-");
  return { method: "get", path: slug };
}

/** Stub OpenAPI paths from API-ish labels. */
export function toOpenApi(page: DiagramPage): string {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const node of page.nodes) {
    if (node.kind === "freehand") continue;
    const label = node.label || "";
    if (!looksLikeApi(label) && (node.shape || "").toLowerCase() !== "rectangle") {
      // still include rectangle process-like nodes as stub paths
      if (!label.trim()) continue;
    }
    if (!label.trim()) continue;
    const { method, path } = pathFromLabel(label);
    if (!paths[path]) paths[path] = {};
    paths[path]![method] = {
      summary: label,
      operationId: sqlIdent(`${method}_${path}`),
      responses: {
        "200": { description: "OK" },
      },
    };
  }

  const doc = {
    openapi: "3.0.3",
    info: {
      title: "Diagram API",
      version: "0.1.0",
      description: "Stub generated from diagram",
    },
    paths: Object.keys(paths).length ? paths : {
      "/health": {
        get: {
          summary: "Health check",
          responses: { "200": { description: "OK" } },
        },
      },
    },
  };

  return JSON.stringify(doc, null, 2);
}

// --- Mermaid import ---

type MermaidNodeTok = { id: string; label: string; shape: string };

function parseNodeToken(token: string): MermaidNodeTok | null {
  const t = token.trim();
  if (!t) return null;

  // id((label)) stadium/circle
  let m = t.match(/^([A-Za-z0-9_]+) \(\((.+)\)\)$/) || t.match(/^([A-Za-z0-9_]+)\(\((.+)\)\)$/);
  if (m) return { id: m[1]!, label: stripQuotes(m[2]!), shape: "ellipse" };

  // id{label} diamond
  m = t.match(/^([A-Za-z0-9_]+)\{(.+)\}$/);
  if (m) return { id: m[1]!, label: stripQuotes(m[2]!), shape: "diamond" };

  // id{{label}} hexagon
  m = t.match(/^([A-Za-z0-9_]+)\{\{(.+)\}\}$/);
  if (m) return { id: m[1]!, label: stripQuotes(m[2]!), shape: "hexagon" };

  // id[(label)] cylinder
  m = t.match(/^([A-Za-z0-9_]+)\[\((.+)\)\]$/);
  if (m) return { id: m[1]!, label: stripQuotes(m[2]!), shape: "cylinder" };

  // id(label) rounded
  m = t.match(/^([A-Za-z0-9_]+)\((.+)\)$/);
  if (m) return { id: m[1]!, label: stripQuotes(m[2]!), shape: "rounded" };

  // id[/label/] parallelogram
  m = t.match(/^([A-Za-z0-9_]+)\[\/(.+)\/\]$/);
  if (m) return { id: m[1]!, label: stripQuotes(m[2]!), shape: "parallelogram" };

  // id[label] rectangle
  m = t.match(/^([A-Za-z0-9_]+)\[(.+)\]$/);
  if (m) return { id: m[1]!, label: stripQuotes(m[2]!), shape: "rectangle" };

  // bare id
  m = t.match(/^([A-Za-z0-9_]+)$/);
  if (m) return { id: m[1]!, label: m[1]!, shape: "rectangle" };

  return null;
}

function stripQuotes(s: string): string {
  return s.replace(/^["']|["']$/g, "").replace(/#quot;/g, '"').trim();
}

/**
 * Basic Mermaid flowchart TD/LR parser.
 * Supports lines like: `A[Label] --> B[Label]` and `A -->|yes| B`.
 */
export function fromMermaid(text: string): DiagramPage {
  const nodes = new Map<string, DiagramNode>();
  const edges: DiagramEdge[] = [];
  let direction: "TD" | "LR" = "TD";

  const ensureNode = (tok: MermaidNodeTok) => {
    if (nodes.has(tok.id)) {
      const existing = nodes.get(tok.id)!;
      if (tok.label && tok.label !== tok.id) existing.label = tok.label;
      if (tok.shape) existing.shape = tok.shape;
      return;
    }
    nodes.set(tok.id, {
      id: tok.id,
      label: tok.label,
      shape: tok.shape,
      x: 0,
      y: 0,
      w: 120,
      h: 60,
      kind: "shape",
    });
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("%%")) continue;

    const dir = line.match(/^flowchart\s+(TD|TB|LR|RL)\b/i) || line.match(/^graph\s+(TD|TB|LR|RL)\b/i);
    if (dir) {
      const d = dir[1]!.toUpperCase();
      direction = d === "LR" || d === "RL" ? "LR" : "TD";
      continue;
    }

    // A[Label] -->|text| B[Label]  OR  A --> B
    const edgeRe =
      /^(.+?)\s*--(?:-?>|>)\s*(?:\|([^|]*)\|\s*)?(.+)$/;
    const em = line.match(edgeRe);
    if (em) {
      const left = parseNodeToken(em[1]!);
      const right = parseNodeToken(em[3]!);
      const edgeLabel = em[2] != null ? stripQuotes(em[2]) : "";
      if (left) ensureNode(left);
      if (right) ensureNode(right);
      if (left && right) {
        edges.push({
          id: `e_${left.id}_${right.id}_${edges.length}`,
          source: left.id,
          target: right.id,
          label: edgeLabel,
        });
      }
      continue;
    }

    const alone = parseNodeToken(line);
    if (alone) ensureNode(alone);
  }

  // Layout positions
  const list = Array.from(nodes.values());
  const colGap = 200;
  const rowGap = 100;
  if (direction === "LR") {
    list.forEach((n, i) => {
      n.x = 40 + i * colGap;
      n.y = 80;
    });
  } else {
    // Simple layered layout by BFS from roots
    const indeg = new Map<string, number>();
    const adj = new Map<string, string[]>();
    for (const n of list) {
      indeg.set(n.id, 0);
      adj.set(n.id, []);
    }
    for (const e of edges) {
      if (!indeg.has(e.target) || !adj.has(e.source)) continue;
      indeg.set(e.target, (indeg.get(e.target) || 0) + 1);
      adj.get(e.source)!.push(e.target);
    }
    const depth = new Map<string, number>();
    const q: string[] = [];
    for (const n of list) {
      if ((indeg.get(n.id) || 0) === 0) {
        q.push(n.id);
        depth.set(n.id, 0);
      }
    }
    if (!q.length && list[0]) {
      q.push(list[0].id);
      depth.set(list[0].id, 0);
    }
    while (q.length) {
      const cur = q.shift()!;
      const d = depth.get(cur) || 0;
      for (const next of adj.get(cur) || []) {
        if (!depth.has(next)) {
          depth.set(next, d + 1);
          q.push(next);
        }
      }
    }
    const byDepth = new Map<number, DiagramNode[]>();
    for (const n of list) {
      const d = depth.get(n.id) ?? 0;
      const arr = byDepth.get(d) || [];
      arr.push(n);
      byDepth.set(d, arr);
    }
    for (const [d, row] of byDepth) {
      row.forEach((n, i) => {
        n.x = 40 + i * colGap;
        n.y = 40 + d * rowGap;
      });
    }
  }

  return {
    id: crypto.randomUUID(),
    name: "Mermaid Import",
    nodes: list,
    edges,
  };
}
