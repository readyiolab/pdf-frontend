import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
    void import("@/lib/sentry").then(({ captureException }) => {
      captureException(error, { extra: info as unknown as Record<string, unknown> });
    });
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="max-w-md text-sm text-muted-foreground">
              An unexpected error occurred. Reload the page to try again.
            </p>
            <button
              type="button"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
