/**
 * Wire contract for the signing API.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MIRROR — the source of truth is `backend/shared/signing.ts` in the
 * pdf-backend repo. This file is a hand-kept copy, NOT an import, because the
 * frontend (pdf-frontend) and backend (pdf-backend) are separate repositories:
 * a cross-directory import works on a dev machine where both are checked out
 * side by side and breaks in CI, where only one is.
 *
 * If you change a field type, status, or limit here, change it there too.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type SignDocumentStatus =
  | "CONVERTING"
  | "CONVERSION_FAILED"
  | "DRAFT"
  | "SENT"
  | "FINALIZING"
  | "COMPLETED"
  | "DECLINED"
  | "EXPIRED"
  | "VOIDED";

export type SignRecipientStatus = "PENDING" | "SENT" | "VIEWED" | "COMPLETED" | "DECLINED";

export type SignRecipientRole = "SIGNER" | "APPROVER" | "VIEWER" | "CC";

export type SignFlowType = "SEQUENTIAL" | "PARALLEL";

export type SignAuthMethod = "NONE" | "EMAIL_OTP" | "SMS_OTP" | "ACCESS_CODE";

export type SignFieldType =
  | "SIGNATURE"
  | "INITIALS"
  | "NAME"
  | "EMAIL"
  | "COMPANY"
  | "DATE"
  | "TEXT"
  | "NUMBER"
  | "CHECKBOX"
  | "RADIO"
  | "DROPDOWN"
  | "ATTACHMENT"
  | "STAMP"
  | "IMAGE";

export interface SignFieldConfig {
  placeholder?: string;
  defaultValue?: string;
  options?: string[];
  /** RADIO exclusive group; falls back to label when unset. */
  group?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
  font?: {
    family?: string;
    size?: number;
    weight?: "normal" | "bold";
    style?: "normal" | "italic";
    color?: string;
    align?: "left" | "center" | "right";
  };
  border?: {
    width?: number;
    color?: string;
    style?: "solid" | "dashed" | "none";
    radius?: number;
  };
  backgroundColor?: string;
  dateFormat?: string;
}

/**
 * Geometry is page-relative (0..1 of the page box), never pixels — see
 * SignFieldGeometry in the backend mirror. `y` runs from the TOP edge, matching
 * screen coordinates; pdf-lib flips it at finalization.
 */
export interface SignField {
  id: string;
  documentId: string;
  recipientId: string | null;
  type: SignFieldType;
  label: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  locked: boolean;
  config: SignFieldConfig;
  value: string | null;
  filledAt: string | null;
}

export interface SignRecipient {
  id: string;
  documentId: string;
  name: string;
  email: string;
  /** E.164 (+919876543210). Required for SMS_OTP and WhatsApp delivery. */
  phone: string | null;
  role: SignRecipientRole;
  color: string;
  signingOrder: number;
  authMethod: SignAuthMethod;
  status: SignRecipientStatus;
  otpVerifiedAt: string | null;
  /** Captured at signing time; shown in the status tracker and certificate. */
  ipAddress: string | null;
  deviceInfo: string | null;
  viewedAt: string | null;
  completedAt: string | null;
  declineReason: string | null;
}

export interface SignDocument {
  id: string;
  ownerId: string;
  title: string;
  message: string | null;
  status: SignDocumentStatus;
  flowType: SignFlowType;
  fileKey: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  currentVersion: number;
  /** SHA-256 of the PDF signers see, taken before any modification. */
  originalHash: string | null;
  /** Original .docx upload key; null for PDF-only uploads. */
  sourceFileKey?: string | null;
  /** Original .docx filename when sourceFileKey is set. */
  sourceFileName?: string | null;
  expiresAt: string | null;
  sentAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  recipients?: SignRecipient[];
  fields?: SignField[];
}

export interface SignDocumentSummary extends SignDocument {
  recipientCount: number;
  completedCount: number;
}

export interface SignAuditEntry {
  id: string;
  documentId: string;
  recipientId: string | null;
  actorId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  action: string;
  detail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  location: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export const RECIPIENT_COLORS = [
  "#2563eb",
  "#db2777",
  "#16a34a",
  "#ea580c",
  "#7c3aed",
  "#0891b2",
  "#ca8a04",
  "#dc2626",
] as const;

export const DEFAULT_FIELD_SIZE: Record<SignFieldType, { width: number; height: number }> = {
  SIGNATURE: { width: 0.22, height: 0.05 },
  INITIALS: { width: 0.08, height: 0.05 },
  NAME: { width: 0.22, height: 0.03 },
  EMAIL: { width: 0.22, height: 0.03 },
  COMPANY: { width: 0.22, height: 0.03 },
  DATE: { width: 0.14, height: 0.03 },
  TEXT: { width: 0.22, height: 0.03 },
  NUMBER: { width: 0.1, height: 0.03 },
  CHECKBOX: { width: 0.025, height: 0.018 },
  RADIO: { width: 0.025, height: 0.018 },
  DROPDOWN: { width: 0.18, height: 0.03 },
  ATTACHMENT: { width: 0.18, height: 0.04 },
  STAMP: { width: 0.14, height: 0.07 },
  IMAGE: { width: 0.18, height: 0.09 },
};

export const SIGNING_PDF_MIME = "application/pdf" as const;
export const SIGNING_DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document" as const;

export function isSigningDocxFile(file: File): boolean {
  if (/\.docx$/i.test(file.name)) return true;
  const t = file.type.toLowerCase();
  return t === SIGNING_DOCX_MIME || t === "application/zip" || t === "application/x-zip-compressed";
}

export function isSigningPdfFile(file: File): boolean {
  if (file.type === SIGNING_PDF_MIME) return true;
  return /\.pdf$/i.test(file.name);
}

export const SIGNING_UPLOAD_ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const SIGNING_LIMITS = {
  maxRecipientsPerDocument: 50,
  maxFieldsPerDocument: 500,
  maxTitleLength: 200,
  maxMessageLength: 2000,
  maxFileSize: 50 * 1024 * 1024,
  defaultExpiryDays: 30,
  completionDownloadTtlSeconds: 7 * 24 * 60 * 60,
} as const;
