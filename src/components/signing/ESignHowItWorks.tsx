import { useState } from "react";
import {
  ChevronDown,
  FileCheck2,
  Info,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "esign-howitworks-dismissed";

interface Case {
  icon: typeof UserRound;
  title: string;
  desc: string;
}

/** The distinct signing situations, explained in plain language. These mirror
 *  what the designer actually supports: self-sign, one signer, and multiple
 *  recipients in a fixed order (SEQUENTIAL) or any order (PARALLEL). */
const CASES: Case[] = [
  {
    icon: UserRound,
    title: "Just me",
    desc: "Sign it yourself — add your signature and you're done.",
  },
  {
    icon: UserRound,
    title: "One other person",
    desc: "We email them a private link to review and sign.",
  },
  {
    icon: Users,
    title: "Several people, in order",
    desc: "Each person gets the email only after the one before them finishes.",
  },
  {
    icon: Users,
    title: "Several people, any order",
    desc: "Everyone gets the link at once and can sign whenever they like.",
  },
];

const TRUST: { icon: typeof ShieldCheck; text: string }[] = [
  { icon: ShieldCheck, text: "Each signature is locked into the final PDF with a timestamp." },
  { icon: FileCheck2, text: "A clear record shows who signed, when, and from where." },
  { icon: Info, text: "People sign from their own private link — no account needed." },
];

/**
 * A dismissible explainer that answers "what is eSign and how does it work?"
 * for someone about to send their first document. Collapsed to a single line
 * once dismissed (persisted in localStorage) so it never nags a repeat user.
 */
export function ESignHowItWorks({ className, forceOpen = false }: { className?: string; forceOpen?: boolean }) {
  const [dismissed, setDismissed] = useState(() => {
    if (forceOpen) return false;
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [open, setOpen] = useState(true);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode — fine, it just re-shows next visit */
    }
  };

  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground",
          className
        )}
      >
        <Info className="size-3.5" />
        How does e-signing work?
      </button>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-card", className)}>
      <div className="flex items-start gap-3 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <ShieldCheck className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Get documents signed online</h2>
            <button
              onClick={() => setOpen((o) => !o)}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label={open ? "Collapse" : "Expand"}
            >
              <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
            </button>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Upload a PDF, say who signs, place the signature boxes, then send. Three simple steps.
          </p>
        </div>
        {!forceOpen && (
          <button
            onClick={dismiss}
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-4 border-t border-border px-4 pb-4 pt-3">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Who needs to sign?
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {CASES.map((c) => (
                <div key={c.title} className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 p-2.5">
                  <c.icon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{c.title}</p>
                    <p className="text-[11px] leading-snug text-muted-foreground">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            {TRUST.map((t) => (
              <div key={t.text} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <t.icon className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                <span className="leading-snug">{t.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
