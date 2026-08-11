import { apiFetch, ApiError } from "./api";
import type { DiagramDocument, DiagramPage } from "@/lib/diagram/model";
import {
  clearOrgId,
  ensureOrg,
  getOrgId,
  setOrgId,
} from "@/features/org";

const ORG_HEADER = "X-Organization-Id";
const AI_TIMEOUT_MS = 90_000;

function orgHeaders(organizationId?: string | null): HeadersInit {
  if (!organizationId) return {};
  return { [ORG_HEADER]: organizationId };
}

/** @deprecated Use getOrgId from @/features/org */
export function getDiagramOrgId(userId?: string | null): string | null {
  return getOrgId(userId);
}

/** @deprecated Use setOrgId from @/features/org */
export function setDiagramOrgId(id: string, userId?: string | null) {
  setOrgId(id, { userId });
}

/** @deprecated Use clearOrgId from @/features/org */
export function clearDiagramOrgId() {
  clearOrgId();
}

function isMembershipError(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 403) return false;
  return /not a member of this organization/i.test(err.message);
}

/** @deprecated Use ensureOrg from @/features/org */
export async function ensureDiagramOrg(userId?: string | null): Promise<string> {
  return ensureOrg(userId);
}

/** @deprecated Use withOrgRetry from @/features/diagrams */
export async function withDiagramOrgRetry<T>(
  userId: string | null | undefined,
  run: (orgId: string) => Promise<T>
): Promise<{ orgId: string; result: T }> {
  let orgId = await ensureOrg(userId);
  try {
    return { orgId, result: await run(orgId) };
  } catch (err) {
    if (!isMembershipError(err)) throw err;
    clearOrgId();
    orgId = await ensureOrg(userId);
    return { orgId, result: await run(orgId) };
  }
}

