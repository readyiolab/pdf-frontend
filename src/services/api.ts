export interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  emailVerified?: boolean;
  authProvider?: string;
  dailyOpsUsed: number;
  dailyOpsLimit: number;
  dailyOpsRemaining: number;
  dailyOpsResetAt: string;
  createdAt: string;
  jobs?: Job[];
  isGuest?: boolean;
}

export interface Job {
  id: string;
  userId: string;
  tool: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  inputFiles: string[];
  outputFile: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string;
}

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

class ApiError extends Error {
  public status: number;
  constructor(message: string, status: number = 500) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export type ApiFetchOptions = RequestInit & {
  /** Override default 15s abort timeout (ms). */
  timeoutMs?: number;
};

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = 3,
  timeoutMs: number = 15000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      if (!navigator.onLine) {
        throw new Error("You appear to be offline. Please check your internet connection.");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err: any) {
      lastError = err;
      if (err.name === "AbortError") {
        // Do not retry timeouts — that turns a 15s wait into ~45s of pain.
        throw new Error("Request timed out. Please try again.");
      }

      // Only retry transient network failures
      if (err.name !== "TypeError") {
        throw err;
      }

      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, Math.pow(2, i) * 1000));
      }
    }
  }

  throw lastError || new Error("Network request failed after multiple retries.");
}

/**
 * Shared fetch wrapper: attaches the JWT, retries transient network/timeout
 * failures, and redirects to login on a 401. Exported so feature-specific API
 * modules (see services/signingApi.ts) reuse this behaviour instead of
 * reimplementing it.
 */
