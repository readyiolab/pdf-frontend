import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Mail, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * Handles both:
 * - Post-register "check your inbox" (no ?token)
 * - Clicking the email link (?token=...)
 */
export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const tokenFromLink = params.get("token");
  const { user, token, resendVerification, applyVerifiedSession, refreshProfile, loading: authLoading } =
    useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">(
    tokenFromLink ? "verifying" : "idle"
  );
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!tokenFromLink) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiService.verifyEmail(tokenFromLink);
        if (cancelled) return;
        applyVerifiedSession(data);
        // Ensure profile reflects DB (clears any stale unverified client state).
        await refreshProfile().catch(() => undefined);
        if (cancelled) return;
        setStatus("success");
        setMessage("Your email is verified. You're all set.");
        toast.success("Email verified!");
        setTimeout(() => navigate("/workspace", { replace: true }), 1200);
      } catch (err: any) {
        if (cancelled) return;
        setStatus("error");
        setMessage(err.message || "This verification link is invalid or expired.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenFromLink, applyVerifiedSession, refreshProfile, navigate]);

  useEffect(() => {
    if (!tokenFromLink && user?.emailVerified) {
      navigate("/workspace", { replace: true });
    }
  }, [user, tokenFromLink, navigate]);

  const handleResend = async () => {
    if (!token) {
      toast.error("Please sign in to resend the verification email.");
      navigate("/login");
      return;
    }
    setResending(true);
    try {
      await resendVerification();
      toast.success("Verification email sent. Check your inbox.");
    } catch (err: any) {
      toast.error(err.message || "Could not resend verification email.");
    } finally {
      setResending(false);
    }
  };

  if (authLoading || status === "verifying") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6">
        <Spinner className="size-6" />
        <p className="text-sm text-muted-foreground">
          {status === "verifying" ? "Verifying your email…" : "Loading…"}
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10">
          <CheckCircle2 className="size-7 text-emerald-600" />
        </div>
        <h1 className="text-xl font-semibold">Email verified</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertCircle className="size-7 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold">Could not verify</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={handleResend} disabled={resending}>
            {resending ? <Spinner className="mr-2 size-4" /> : null}
            Send a new link
          </Button>
          <Button variant="outline" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Idle — waiting for user to check inbox (optional — workspace is available now)
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
        <Mail className="size-7 text-primary" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">Verify when you’re ready</h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        We sent a link to{" "}
        <span className="font-medium text-foreground">{user?.email || "your inbox"}</span>.
        You can use the workspace now — verify later to unlock e-sign, AI, and billing.
      </p>
      <p className="max-w-md text-xs text-muted-foreground">
        Check spam/junk if you don’t see it. The link expires in 24 hours.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        <Button asChild>
          <Link to="/workspace">Go to workspace</Link>
        </Button>
        <Button variant="outline" onClick={handleResend} disabled={resending || !token}>
          {resending ? <Spinner className="mr-2 size-4" /> : null}
          Resend email
        </Button>
      </div>
    </div>
  );
}
