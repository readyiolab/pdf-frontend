import { Navigate, Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/** Requires a logged-in session. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-5" />
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/**
 * Gates e-sign / AI / billing behind a verified email (or a full non-guest account).
 * Workspace and basic PDF tools stay available without verification.
 */
export function VerifiedRoute({ children }: { children: React.ReactNode }) {
  const { token, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-5" />
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;

  if (user?.isGuest) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Create a free account</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Guest sessions can use basic PDF tools. E-sign and AI need a real account.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button asChild>
            <Link to="/register">Create account</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/workspace">Back to workspace</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (user && user.emailVerified === false) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
          <Mail className="size-7 text-primary" />
        </div>
        <h1 className="text-xl font-semibold">Verify your email to unlock this</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We sent a link to <span className="font-medium text-foreground">{user.email}</span>.
          You can keep using the workspace and verify whenever you’re ready.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button asChild>
            <Link to="/workspace">Continue to workspace</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/verify-email">Verify now</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
