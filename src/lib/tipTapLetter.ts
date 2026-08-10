/** TipTap helpers for Letter Studio AI polish / previews (frontend). */

export function tipTapDocToPlainText(doc: any): string {
  if (!doc) return "";
  if (typeof doc === "string") {
    try {
      return tipTapDocToPlainText(JSON.parse(doc));
    } catch {
      return doc;
    }
  }
  const lines: string[] = [];
  const walk = (node: any) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node.type === "paragraph" || node.type === "heading" || node.type === "listItem") {
      const text = collectText(node).trim();
      if (text) lines.push(text);
      return;
    }
    if (node.content) walk(node.content);
  };
  walk(doc.content || doc);
  return lines.join("\n\n");
}

function collectText(node: any): string {
  if (!node) return "";
  if (node.type === "text") return String(node.text || "");
  if (node.type === "hardBreak") return "\n";
  if (Array.isArray(node)) return node.map(collectText).join("");
  if (node.content) return node.content.map(collectText).join("");
  return "";
}

export function plainTextToTipTapDoc(text: string): any {
  const lines = String(text || "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
  return {
    type: "doc",
    content: lines.map((line, i) => {
      if (i === 0 && line.length < 80 && !line.includes("{{")) {
        return {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: line }],
        };
      }
      return { type: "paragraph", content: tokenizeLine(line) };
    }),
  };
}

function tokenizeLine(line: string): any[] {
  const parts: any[] = [];
  const re = /(\{\{[A-Za-z0-9_]+\}\})/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > last) {
      parts.push({ type: "text", text: line.slice(last, m.index) });
    }
    parts.push({ type: "text", marks: [{ type: "bold" }], text: m[1] });
    last = m.index + m[1].length;
  }
  if (last < line.length) {
    parts.push({ type: "text", text: line.slice(last) });
  }
  return parts.length ? parts : [{ type: "text", text: line }];
}

/** Sample employee values for live letter preview. */
export const SAMPLE_EMPLOYEE: Record<string, string> = {
  Employee_ID: "EMP001",
  Employee_Name: "Rahul Sharma",
  Employee_Email: "rahul.sharma@example.com",
  Designation: "Software Engineer",
  Department: "Engineering",
  Old_CTC: "800000",
  New_CTC: "896000",
  Increment_Percent: "12",
  Effective_Date: "1 April 2026",
  Manager_Name: "Priya Mehta",
  PDF_Password: "",
};

export function fillPreviewTokens(text: string, data: Record<string, string> = SAMPLE_EMPLOYEE): string {
  return text.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    return data[key] != null && data[key] !== "" ? String(data[key]) : `{{${key}}}`;
  });
}
