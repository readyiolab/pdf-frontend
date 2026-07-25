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
 * Requires a verified email (Google / guest count as verified).
 * Unverified password users see a clear gate instead of a cryptic API 403.
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

  // Guests are blocked from e-sign/AI by the API's requireFullAccount;
  // show a friendly upgrade prompt rather than the verify screen.
  if (user?.isGuest) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Create a free account</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Guest sessions can use basic PDF tools. E-sign and AI need a real account so we can
          keep your documents safe and contact you if needed.
        </p>
        <Button asChild>
          <Link to="/register">Create account</Link>
        </Button>
      </div>
    );
  }

  if (user && user.emailVerified === false) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
          <Mail className="size-7 text-primary" />
        </div>
        <h1 className="text-xl font-semibold">Verify your email to continue</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We sent a link to <span className="font-medium text-foreground">{user.email}</span>.
          Open it to unlock this feature.
        </p>
        <Button asChild>
          <Link to="/verify-email">Open verification page</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
