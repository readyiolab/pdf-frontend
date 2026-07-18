import { apiFetch, apiService } from "./api";
import type {
  SignAuditEntry,
  SignDocument,
  SignDocumentStatus,
  SignDocumentSummary,
  SignField,
  SignRecipient,
} from "@/lib/signing/types";

export interface Paginated<T> {
  pagination: { page: number; limit: number; total: number; totalPages: number };
  documents?: T[];
  entries?: T[];
}

export interface SigningStats {
  byStatus: Record<SignDocumentStatus, number>;
  total: number;
  completionRate: number;
}

/**
 * The subset of a field the API accepts. Server-owned fields (`value`,
 * `filledAt`, `documentId`) are stripped: they're set by the signing flow, and
 * echoing them back from the designer would let a stale client clobber a value
 * a recipient already entered.
 */
export type FieldPayload = Pick<
  SignField,
  "id" | "recipientId" | "type" | "label" | "page" | "x" | "y" | "width" | "height" | "required" | "locked" | "config"
>;

export const signingApi = {
  // --- Documents ---

  /**
   * Uploads a PDF and registers it as a signing document.
   *
   * Three steps, mirroring the existing tool upload flow: ask for a presigned
   * PUT, send the bytes straight to storage (never through our API), then tell
   * the API the object is there so it can verify the real bytes and create the
   * row.
   */
  async uploadDocument(
    file: File,
    pageCount: number,
    onProgress?: (percent: number) => void
  ): Promise<SignDocument> {
    const { uploadUrl, fileKey } = await apiFetch("/documents/presign", {
      method: "POST",
      body: JSON.stringify({
        fileName: file.name,
        contentType: "application/pdf",
        fileSize: file.size,
      }),
    });

    await apiService.uploadFileToS3(file, uploadUrl, onProgress);

    return apiFetch("/documents", {
      method: "POST",
      body: JSON.stringify({ fileKey, fileName: file.name, pageCount }),
    });
  },

  listDocuments: (params: {
    status?: SignDocumentStatus;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<Paginated<SignDocumentSummary>> => {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => [k, String(v)])
    );
    return apiFetch(`/documents?${query}`, { method: "GET" });
  },

  getStats: (): Promise<SigningStats> => apiFetch("/documents/stats", { method: "GET" }),

  getDocument: (id: string): Promise<SignDocument> => apiFetch(`/documents/${id}`, { method: "GET" }),

  /** Short-lived signed URL for the PDF bytes. Re-request rather than caching. */
  getFileUrl: (id: string, version?: number): Promise<{ url: string }> =>
    apiFetch(`/documents/${id}/file${version ? `?version=${version}` : ""}`, { method: "GET" }),

  updateDocument: (
    id: string,
    body: Partial<Pick<SignDocument, "title" | "message" | "flowType" | "expiresAt">>
  ): Promise<SignDocument> => apiFetch(`/documents/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteDocument: (id: string): Promise<{ id: string; deleted: boolean }> =>
    apiFetch(`/documents/${id}`, { method: "DELETE" }),

  // --- Recipients ---

  addRecipient: (
    documentId: string,
    body: {
      name: string;
      email: string;
      /** E.164. Required when authMethod is SMS_OTP. */
      phone?: string;
      role?: SignRecipient["role"];
      color?: string;
      signingOrder?: number;
      authMethod?: SignRecipient["authMethod"];
      accessCode?: string;
    }
  ): Promise<SignRecipient> =>
    apiFetch(`/documents/${documentId}/recipients`, { method: "POST", body: JSON.stringify(body) }),

  updateRecipient: (
    documentId: string,
    recipientId: string,
    body: Partial<{
      name: string;
      email: string;
      phone: string;
      role: SignRecipient["role"];
      color: string;
      signingOrder: number;
      authMethod: SignRecipient["authMethod"];
      accessCode: string;
    }>
  ): Promise<SignRecipient> =>
    apiFetch(`/documents/${documentId}/recipients/${recipientId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  removeRecipient: (documentId: string, recipientId: string): Promise<{ id: string; deleted: boolean }> =>
    apiFetch(`/documents/${documentId}/recipients/${recipientId}`, { method: "DELETE" }),

  // --- Fields ---

  /** Bulk replace: the designer owns the whole field set for a document. */
  saveFields: (documentId: string, fields: FieldPayload[]): Promise<{ fields: SignField[] }> =>
    apiFetch(`/documents/${documentId}/fields`, {
      method: "PUT",
      body: JSON.stringify({ fields }),
    }),

  // --- Audit ---

  getAudit: (documentId: string, page = 1, limit = 50): Promise<Paginated<SignAuditEntry>> =>
    apiFetch(`/documents/${documentId}/audit?page=${page}&limit=${limit}`, { method: "GET" }),
};
