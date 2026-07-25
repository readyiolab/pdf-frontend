import { API_BASE_URL } from "./api";
import type { SignFieldType, SignRecipientRole, SignRecipientStatus } from "@/lib/signing/types";

/**
 * Client for the PUBLIC signing routes.
 *
 * ── Why this does not reuse apiFetch ────────────────────────────────────────
 * `apiFetch` attaches the logged-in user's JWT from localStorage and, on a 401,
 * clears it and redirects to /login. Both are wrong here:
 *
 *  1. A signer is usually NOT the logged-in user. Someone can perfectly well be
 *     signed into their own PDFProduct account and then open a signing link
 *     addressed to a colleague — sending their account JWT to a public endpoint
 *     is at best noise and at worst confusing to reason about.
 *  2. A 401 from these routes means "verify your identity with an OTP", not
 *     "your session expired". apiFetch would log the user out of their own
 *     account and bounce them to /login, losing the signing link entirely.
 *
 * The only credential these routes take is the signing token in the URL, plus
 * the short-lived signing session returned by verify-otp — which is deliberately
 * held in memory, not localStorage. It authorises signing a specific document;
 * persisting it across tabs and reloads gives it a longer life than the act it
 * exists to authorise.
 */

export interface SignViewField {
  id: string;
  recipientId: string | null;
  type: SignFieldType;
  label: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  config: {
    placeholder?: string;
    defaultValue?: string;
    options?: string[];
    validation?: { minLength?: number; maxLength?: number; min?: number; max?: number; pattern?: string };
    font?: { size?: number; color?: string; align?: string };
    dateFormat?: string;
  };
  value: string | null;
  isMine: boolean;
}

export interface SignViewParticipant {
  id: string;
  name: string;
  role: SignRecipientRole;
  color: string;
  signingOrder: number;
  status: SignRecipientStatus;
}

export interface SignView {
  document: {
    id: string;
    title: string;
    message: string | null;
    status: string;
    pageCount: number;
    flowType: "SEQUENTIAL" | "PARALLEL";
    expiresAt: string | null;
  };
  recipient: {
    id: string;
    name: string;
    email: string;
    role: SignRecipientRole;
    color: string;
    status: SignRecipientStatus;
    authMethod: string;
    completedAt: string | null;
  };
  participants: SignViewParticipant[];
  fields: SignViewField[];
  requiresOtp: boolean;
  requiresAccessCode?: boolean;
  isVerified: boolean;
  /** Null until identity verification passes — the OTP would be decorative otherwise. */
  fileUrl: string | null;
}

export class SigningError extends Error {
  // Declared and assigned explicitly rather than as a constructor parameter
  // property — the app builds with `erasableSyntaxOnly`, which bans syntax that
  // emits runtime code from a type-position annotation.
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "SigningError";
  }
}

async function signFetch<T>(
  path: string,
  options: RequestInit = {},
  sessionToken?: string | null
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  // The signing session, when one exists. Never the account JWT.
  if (sessionToken) headers.set("Authorization", `Bearer ${sessionToken}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/sign${path}`, { ...options, headers });
  } catch {
    throw new SigningError(
      "Couldn't reach the server. Check your connection and try again.",
      0
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validation =
      Array.isArray(data.errors) && data.errors.length
        ? data.errors.map((e: { message: string }) => e.message).join(", ")
        : null;
    throw new SigningError(data.message || validation || "Something went wrong.", response.status);
  }

  return data as T;
}

export const publicSigningApi = {
  getView: (token: string, sessionToken?: string | null) =>
    signFetch<SignView>(`/${token}`, { method: "GET" }, sessionToken),

  requestOtp: (token: string) =>
    signFetch<{ channel: string; sentTo: string }>(`/${token}/otp`, { method: "POST" }),

  verifyOtp: (token: string, code: string) =>
    signFetch<{ sessionToken: string; fileUrl: string }>(`/${token}/verify-otp`, {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  verifyAccessCode: (token: string, code: string) =>
    signFetch<{ sessionToken: string; fileUrl: string }>(`/${token}/verify-access-code`, {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  complete: (token: string, values: Record<string, string>, sessionToken?: string | null) =>
    signFetch<{
      status: string;
      documentCompleted: boolean;
      documentFinalizing?: boolean;
      documentStatus?: string;
    }>(`/${token}/complete`, { method: "POST", body: JSON.stringify({ values }) }, sessionToken),

  decline: (token: string, reason?: string) =>
    signFetch<{ status: string }>(`/${token}/decline`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};
