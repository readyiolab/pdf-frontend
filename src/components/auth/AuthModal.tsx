import React, { useState } from "react";
import { Dialog } from "radix-ui";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, ShieldCheck, X } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful sign-in / sign-up / guest session. */
  onSuccess: () => void;
}

type Mode = "signin" | "signup";

/**
 * Login / sign-up modal shown when a logged-out user tries to process files.
 * The selected files stay in browser memory the whole time, so after auth the
 * caller resumes processing automatically — the user never re-uploads.
 */
export const AuthModal: React.FC<AuthModalProps> = ({ open, onOpenChange, onSuccess }) => {
  const { login, register, guestSession } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        await login(email, password);
      } else {
        await register(email, name, password);
      }
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const continueAsGuest = async () => {
    setError(null);
    setBusy(true);
    try {
      await guestSession();
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Could not start a guest session.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-3xl bg-popover p-6 text-popover-foreground shadow-xl ring-1 ring-foreground/5",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          )}
        >
          <Dialog.Close
            className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Dialog.Close>

          <div className="mb-5 flex flex-col items-center text-center">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <Dialog.Title className="text-lg font-bold tracking-tight">
              {mode === "signin" ? "Sign in to continue" : "Create your account"}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              Your files are ready and waiting — sign in and we'll pick up right where
              you left off. No re-uploading.
            </Dialog.Description>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            {mode === "signup" && (
              <Input
                type="text"
                placeholder="Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                disabled={busy}
              />
            )}
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={busy}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              disabled={busy}
            />

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className={cn(
                "mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 px-4 text-sm font-bold text-primary-foreground shadow-sm transition-all active:scale-[0.98]",
                "hover:bg-primary/90 disabled:opacity-50 disabled:active:scale-100"
              )}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in & continue" : "Create account & continue"}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              or
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={continueAsGuest}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-transparent py-2.5 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Continue as guest
          </button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              className="font-semibold text-primary hover:underline"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
