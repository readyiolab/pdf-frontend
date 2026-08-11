import type { DiagramPage } from "./model";

export type DiagramIssue = {
  severity: "error" | "warning" | "info";
  kind: string;
  message: string;
  nodeIds?: string[];
  edgeIds?: string[];
};

/** Local structural checks mirroring the backend analyze helpers. */
export function analyzePageLocal(page: DiagramPage): DiagramIssue[] {
  const issues: DiagramIssue[] = [];
  const nodeIds = new Set(page.nodes.map((n) => n.id));
  const labels = new Map<string, string[]>();

  for (const e of page.edges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) {
      issues.push({
        severity: "error",
        kind: "dangling_edge",
        message: `Connector "${e.label || e.id}" references a missing shape.`,
        edgeIds: [e.id],
      });
    }
  }

  for (const n of page.nodes) {
    const key = (n.label || "").trim().toLowerCase();
    if (!key) {
      issues.push({
        severity: "warning",
        kind: "unnamed",
        message: "A shape has no label.",
        nodeIds: [n.id],
      });
    } else {
      const list = labels.get(key) || [];
      list.push(n.id);
      labels.set(key, list);
    }
  }
  for (const [, ids] of labels) {
    if (ids.length > 1) {
      issues.push({
        severity: "warning",
        kind: "duplicate",
        message: "Duplicate component labels detected.",
        nodeIds: ids,
      });
    }
  }

  for (let i = 0; i < page.nodes.length; i++) {
    for (let j = i + 1; j < page.nodes.length; j++) {
      const a = page.nodes[i]!;
      const b = page.nodes[j]!;
      if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
        issues.push({
          severity: "info",
          kind: "overlap",
          message: `"${a.label || "Shape"}" overlaps "${b.label || "Shape"}".`,
          nodeIds: [a.id, b.id],
        });
      }
    }
  }

  if (page.nodes.length > 1) {
    const adj = new Map<string, Set<string>>();
    for (const n of page.nodes) adj.set(n.id, new Set());
    for (const e of page.edges) {
      if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
      adj.get(e.source)!.add(e.target);
      adj.get(e.target)!.add(e.source);
    }
    const seen = new Set<string>();
    const start = page.nodes[0]!.id;
    const q = [start];
    seen.add(start);
    while (q.length) {
      const cur = q.shift()!;
      for (const n of adj.get(cur) || []) {
        if (!seen.has(n)) {
          seen.add(n);
          q.push(n);
        }
      }
    }
    const isolated = page.nodes.filter((n) => !seen.has(n.id)).map((n) => n.id);
    if (isolated.length) {
      issues.push({
        severity: "warning",
        kind: "disconnected",
        message: `${isolated.length} component(s) are disconnected from the main flow.`,
        nodeIds: isolated.slice(0, 12),
      });
    }
  }

  return issues;
}
