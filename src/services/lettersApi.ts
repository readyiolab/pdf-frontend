import { apiFetch } from "./api";

const ORG_HEADER = "X-Organization-Id";

function orgHeaders(organizationId?: string | null): HeadersInit {
  if (!organizationId) return {};
  return { [ORG_HEADER]: organizationId };
}

export const lettersApi = {
  bootstrap() {
    return apiFetch("/letters/bootstrap", { method: "POST" }) as Promise<{
      org: { organization: any; role: string; membershipId: string };
      starters: { seeded: number; templates: any[] };
      warning?: string;
    }>;
  },

  listBrands(organizationId: string) {
    return apiFetch("/letters/brands", {
      headers: orgHeaders(organizationId),
    }) as Promise<{ brands: any[] }>;
  },

  createBrand(organizationId: string, body: Record<string, unknown>) {
    return apiFetch("/letters/brands", {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify(body),
    }) as Promise<{ brand: any }>;
  },

  updateBrand(organizationId: string, id: string, body: Record<string, unknown>) {
    return apiFetch(`/letters/brands/${id}`, {
      method: "PATCH",
      headers: orgHeaders(organizationId),
      body: JSON.stringify(body),
    }) as Promise<{ brand: any }>;
  },

  listTemplates(organizationId: string) {
    return apiFetch("/letters/templates", {
      headers: orgHeaders(organizationId),
    }) as Promise<{ templates: any[] }>;
  },

  seedTemplates(organizationId: string) {
    return apiFetch("/letters/templates/seed", {
      method: "POST",
      headers: orgHeaders(organizationId),
    }) as Promise<{ seeded: number; refreshed?: number; templates: any[] }>;
  },

  refreshStarterTemplates(organizationId: string, overwrite = false) {
    return apiFetch("/letters/templates/seed", {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify({ overwrite }),
    }) as Promise<{ seeded: number; refreshed: number; templates: any[] }>;
  },

  getTemplate(organizationId: string, id: string) {
    return apiFetch(`/letters/templates/${id}`, {
      headers: orgHeaders(organizationId),
    }) as Promise<{ template: any }>;
  },

  createTemplate(organizationId: string, body: Record<string, unknown>) {
    return apiFetch("/letters/templates", {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify(body),
    }) as Promise<{ template: any }>;
  },

  updateTemplate(organizationId: string, id: string, body: Record<string, unknown>) {
    return apiFetch(`/letters/templates/${id}`, {
      method: "PATCH",
      headers: orgHeaders(organizationId),
      body: JSON.stringify(body),
    }) as Promise<{ template: any }>;
  },

  listBatches(organizationId: string) {
    return apiFetch("/letters/batches", {
      headers: orgHeaders(organizationId),
    }) as Promise<{ batches: any[] }>;
  },

  createBatch(
    organizationId: string,
    body: { templateId: string; brandProfileId?: string | null }
  ) {
    return apiFetch("/letters/batches", {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify(body),
    }) as Promise<{ batch: any }>;
  },

  getBatch(organizationId: string, batchId: string) {
    return apiFetch(`/letters/batches/${batchId}`, {
      headers: orgHeaders(organizationId),
    }) as Promise<{ batch: any; template: any; sendCounts: Record<string, number> }>;
  },

  parseUpload(
    organizationId: string,
    batchId: string,
    body: {
      fileBase64?: string;
      sourceFileKey?: string;
      sourceFileName?: string;
    }
  ) {
    return apiFetch(`/letters/batches/${batchId}/parse`, {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify(body),
    }) as Promise<{
      batch: any;
      headers: string[];
      preview: any[];
      totalRows: number;
      rows: any[];
      systemFields: string[];
    }>;
  },

  applyMapping(
    organizationId: string,
    batchId: string,
    body: { mapping: Record<string, string>; rows: any[] }
  ) {
    return apiFetch(`/letters/batches/${batchId}/map`, {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify(body),
    }) as Promise<{ batch: any; preview: any[] }>;
  },

  validate(organizationId: string, batchId: string, sendModeSelected = false) {
    return apiFetch(`/letters/batches/${batchId}/validate`, {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify({ sendModeSelected }),
    }) as Promise<{ batch: any; summary: any }>;
  },

  issues(organizationId: string, batchId: string) {
    return apiFetch(`/letters/batches/${batchId}/issues`, {
      headers: orgHeaders(organizationId),
    }) as Promise<{ issues: any[] }>;
  },

  preview(organizationId: string, batchId: string) {
    return apiFetch(`/letters/batches/${batchId}/preview`, {
      headers: orgHeaders(organizationId),
    });
  },

  generate(
    organizationId: string,
    batchId: string,
    body: { approved: true; passwordMode?: string }
  ) {
    return apiFetch(`/letters/batches/${batchId}/generate`, {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify(body),
    });
  },

  progress(organizationId: string, batchId: string) {
    return apiFetch(`/letters/batches/${batchId}/progress`, {
      headers: orgHeaders(organizationId),
    });
  },

  send(organizationId: string, batchId: string, body: Record<string, unknown>) {
    return apiFetch(`/letters/batches/${batchId}/send`, {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify(body),
    });
  },

  report(organizationId: string, batchId: string) {
    return apiFetch(`/letters/batches/${batchId}/report`, {
      headers: orgHeaders(organizationId),
    }) as Promise<{ report: any[] }>;
  },

  async downloadPdfsZip(organizationId: string, batchId: string) {
    const started = (await apiFetch(`/letters/batches/${batchId}/pdfs/zip`, {
      method: "POST",
      headers: orgHeaders(organizationId),
    })) as { zipJobId: string };

    const deadline = Date.now() + 10 * 60 * 1000;
    while (Date.now() < deadline) {
      const status = (await apiFetch(
        `/letters/batches/${batchId}/pdfs/zip/${started.zipJobId}`,
        { headers: orgHeaders(organizationId) }
      )) as {
        status: string;
        url?: string;
        fileName?: string;
        error?: string;
      };

      if (status.status === "FAILED") {
        throw new Error(status.error || "Could not build ZIP");
      }
      if (status.status === "COMPLETED" && status.url) {
        const a = document.createElement("a");
        a.href = status.url;
        a.download = status.fileName || `letters-${batchId.slice(0, 8)}.zip`;
        a.rel = "noopener";
        a.click();
        return;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    throw new Error("ZIP is taking too long. Please try again.");
  },

  retryFailedGenerate(organizationId: string, batchId: string) {
    return apiFetch(`/letters/batches/${batchId}/generate/retry-failed`, {
      method: "POST",
      headers: orgHeaders(organizationId),
    });
  },

  mailAccounts() {
    return apiFetch("/letters/mail/accounts") as Promise<{ accounts: any[] }>;
  },

  mailAuthorize(provider: "OUTLOOK" | "GMAIL") {
    return apiFetch(`/letters/mail/authorize?provider=${provider}`) as Promise<{ url: string }>;
  },

  mailExchange(code: string, state: string) {
    return apiFetch("/letters/mail/exchange", {
      method: "POST",
      body: JSON.stringify({ code, state }),
    }) as Promise<{ account: { id: string; provider: string; emailAddress: string } }>;
  },

  disconnectMail(accountId: string) {
    return apiFetch(`/letters/mail/accounts/${accountId}`, {
      method: "DELETE",
    });
  },

  aiDraft(organizationId: string, body: { instruction: string; letterType?: string }) {
    return apiFetch("/letters/ai/draft", {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify(body),
    });
  },

  aiApplyDraft(organizationId: string, body: Record<string, unknown>) {
    return apiFetch("/letters/ai/apply-draft", {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify(body),
    });
  },

  aiPolish(
    organizationId: string,
    body: { text: string; mode: "formal" | "concise" | "add-disclaimer" }
  ) {
    return apiFetch("/letters/ai/polish", {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify(body),
    }) as Promise<{
      suggestion?: string;
      suggestionPreview?: string;
      contentJson?: any;
      mode: string;
      model?: string;
    }>;
  },

  aiSuggestMapping(organizationId: string, headers: string[]) {
    return apiFetch("/letters/ai/suggest-mapping", {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify({ headers }),
    });
  },

  aiAnomalies(organizationId: string, batchId: string) {
    return apiFetch(`/letters/batches/${batchId}/ai/anomalies`, {
      method: "POST",
      headers: orgHeaders(organizationId),
    });
  },

  aiSummary(organizationId: string, batchId: string) {
    return apiFetch(`/letters/batches/${batchId}/ai/summary`, {
      method: "POST",
      headers: orgHeaders(organizationId),
    });
  },

  aiQuery(organizationId: string, question: string) {
    return apiFetch("/letters/ai/query", {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify({ question }),
    });
  },

  listOrgs() {
    return apiFetch("/orgs") as Promise<{ organizations: any[] }>;
  },

  invite(organizationId: string, email: string, role: string) {
    return apiFetch("/orgs/invite", {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify({ email, role }),
    });
  },

  acceptInvite(token: string) {
    return apiFetch("/orgs/accept-invite", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },

  setRetention(organizationId: string, days: 30 | 60 | 90) {
    return apiFetch("/orgs/settings/retention", {
      method: "PATCH",
      headers: orgHeaders(organizationId),
      body: JSON.stringify({ days }),
    });
  },
};
