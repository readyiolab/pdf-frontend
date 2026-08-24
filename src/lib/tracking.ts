/**
 * Visitor + UTM capture for first/last-touch attribution.
 * Persists visitorId for 1 year and posts one visit per browser session.
 */

const VISITOR_KEY = "zuvigo_visitor_id";
const ATTR_KEY = "zuvigo_attribution";
const SESSION_SENT_KEY = "zuvigo_visit_sent";

export type AttributionBlob = {
  visitorId: string;
  landingPath?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  msclkid?: string | null;
};

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string, days = 365) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function param(name: string): string | null {
  try {
    const v = new URLSearchParams(window.location.search).get(name);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

export function getOrCreateVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY) || readCookie(VISITOR_KEY);
  if (!id || id.length < 8) {
    id = uuid();
  }
  localStorage.setItem(VISITOR_KEY, id);
  writeCookie(VISITOR_KEY, id);
  return id;
}

export function captureAttributionFromUrl(): AttributionBlob {
  const visitorId = getOrCreateVisitorId();
  const incoming: AttributionBlob = {
    visitorId,
    landingPath: `${window.location.pathname}${window.location.search}`.slice(0, 512),
    referrer: document.referrer ? document.referrer.slice(0, 1024) : null,
    utmSource: param("utm_source"),
    utmMedium: param("utm_medium"),
    utmCampaign: param("utm_campaign"),
    utmTerm: param("utm_term"),
    utmContent: param("utm_content"),
    gclid: param("gclid"),
    fbclid: param("fbclid"),
    msclkid: param("msclkid"),
  };

  const hasAd =
    incoming.utmSource ||
    incoming.utmMedium ||
    incoming.utmCampaign ||
    incoming.gclid ||
    incoming.fbclid ||
    incoming.msclkid;

  let stored: AttributionBlob = { visitorId };
  try {
    const raw = localStorage.getItem(ATTR_KEY);
    if (raw) stored = { ...JSON.parse(raw), visitorId };
  } catch {
    /* ignore */
  }

  // Keep first-touch fields if we already have them; always refresh last-touch ads.
  const merged: AttributionBlob = {
    visitorId,
    landingPath: hasAd ? incoming.landingPath : stored.landingPath || incoming.landingPath,
    referrer: hasAd ? incoming.referrer : stored.referrer || incoming.referrer,
    utmSource: incoming.utmSource || stored.utmSource || null,
    utmMedium: incoming.utmMedium || stored.utmMedium || null,
    utmCampaign: incoming.utmCampaign || stored.utmCampaign || null,
    utmTerm: incoming.utmTerm || stored.utmTerm || null,
    utmContent: incoming.utmContent || stored.utmContent || null,
    gclid: incoming.gclid || stored.gclid || null,
    fbclid: incoming.fbclid || stored.fbclid || null,
    msclkid: incoming.msclkid || stored.msclkid || null,
  };

  localStorage.setItem(ATTR_KEY, JSON.stringify(merged));
  return merged;
}

export function getStoredAttribution(): AttributionBlob {
  try {
    const raw = localStorage.getItem(ATTR_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AttributionBlob;
      return { ...parsed, visitorId: parsed.visitorId || getOrCreateVisitorId() };
    }
  } catch {
    /* ignore */
  }
  return captureAttributionFromUrl();
}

/** Call once on app boot. Safe to invoke multiple times (session-deduped). */
export async function bootstrapTracking(apiBaseUrl: string): Promise<void> {
  const attribution = captureAttributionFromUrl();
  if (sessionStorage.getItem(SESSION_SENT_KEY) === attribution.visitorId) return;

  try {
    const token = localStorage.getItem("saas_jwt_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    await fetch(`${apiBaseUrl}/tracking/visit`, {
      method: "POST",
      headers,
      body: JSON.stringify(attribution),
      keepalive: true,
    });
    sessionStorage.setItem(SESSION_SENT_KEY, attribution.visitorId);
  } catch {
    /* non-blocking */
  }
}
