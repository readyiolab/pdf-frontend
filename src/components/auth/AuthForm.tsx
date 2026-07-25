import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import { Mail, Lock, User as UserIcon, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AuthFormProps {
  mode: "login" | "register";
  onSuccess?: () => void;
  onSwitchMode?: (mode: "login" | "register") => void;
  isModal?: boolean;
}

export const AuthForm: React.FC<AuthFormProps> = ({
  mode,
  onSuccess,
  onSwitchMode,
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login, register, googleLogin, guestSession } = useAuth();
  const navigate = useNavigate();

  const finish = (opts?: { needsVerify?: boolean }) => {
    if (onSuccess) {
      onSuccess();
      return;
    }
    if (opts?.needsVerify) {
      navigate("/verify-email");
      return;
    }
    navigate("/workspace");
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (mode === "register" && !name) {
      setError("Please enter your full name.");
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "login") {
        await login(email, password);
        toast.success("Welcome back!");
        finish();
      } else {
        await register(email, name, password);
        toast.success("Account created — check your email to verify.");
        finish({ needsVerify: true });
      }
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      const msg = err.message || `Failed to ${mode === "login" ? "sign in" : "create account"}`;
      setError(msg);
      toast.error(msg);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");

    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

      if (!clientId) {
        setIsLoading(false);
        setError("Google sign-in is not configured. Please use email instead.");
        toast.error("Google sign-in is not available.");
        return;
      }

      if (typeof window === "undefined" || !(window as any).google?.accounts?.id) {
        setIsLoading(false);
        setError("Google sign-in is still loading. Please try again in a moment.");
        toast.error("Google sign-in is still loading.");
        return;
      }

      (window as any).google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          if (!response.credential) {
            setIsLoading(false);
            setError("Google did not return a valid credential.");
            return;
          }
          try {
            await googleLogin({ credential: response.credential });
            setIsLoading(false);
            toast.success("Signed in with Google!");
            finish();
          } catch (err: any) {
            setIsLoading(false);
            setError(err.message || "Google token verification failed.");
            toast.error("Google authentication failed.");
          }
        },
      });
      (window as any).google.accounts.id.prompt((notification: any) => {
        if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
          setIsLoading(false);
          setError("Google sign-in was blocked or dismissed. Please try again.");
        }
      });
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || "Google authentication failed.");
      toast.error("Google sign in failed.");
    }
  };

  const handleGuestSignIn = async () => {
    setIsLoading(true);
    setError("");
    try {
      await guestSession();
      setIsLoading(false);
      toast.success("Continuing as guest");
      finish();
    } catch {
      setIsLoading(false);
      setError("Failed to create guest session.");
      toast.error("Failed to create guest session.");
    }
  };

  return (
    <div className="w-full text-left">
      <div className="mb-6 text-center">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          {mode === "login"
            ? "Sign in to access your workspace and documents"
            : "Free PDF tools — verify your email after signing up"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted/60 mb-6 border border-border">
        <button
          type="button"
          onClick={() => onSwitchMode?.("login")}
          className={cn(
            "py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
            mode === "login"
              ? "bg-card text-foreground shadow-xs border border-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => onSwitchMode?.("register")}
          className={cn(
            "py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
            mode === "register"
              ? "bg-card text-foreground shadow-xs border border-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Create Account
        </button>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="w-full rounded-xl py-5 text-sm font-medium border-border hover:bg-muted/80 flex items-center justify-center gap-2 mb-5 cursor-pointer"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        <span>Continue with Google</span>
      </Button>

      <div className="relative flex items-center justify-center mb-5">
        <div className="w-full border-t border-border" />
        <span className="absolute bg-card px-3 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          or continue with email
        </span>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleAuthSubmit} className="space-y-4">
        {mode === "register" && (
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Full Name</label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                required
                disabled={isLoading}
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              required
              disabled={isLoading}
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-foreground">Password</label>
            {mode === "login" && (
              <span className="text-[11px] font-medium text-muted-foreground">
                Forgot password? Contact support.
              </span>
            )}
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              required
              disabled={isLoading}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
          {mode === "register" && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              At least 8 characters, with a letter and a number.
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl py-5 text-sm font-semibold mt-2 cursor-pointer"
        >
          {isLoading ? <Spinner className="mr-2 size-4" /> : null}
          {mode === "login" ? "Sign in" : "Create free account"}
        </Button>
      </form>

      <div className="mt-4 pt-4 border-t border-border text-center">
        <button
          type="button"
          onClick={handleGuestSignIn}
          disabled={isLoading}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>Continue as guest</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Guests can use basic PDF tools. E-sign and AI need a verified account.
        </p>
        {!onSwitchMode && (
          <p className="mt-3 text-xs text-muted-foreground">
            {mode === "login" ? (
              <>
                No account? <Link to="/register" className="text-primary font-semibold">Sign up</Link>
              </>
            ) : (
              <>
                Already have an account? <Link to="/login" className="text-primary font-semibold">Sign in</Link>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
};
