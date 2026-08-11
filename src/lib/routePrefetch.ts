/**
 * Warm lazy route chunks on hover/focus so navigation often skips Suspense.
 * Keys match primary app paths; longest matching prefix wins.
 */

type PrefetchFn = () => Promise<unknown>;

const warmed = new Set<string>();

const PREFETCHERS: { prefix: string; load: PrefetchFn; key: string }[] = [
  { prefix: "/", key: "home", load: () => import("@/pages/Home") },
  { prefix: "/workspace", key: "workspace", load: () => import("@/pages/Workspace") },
  { prefix: "/history", key: "history", load: () => import("@/pages/History") },
  { prefix: "/billing", key: "billing", load: () => import("@/pages/Billing") },
  { prefix: "/profile", key: "profile", load: () => import("@/pages/Profile") },
  {
    prefix: "/settings/cloud",
    key: "cloud-settings",
    load: () => import("@/pages/settings/CloudStorage"),
  },
  { prefix: "/sign", key: "sign-list", load: () => import("@/pages/signing/DocumentList") },
  {
    prefix: "/ai/summarize",
    key: "ai-summarize",
    load: () => import("@/pages/ai/SummarizePdf"),
  },
  {
    prefix: "/ai/explain",
    key: "ai-explain",
    load: () => import("@/pages/ai/ExplainPdf"),
  },
  { prefix: "/ai/chat", key: "ai-chat", load: () => import("@/pages/ai/ChatPdf") },
  {
    prefix: "/letters/studio",
    key: "letter-shell",
    load: () => import("@/components/letters/LetterStudioShell"),
  },
  {
    prefix: "/letters/studio",
    key: "letter-hub",
    load: () => import("@/pages/letters/LettersHub"),
  },
  {
    prefix: "/letters",
    key: "letters-landing",
    load: () => import("@/pages/letters/LettersLanding"),
  },
  {
    prefix: "/diagrams/studio",
    key: "diagram-shell",
    load: () => import("@/components/diagrams/DiagramStudioShell"),
  },
  {
    prefix: "/diagrams/studio",
    key: "diagram-list",
    load: () => import("@/pages/diagrams/DiagramsListPage"),
  },
  {
    prefix: "/diagrams/new",
    key: "diagram-editor",
    load: () => import("@/pages/diagrams/DiagramEditorPage"),
  },
  {
    prefix: "/diagrams",
    key: "diagrams-landing",
    load: () => import("@/pages/diagrams/DiagramsLanding"),
  },
  { prefix: "/esign", key: "esign", load: () => import("@/pages/esign/EsignLanding") },
  { prefix: "/desktop", key: "desktop", load: () => import("@/pages/desktop/DesktopToolkit") },
  {
    prefix: "/enterprise",
    key: "enterprise",
    load: () => import("@/pages/enterprise/EnterpriseByoc"),
  },
  { prefix: "/login", key: "login", load: () => import("@/pages/Login") },
];

function matchersFor(path: string) {
  const normalized = path.split("?")[0] || "/";
  return PREFETCHERS.filter((p) => {
    if (p.prefix === "/") return normalized === "/";
    return normalized === p.prefix || normalized.startsWith(`${p.prefix}/`);
  });
}

export function prefetchRoute(path: string): void {
  for (const entry of matchersFor(path)) {
    if (warmed.has(entry.key)) continue;
    warmed.add(entry.key);
    void entry.load().catch(() => {
      warmed.delete(entry.key);
    });
  }
}

/** Bind to Link onMouseEnter / onFocus */
export function prefetchHandlers(path: string) {
  const run = () => prefetchRoute(path);
  return { onMouseEnter: run, onFocus: run };
}
