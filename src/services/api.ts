export interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  dailyOpsUsed: number;
  dailyOpsLimit: number;
  dailyOpsRemaining: number;
  dailyOpsResetAt: string;
  createdAt: string;
  jobs?: Job[];
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

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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

async function apiFetch(endpoint: string, options: RequestInit = {}) {
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
    throw new ApiError(data.error || "An error occurred", response.status);
  }

  return data;
}

export const apiService = {
  // Auth
  register: (email: string, name: string, password: string) => 
    apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ email, name, password }) }),
  
  login: (email: string, password: string) => 
    apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

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

  // Billing
  initiateCheckout: (planId: string) => 
    apiFetch("/billing/checkout", { method: "POST", body: JSON.stringify({ planId }) }),
};
