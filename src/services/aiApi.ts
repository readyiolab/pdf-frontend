import { apiFetch, apiService } from "./api";

export interface AiQuota {
  used: number;
  limit: number;
  remaining: number;
  plan: "FREE" | "PRO";
}

export interface AiResult {
  text: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

export type SummaryStyle = "concise" | "detailed" | "bullets";
export type ExplainAudience = "simple" | "legal" | "technical";
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Upload a PDF once, get back the fileKey every AI action then reuses. */
async function uploadPdf(file: File, onProgress?: (p: number) => void): Promise<string> {
  const { uploadUrl, fileKey } = await apiFetch("/ai/presign", {
    method: "POST",
    body: JSON.stringify({ fileName: file.name, contentType: "application/pdf", fileSize: file.size }),
  });
  await apiService.uploadFileToS3(file, uploadUrl, onProgress);
  return fileKey;
}

export const aiApi = {
  uploadPdf,

  getQuota: (): Promise<AiQuota> => apiFetch("/ai/quota", { method: "GET" }),

  summarize: (fileKey: string, style: SummaryStyle): Promise<AiResult> =>
    apiFetch("/ai/summarize", { method: "POST", body: JSON.stringify({ fileKey, style }) }),

  explain: (fileKey: string, audience: ExplainAudience): Promise<AiResult> =>
    apiFetch("/ai/explain", { method: "POST", body: JSON.stringify({ fileKey, audience }) }),

  /** Stateless chat: resend the whole conversation each turn. */
  chat: (fileKey: string, messages: ChatMessage[]): Promise<AiResult> =>
    apiFetch("/ai/chat", { method: "POST", body: JSON.stringify({ fileKey, messages }) }),
};
