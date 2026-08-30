/**
 * Optional Sentry integration — active only when VITE_SENTRY_DSN is set at build time.
 */
let initialized = false;

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn || initialized) return;

  void import("@sentry/react").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    });
    initialized = true;
  });
}

export function captureException(
  error: unknown,
  context?: { extra?: Record<string, unknown> }
) {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  void import("@sentry/react").then((Sentry) => {
    Sentry.captureException(error, context);
  });
}
