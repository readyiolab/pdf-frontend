/**
 * Single source of truth for marketing pricing (online SaaS + offline desktop).
 * Limits mirror backend/shared/constants.ts PLAN_LIMITS.
 */

import {
  DOWNLOAD_MAILTO,
  LICENSE_MAILTO,
  SALES_MAILTO,
} from "@/components/desktop/motion";

export type OnlinePlanId = "FREE" | "PRO" | "ENTERPRISE";

export type FeatureCell = boolean | string;

export interface OnlinePlan {
  id: OnlinePlanId;
  name: string;
  price: string;
  /** Shown after price when set, e.g. "mo" → /mo */
  period: string | null;
  blurb: string;
  cta: string;
  /** Navigate path for non-checkout CTAs (Free / Enterprise). */
  path: string;
  featured: boolean;
  features: string[];
}

export interface FeatureCompareRow {
  label: string;
  free: FeatureCell;
  pro: FeatureCell;
  enterprise: FeatureCell;
}

export interface OfflineProduct {
  id: string;
  name: string;
  blurb: string;
  bullets: string[];
  downloadMailto: string;
  licenseMailto: string;
}

export const ONLINE_PLANS: OnlinePlan[] = [
  {
    id: "FREE",
    name: "Free",
    price: "$0",
    period: null,
    blurb: "Core tools & light AI usage",
    cta: "Get started",
    path: "/workspace",
    featured: false,
    features: [
      "Core PDF tools",
      "Light AI usage (20 credits/mo)",
      "Up to 10MB files",
      "5 operations per day",
      "Community support",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    price: "$12",
    period: "mo",
    blurb: "Unlimited tools, eSign & AI credits",
    cta: "Upgrade",
    path: "/billing",
    featured: true,
    features: [
      "Unlimited PDF tools",
      "eSign, Letters & Diagram Studio",
      "Up to 100MB files",
      "500 AI credits / month",
      "Priority processing",
      "Email support",
    ],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: "Custom",
    period: null,
    blurb: "Your own cloud storage, SLA & dedicated support",
    cta: "Learn more",
    path: "/enterprise",
    featured: false,
    features: [
      "Bring your own cloud (BYOC)",
      "Up to 500MB files",
      "High AI & eSign limits",
      "Team controls & audit",
      "SLA & dedicated support",
    ],
  },
];

/** Full online feature matrix for Billing compare table. */
export const FEATURE_COMPARE_ROWS: FeatureCompareRow[] = [
  { label: "PDF tools (merge, split, protect, convert…)", free: true, pro: true, enterprise: true },
  { label: "Max file size", free: "10 MB", pro: "100 MB", enterprise: "500 MB" },
  { label: "Daily operations", free: "5 / day", pro: "High volume", enterprise: "Custom" },
  { label: "AI credits / month", free: "20", pro: "500", enterprise: "10,000+" },
  { label: "eSign documents / month", free: "3", pro: "200", enterprise: "5,000+" },
  { label: "eSign templates", free: "3", pro: "50", enterprise: "500+" },
  { label: "Letter Studio batches", free: "5 rows", pro: "500 rows", enterprise: "5,000 rows" },
  { label: "Letter send (Outlook / Gmail)", free: false, pro: true, enterprise: true },
  { label: "Diagram Studio (online)", free: true, pro: true, enterprise: true },
  { label: "Diagram AI & share links", free: "Limited", pro: true, enterprise: true },
  { label: "Priority processing", free: false, pro: true, enterprise: true },
  { label: "Bring your own cloud (BYOC)", free: false, pro: false, enterprise: true },
  { label: "Team controls & audit", free: false, pro: false, enterprise: true },
  { label: "Support", free: "Community", pro: "Email", enterprise: "Dedicated + SLA" },
];

export const OFFLINE_PRODUCTS: OfflineProduct[] = [
  {
    id: "pdf-desktop",
    name: "PDF Toolkit Desktop",
    blurb: "All your PDF tools in a Windows app — private, fast, offline after activation.",
    bullets: [
      "Merge, split, protect, convert, OCR, and more",
      "Files stay on your PC",
      "Activate with a license key; team seats available",
    ],
    downloadMailto: DOWNLOAD_MAILTO,
    licenseMailto: LICENSE_MAILTO,
  },
  {
    id: "diagrams-desktop",
    name: "Diagram Studio Desktop",
    blurb: "Draw.io-style diagrams offline — shapes, connectors, and export without the cloud.",
    bullets: [
      "Full canvas & shape libraries on Windows",
      "Work offline after license activation",
      "Export PNG, SVG, PDF from your machine",
    ],
    downloadMailto:
      "mailto:support@zuvigo.com?subject=Diagram%20Studio%20Desktop%20Download",
    licenseMailto:
      "mailto:support@zuvigo.com?subject=Diagram%20Studio%20Desktop%20License",
  },
];

export { DOWNLOAD_MAILTO, LICENSE_MAILTO, SALES_MAILTO };

export function formatFeatureCell(value: FeatureCell): string {
  if (value === true) return "Yes";
  if (value === false) return "—";
  return value;
}