export async function apiFetch(endpoint: string, options: ApiFetchOptions = {}) {
  const { timeoutMs = 15000, ...fetchOptions } = options;
  const token = localStorage.getItem("saas_jwt_token");
  
  const headers = new Headers(fetchOptions.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(fetchOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetchWithRetry(
    `${API_BASE_URL}${endpoint}`,
    {
      ...fetchOptions,
      headers,
    },
    3,
    timeoutMs
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Handle token expiration
    if (response.status === 401 && token) {
      localStorage.removeItem("saas_jwt_token");
      window.location.href = "/login";
    }
    // The API returns { status, message, errors? }. Prefer the server message,
    // then the first validation error, then a generic fallback.
    const validationMsg = Array.isArray(data.errors) && data.errors.length
      ? data.errors.map((e: { message: string }) => e.message).join(", ")
      : null;
    throw new ApiError(
      data.message || validationMsg || "An error occurred",
      response.status
    );
  }

  return data;
}

export { ApiError };

export const apiService = {
  // Auth
  register: (email: string, name: string, password: string) => 
    apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ email, name, password }) }),
  
  login: (email: string, password: string) =>
    apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  googleLogin: (data: { credential: string }) =>
    apiFetch("/auth/google", { method: "POST", body: JSON.stringify(data) }),

  logout: () => apiFetch("/auth/logout", { method: "POST" }),

  verifyEmail: (token: string) =>
    apiFetch("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) }),

  resendVerification: () =>
    apiFetch("/auth/resend-verification", { method: "POST" }),

  // User
  getProfile: () => apiFetch("/users/me", { method: "GET" }),

  // Upload
  getPresignedUrl: (fileName: string, contentType: string, fileSize: number) =>
    apiFetch("/upload/presign", {
      method: "POST",
      body: JSON.stringify({ fileName, contentType, fileSize }),
    }),

  getPresignedUrlBatch: (
    files: { fileName: string; contentType: string; fileSize: number }[]
  ): Promise<{ uploads: { uploadUrl: string; fileKey: string }[] }> =>
    apiFetch("/upload/presign-batch", {
      method: "POST",
      body: JSON.stringify({ files }),
    }),

  initMultipartUpload: (
    fileName: string,
    contentType: string,
    fileSize: number
  ): Promise<{ fileKey: string; uploadId: string; partSize: number }> =>
    apiFetch("/upload/multipart/init", {
      method: "POST",
      body: JSON.stringify({ fileName, contentType, fileSize }),
    }),

  presignMultipartParts: (
    fileKey: string,
    uploadId: string,
    partNumbers: number[]
  ): Promise<{ parts: { partNumber: number; uploadUrl: string }[] }> =>
    apiFetch("/upload/multipart/presign-parts", {
      method: "POST",
      body: JSON.stringify({ fileKey, uploadId, partNumbers }),
    }),

  completeMultipartUpload: (
    fileKey: string,
    uploadId: string,
    parts: { partNumber: number; etag: string }[],
    contentType?: string
  ): Promise<{ fileKey: string }> =>
    apiFetch("/upload/multipart/complete", {
      method: "POST",
      body: JSON.stringify({ fileKey, uploadId, parts, contentType }),
    }),

  abortMultipartUpload: (fileKey: string, uploadId: string): Promise<void> =>
    apiFetch("/upload/multipart/abort", {
      method: "POST",
      body: JSON.stringify({ fileKey, uploadId }),
    }),

  /** Files at or above this size use multipart upload. */
  MULTIPART_THRESHOLD: 16 * 1024 * 1024,

  // S3 direct upload using XMLHttpRequest to support progress tracking
  uploadFileToS3: async (
    file: File,
    uploadUrl: string,
    onProgress?: (percent: number) => void,
    opts?: { contentType?: string; timeoutMs?: number }
  ): Promise<void> => {
    await putBlobToUrl(file, uploadUrl, {
      contentType: opts?.contentType ?? (file.type || "application/pdf"),
      onProgress,
      timeoutMs: opts?.timeoutMs ?? 300_000,
    });
  },

  /**
   * Upload a file directly to cloud storage. Uses a single PUT below the
   * multipart threshold; otherwise chunked parallel part uploads.
   */
  uploadFileDirect: async (
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<string> => {
    const contentType = file.type || "application/pdf";

    if (file.size < apiService.MULTIPART_THRESHOLD) {
      const presign = await apiService.getPresignedUrl(file.name, contentType, file.size);
      await apiService.uploadFileToS3(file, presign.uploadUrl, onProgress, { contentType });
      return presign.fileKey;
    }

    return uploadFileMultipart(file, contentType, onProgress);
  },

  // Jobs
  createJob: (tool: string, inputFiles: string[], options: any = {}) =>
    apiFetch("/jobs", { method: "POST", body: JSON.stringify({ tool, inputFiles, options }) }),

  getJobStatus: (jobId: string) =>
    apiFetch(`/jobs/${jobId}`, { method: "GET" }),

  // Returns a short-lived signed URL for the (private) result file.
  getDownloadUrl: (jobId: string): Promise<{ url: string }> =>
    apiFetch(`/jobs/${jobId}/download`, { method: "GET" }),

  // Billing
  initiateCheckout: (planId: string) =>
    apiFetch("/billing/checkout", { method: "POST", body: JSON.stringify({ planId }) }),

  // Cloud Integrations
  getCloudIntegrations: () =>
    apiFetch("/cloud/integrations", { method: "GET" }),

  connectCloud: (provider: string, accountEmail: string, accessToken?: string) =>
    apiFetch("/cloud/connect", {
      method: "POST",
      body: JSON.stringify({ provider, accountEmail, accessToken }),
    }),

  disconnectCloud: (provider: string) =>
    apiFetch("/cloud/disconnect", { method: "POST", body: JSON.stringify({ provider }) }),

  getCloudFiles: (provider: string) =>
    apiFetch(`/cloud/files?provider=${provider}`, { method: "GET" }),

  syncCloudWorkspace: () => apiFetch("/cloud/sync", { method: "POST" }),

  // Enterprise BYOC (customer)
  getEnterpriseOrganization: () => apiFetch("/enterprise/organization", { method: "GET" }),

  getEnterpriseStorage: () => apiFetch("/enterprise/storage", { method: "GET" }),

  testEnterpriseStorage: (body: Record<string, unknown>) =>
    apiFetch("/enterprise/storage/test", { method: "POST", body: JSON.stringify(body) }),

  saveEnterpriseStorage: (body: Record<string, unknown>) =>
    apiFetch("/enterprise/storage", { method: "PUT", body: JSON.stringify(body) }),

  resetEnterpriseStorage: () => apiFetch("/enterprise/storage", { method: "DELETE" }),

  getEnterpriseAudit: (limit = 50) =>
    apiFetch(`/enterprise/audit?limit=${limit}`, { method: "GET" }),
};

const PART_CONCURRENCY = 4;
const PART_TIMEOUT_MS = 120_000;
const PART_RETRIES = 3;

function putBlobToUrl(
  body: Blob,
  uploadUrl: string,
  opts: {
    contentType?: string | null;
    onProgress?: (percent: number) => void;
    timeoutMs?: number;
    /** When true, omit Content-Type (S3 UploadPart signatures usually exclude it). */
    omitContentType?: boolean;
  }
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!navigator.onLine) {
      reject(new Error("You appear to be offline."));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    if (!opts.omitContentType && opts.contentType) {
      xhr.setRequestHeader("Content-Type", opts.contentType);
    }

    if (opts.onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          opts.onProgress!(Math.round((event.loaded / event.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag =
          xhr.getResponseHeader("ETag") ||
          xhr.getResponseHeader("etag") ||
          `"part-${Date.now()}"`;
        resolve(etag);
      } else {
        reject(new Error(`Failed to upload to cloud storage. Status: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error occurred during upload."));
    xhr.ontimeout = () => reject(new Error("Upload timed out."));
    xhr.timeout = opts.timeoutMs ?? 300_000;
    xhr.send(body);
  });
}

async function uploadFileMultipart(
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const init = await apiService.initMultipartUpload(file.name, contentType, file.size);
  const { fileKey, uploadId, partSize } = init;
  const totalParts = Math.ceil(file.size / partSize);
  const partNumbers = Array.from({ length: totalParts }, (_, i) => i + 1);

  const completed = new Map<number, string>();
  const loadedBytes = new Map<number, number>();

  const reportProgress = () => {
    if (!onProgress) return;
    let loaded = 0;
    for (const n of loadedBytes.values()) loaded += n;
    onProgress(Math.min(99, Math.round((loaded / file.size) * 100)));
  };

  try {
    // Presign all parts in batches of 100 (API max), then upload with bounded concurrency.
    const urlByPart = new Map<number, string>();
    for (let i = 0; i < partNumbers.length; i += 100) {
      const batch = partNumbers.slice(i, i + 100);
      const { parts: urls } = await apiService.presignMultipartParts(fileKey, uploadId, batch);
      for (const p of urls) urlByPart.set(p.partNumber, p.uploadUrl);
    }

    let cursor = 0;
    const workers = Array.from({ length: Math.min(PART_CONCURRENCY, totalParts) }, async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= totalParts) return;
        const partNumber = partNumbers[idx];
        const startByte = (partNumber - 1) * partSize;
        const endByte = Math.min(startByte + partSize, file.size);
        const blob = file.slice(startByte, endByte);
        const url = urlByPart.get(partNumber);
        if (!url) throw new Error(`Missing presigned URL for part ${partNumber}`);

        let lastErr: Error | null = null;
        for (let attempt = 0; attempt < PART_RETRIES; attempt++) {
          try {
            const omitContentType = !url.includes("comp=block");
            const etag = await putBlobToUrl(blob, url, {
              contentType: omitContentType ? null : contentType,
              omitContentType,
              timeoutMs: PART_TIMEOUT_MS,
              onProgress: (pct) => {
                loadedBytes.set(partNumber, Math.round((pct / 100) * blob.size));
                reportProgress();
              },
            });
            completed.set(partNumber, etag);
            loadedBytes.set(partNumber, blob.size);
            reportProgress();
            lastErr = null;
            break;
          } catch (err: any) {
            lastErr = err;
            await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          }
        }
        if (lastErr) throw lastErr;
      }
    });

    await Promise.all(workers);

    const parts = Array.from(completed.entries())
      .map(([partNumber, etag]) => ({ partNumber, etag }))
      .sort((a, b) => a.partNumber - b.partNumber);

    await apiService.completeMultipartUpload(fileKey, uploadId, parts, contentType);
    onProgress?.(100);
    return fileKey;
  } catch (err) {
    await apiService.abortMultipartUpload(fileKey, uploadId).catch(() => undefined);
    throw err;
  }
}
