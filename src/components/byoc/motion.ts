import type { Transition, Variants } from "framer-motion";

/** Shared motion tokens for BYOC marketing surfaces. */
export const BYOC_EASE = [0.22, 1, 0.36, 1] as const;

export const BYOC_VIEWPORT = { once: true, margin: "-40px" as const };

export const BYOC_TRANSITION: Transition = {
  duration: 0.55,
  ease: BYOC_EASE,
};

export const BYOC_STAGGER: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.045 },
  },
};

export const BYOC_FADE_UP: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: BYOC_EASE },
  },
};

export type ProviderLogoId = "AWS" | "Azure" | "R2" | "GCS" | "MinIO";

export const PROVIDER_CHIPS: ReadonlyArray<{
  id: ProviderLogoId;
  label: string;
  tip: string;
}> = [
  {
    id: "AWS",
    label: "AWS S3",
    tip: "Native S3 or custom endpoint · access key + secret",
  },
  {
    id: "Azure",
    label: "Azure Blob",
    tip: "Account name + key, or connection string",
  },
  {
    id: "R2",
    label: "Cloudflare R2",
    tip: "https://<accountid>.r2.cloudflarestorage.com",
  },
  {
    id: "GCS",
    label: "Google Cloud",
    tip: "S3-interop HMAC keys · storage.googleapis.com",
  },
  {
    id: "MinIO",
    label: "MinIO",
    tip: "Self-hosted · path-style endpoint URL required",
  },
];