export type DiagramRow = {
  id: string;
  organizationId: string;
  folderId: string | null;
  title: string;
  content?: DiagramDocument;
  currentVersion: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type DiagramFolder = {
  id: string;
  organizationId: string;
  name: string;
  createdBy: string;
  createdAt: string;
};

export type DiagramShare = {
  id: string;
  diagramId: string;
  token: string;
  role: "VIEW" | "EDIT";
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  url?: string;
};

export type DiagramIssue = {
  severity: "error" | "warning" | "info";
  kind: string;
  message: string;
  nodeIds?: string[];
  edgeIds?: string[];
};

export type ExplainStep = {
  index: number;
  title: string;
  detail: string;
  nodeIds: string[];
};

export const diagramsApi = {
  list(organizationId: string, folderId?: string | null) {
    const q = folderId ? `?folderId=${encodeURIComponent(folderId)}` : "";
    return apiFetch(`/diagrams${q}`, {
      headers: orgHeaders(organizationId),
    }) as Promise<{ diagrams: DiagramRow[] }>;
  },

  get(organizationId: string, id: string) {
    return apiFetch(`/diagrams/${id}`, {
      headers: orgHeaders(organizationId),
    }) as Promise<{ diagram: DiagramRow }>;
  },

  create(
    organizationId: string,
    body: { title?: string; folderId?: string | null; content?: DiagramDocument }
  ) {
    return apiFetch(`/diagrams`, {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify(body),
    }) as Promise<{ diagram: DiagramRow }>;
  },

  update(
    organizationId: string,
    id: string,
    body: { title?: string; folderId?: string | null; content?: DiagramDocument }
  ) {
    return apiFetch(`/diagrams/${id}`, {
      method: "PATCH",
      headers: orgHeaders(organizationId),
      body: JSON.stringify(body),
    }) as Promise<{ diagram: DiagramRow }>;
  },

  duplicate(organizationId: string, id: string) {
    return apiFetch(`/diagrams/${id}/duplicate`, {
      method: "POST",
      headers: orgHeaders(organizationId),
    }) as Promise<{ diagram: DiagramRow }>;
  },

  remove(organizationId: string, id: string) {
    return apiFetch(`/diagrams/${id}`, {
      method: "DELETE",
      headers: orgHeaders(organizationId),
    }) as Promise<{ ok: boolean }>;
  },

  listVersions(organizationId: string, id: string) {
    return apiFetch(`/diagrams/${id}/versions`, {
      headers: orgHeaders(organizationId),
    }) as Promise<{
      versions: Array<{ id: string; version: number; createdAt: string; createdBy: string; contentJson?: string }>;
    }>;
  },

  restoreVersion(organizationId: string, id: string, version: number) {
    return apiFetch(`/diagrams/${id}/restore/${version}`, {
      method: "POST",
      headers: orgHeaders(organizationId),
    }) as Promise<{ diagram: DiagramRow }>;
  },

  listFolders(organizationId: string) {
    return apiFetch(`/diagrams/folders`, {
      headers: orgHeaders(organizationId),
    }) as Promise<{ folders: DiagramFolder[] }>;
  },

  createFolder(organizationId: string, name: string) {
    return apiFetch(`/diagrams/folders`, {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify({ name }),
    }) as Promise<{ folder: DiagramFolder }>;
  },

  renameFolder(organizationId: string, id: string, name: string) {
    return apiFetch(`/diagrams/folders/${id}`, {
      method: "PATCH",
      headers: orgHeaders(organizationId),
      body: JSON.stringify({ name }),
    }) as Promise<{ folder: DiagramFolder }>;
  },

  deleteFolder(organizationId: string, id: string) {
    return apiFetch(`/diagrams/folders/${id}`, {
      method: "DELETE",
      headers: orgHeaders(organizationId),
    }) as Promise<{ ok: boolean }>;
  },

  createShare(organizationId: string, id: string, role: "VIEW" | "EDIT" = "VIEW") {
    return apiFetch(`/diagrams/${id}/share`, {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify({ role }),
    }) as Promise<{ share: DiagramShare }>;
  },

  listShares(organizationId: string, id: string) {
    return apiFetch(`/diagrams/${id}/shares`, {
      headers: orgHeaders(organizationId),
    }) as Promise<{ shares: DiagramShare[] }>;
  },

  revokeShare(organizationId: string, shareId: string) {
    return apiFetch(`/diagrams/share/${shareId}`, {
      method: "DELETE",
      headers: orgHeaders(organizationId),
    }) as Promise<{ ok: boolean }>;
  },

  getShared(token: string) {
    return apiFetch(`/diagrams/shared/${token}`) as Promise<{
      diagram: DiagramRow & { content: DiagramDocument };
      share: { role: "VIEW" | "EDIT"; token: string };
    }>;
  },

  updateShared(token: string, body: { content: DiagramDocument; title?: string }) {
    return apiFetch(`/diagrams/shared/${token}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }) as Promise<{ diagram: DiagramRow }>;
  },

  aiGenerate(organizationId: string, prompt: string) {
    return apiFetch(`/diagrams/ai/generate`, {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify({ prompt }),
      timeoutMs: AI_TIMEOUT_MS,
    }) as Promise<{ document: DiagramDocument }>;
  },

  aiEdit(organizationId: string, id: string, instruction: string, page: DiagramPage) {
    return apiFetch(`/diagrams/${id}/ai/edit`, {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify({ instruction, page }),
      timeoutMs: AI_TIMEOUT_MS,
    }) as Promise<{ patch: unknown[]; page: DiagramPage }>;
  },

  aiFromImage(
    organizationId: string,
    payload: { imageBase64: string; mimeType: string; prompt?: string }
  ) {
    return apiFetch(`/diagrams/ai/from-image`, {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify(payload),
      timeoutMs: AI_TIMEOUT_MS,
    }) as Promise<{ document: DiagramDocument }>;
  },

  aiAnalyze(organizationId: string, id: string, page: DiagramPage) {
    return apiFetch(`/diagrams/${id}/ai/analyze`, {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify({ page }),
      timeoutMs: AI_TIMEOUT_MS,
    }) as Promise<{ issues: DiagramIssue[] }>;
  },

  aiExplain(organizationId: string, id: string, page: DiagramPage) {
    return apiFetch(`/diagrams/${id}/ai/explain`, {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify({ page }),
      timeoutMs: AI_TIMEOUT_MS,
    }) as Promise<{ steps: ExplainStep[]; summary: string }>;
  },

  aiExplainSelection(
    organizationId: string,
    id: string,
    page: DiagramPage,
    nodeIds: string[]
  ) {
    return apiFetch(`/diagrams/${id}/ai/explain-selection`, {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify({ page, nodeIds }),
      timeoutMs: AI_TIMEOUT_MS,
    }) as Promise<{ explanation: string }>;
  },

  aiDiffSummary(
    organizationId: string,
    id: string,
    fromVersion: number,
    toVersion: number
  ) {
    return apiFetch(`/diagrams/${id}/ai/diff-summary`, {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify({ fromVersion, toVersion }),
      timeoutMs: AI_TIMEOUT_MS,
    }) as Promise<{ summary: string }>;
  },
};
