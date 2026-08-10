import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import { Mail, Lock, User as UserIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AuthFormProps {
  mode: "login" | "register";
  onSuccess?: () => void;
  onSwitchMode?: (mode: "login" | "register") => void;
  isModal?: boolean;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          prompt: (callback?: (notification: {
            isNotDisplayed?: () => boolean;
            isSkippedMoment?: () => boolean;
            isDismissedMoment?: () => boolean;
          }) => void) => void;
        };
      };
    };
  }
}

export function AuthForm({
  mode,
  onSuccess,
  onSwitchMode,
}: AuthFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const { login, register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const finish = (_opts?: { needsVerify?: boolean }) => {
    if (onSuccess) {
      onSuccess();
      return;
    }
    navigate("/workspace");
  };

  // Mount the official GIS button (required branding + more reliable than One Tap alone).
  useEffect(() => {
    if (!googleClientId) return;

    let cancelled = false;
    let attempts = 0;

    const mount = () => {
      if (cancelled || !googleBtnRef.current) return;
      const g = window.google?.accounts?.id;
      if (!g) {
        if (attempts++ < 40) window.setTimeout(mount, 150);
        return;
      }

      g.initialize({
        client_id: googleClientId,
        callback: async (response: { credential?: string }) => {
          if (!response.credential) {
            setError("Google did not return a valid credential.");
            return;
          }
          setIsLoading(true);
          setError("");
          try {
            await googleLogin({ credential: response.credential });
            toast.success("Signed in with Google!");
            finish();
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Google token verification failed.");
          } finally {
            setIsLoading(false);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      googleBtnRef.current.innerHTML = "";
      g.renderButton(googleBtnRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: googleBtnRef.current.offsetWidth || 320,
      });
      setGoogleReady(true);
    };

    mount();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialize GIS once per client id
  }, [googleClientId]);


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
        toast.success("Account created! You can verify your email later from Profile.");
        finish({ needsVerify: true });
      }
    } catch (err: any) {
      const msg = err.message || `Failed to ${mode === "login" ? "sign in" : "create account"}`;
      const status = typeof err.status === "number" ? err.status : 0;

      // Already registered → stop spinner and jump to Sign In with email kept.
      if (mode === "register" && (status === 409 || /already registered/i.test(msg))) {
        setIsLoading(false);
        setPassword("");
        setError("This email is already registered. Sign in instead.");
        onSwitchMode?.("login");
        return;
      }

      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const alreadyRegistered = /already registered/i.test(error);

  return (
    <div className="w-full text-left">
      <div className="mb-5 pr-8 text-center sm:mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {mode === "login"
            ? "Sign in to access your workspace and documents"
            : "Free PDF tools — verify your email after signing up"}
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/60 p-1">
        <button
          type="button"
          onClick={() => {
            setError("");
            onSwitchMode?.("login");
          }}
          className={cn(
            "cursor-pointer rounded-lg py-2 text-xs font-semibold transition-all",
            mode === "login"
              ? "border border-border bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setError("");
            onSwitchMode?.("register");
          }}
          className={cn(
            "cursor-pointer rounded-lg py-2 text-xs font-semibold transition-all",
            mode === "register"
              ? "border border-border bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Create Account
        </button>
      </div>

      {googleClientId ? (
        <div className="relative mb-4 min-h-[44px] w-full overflow-hidden rounded-xl">
          <div
            ref={googleBtnRef}
            className={cn(
              "flex w-full justify-center [&>div]:w-full!",
              isLoading && "pointer-events-none opacity-60"
            )}
            aria-label="Continue with Google"
          />
          {!googleReady && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl border border-border bg-muted/40 text-xs text-muted-foreground">
              Loading Google…
            </div>
          )}
        </div>
      ) : (
        <p className="mb-4 text-center text-[11px] text-muted-foreground">
          Google sign-in is not configured for this build.
        </p>
      )}

      <div className="relative mb-4 flex items-center justify-center">
        <div className="w-full border-t border-border" />
        <span className="absolute bg-card px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          or email
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs text-destructive">
          <div className="flex items-start gap-2.5 font-medium">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <p>{error}</p>
              {alreadyRegistered && onSwitchMode && (
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    onSwitchMode("login");
                  }}
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Sign in with this email instead
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleAuthSubmit} className="space-y-3.5">
        {mode === "register" && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">Full Name</label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                required
                disabled={isLoading}
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/30 py-2.5 pl-10 pr-4 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-foreground">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              required
              disabled={isLoading}
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted/30 py-2.5 pl-10 pr-4 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
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
              className="w-full rounded-xl border border-border bg-muted/30 py-2.5 pl-10 pr-4 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
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
          className="mt-1 w-full cursor-pointer rounded-xl py-5 text-sm font-semibold"
        >
          {isLoading ? <Spinner className="mr-2 size-4" /> : null}
          {mode === "login" ? "Sign in" : "Create free account"}
        </Button>
      </form>

      {!onSwitchMode && (
        <p className="mt-4 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          {mode === "login" ? (
            <>
              No account?{" "}
              <Link to="/register" className="font-semibold text-primary">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-primary">
                Sign in
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
