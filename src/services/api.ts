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

async function fetchWithRetry(url: string, options: RequestInit, retries: number = 3): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      if (!navigator.onLine) {
        throw new Error("You appear to be offline. Please check your internet connection.");
      }

      // Add AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (err: any) {
      lastError = err;
      if (err.name === "AbortError") {
        lastError = new Error("Request timed out. Please try again.");
      }
      
      // Only retry on network errors (fetch throws TypeError on network failure) or 5xx server errors
      if (err.name !== "TypeError" && err.name !== "AbortError") {
        throw err;
      }
      
      // Exponential backoff
      if (i < retries - 1) {
        await new Promise(res => setTimeout(res, Math.pow(2, i) * 1000));
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
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("saas_jwt_token");
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetchWithRetry(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

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

export const apiService = {
  // Auth
  register: (email: string, name: string, password: string) => 
    apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ email, name, password }) }),
  
  login: (email: string, password: string) =>
    apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  googleLogin: (data: { credential: string }) =>
    apiFetch("/auth/google", { method: "POST", body: JSON.stringify(data) }),

  guestLogin: () => apiFetch("/auth/guest", { method: "POST" }),

  logout: () => apiFetch("/auth/logout", { method: "POST" }),

  verifyEmail: (token: string) =>
    apiFetch("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) }),

  resendVerification: () =>
    apiFetch("/auth/resend-verification", { method: "POST" }),

  // User
  getProfile: () => apiFetch("/users/me", { method: "GET" }),

  // Upload
  getPresignedUrl: (fileName: string, contentType: string, fileSize: number) => 
    apiFetch("/upload/presign", { method: "POST", body: JSON.stringify({ fileName, contentType, fileSize }) }),

  // S3 direct upload using XMLHttpRequest to support progress tracking
  uploadFileToS3: (file: File, uploadUrl: string, onProgress?: (percent: number) => void): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!navigator.onLine) {
        reject(new Error("You appear to be offline."));
        return;
      }

      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", file.type || "application/pdf");

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onProgress(percentComplete);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Failed to upload to cloud storage. Status: ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network error occurred during upload."));
      };

      xhr.ontimeout = () => {
        reject(new Error("Upload timed out."));
      };

      // Set timeout to 5 minutes for large files
      xhr.timeout = 300000;
      xhr.send(file);
    });
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
    apiFetch("/cloud/connect", { method: "POST", body: JSON.stringify({ provider, accountEmail, accessToken }) }),

  disconnectCloud: (provider: string) =>
    apiFetch("/cloud/disconnect", { method: "POST", body: JSON.stringify({ provider }) }),

  getCloudFiles: (provider: string) =>
    apiFetch(`/cloud/files?provider=${provider}`, { method: "GET" }),

  syncCloudWorkspace: () =>
    apiFetch("/cloud/sync", { method: "POST" }),
};
