import { motion } from "framer-motion";
import {
  FileText,
  GitMerge,
  Lock,
  Minimize2,
  Monitor,
  RotateCw,
  Scissors,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DESKTOP_EASE } from "./motion";

export type DesktopAppMockVariant = "light" | "dark";

interface DesktopAppMockProps {
  variant?: DesktopAppMockVariant;
  className?: string;
}

const TOOLS = [
  { label: "Merge", icon: GitMerge, active: true },
  { label: "Split", icon: Scissors, active: false },
  { label: "Compress", icon: Minimize2, active: false },
  { label: "Rotate", icon: RotateCw, active: false },
  { label: "Protect", icon: Lock, active: false },
] as const;

const PAGES = [
  { n: 1, label: "Cover", tone: "from-blue-50 to-white" },
  { n: 2, label: "Terms", tone: "from-slate-50 to-white" },
  { n: 3, label: "Annex", tone: "from-sky-50 to-white" },
] as const;

export function DesktopAppMock({
  variant = "light",
  className,
}: DesktopAppMockProps) {
  const dark = variant === "dark";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl shadow-[0_36px_110px_-28px_rgba(15,23,42,0.42)] ring-1 sm:rounded-3xl",
        dark
          ? "border border-white/10 bg-slate-900/90 ring-white/10"
          : "border border-white/90 bg-white/95 ring-slate-200/70",
        className
      )}
    >
      {/* Windows title bar */}
      <div
        className={cn(
          "flex items-center gap-2 border-b px-3 py-2.5 sm:px-4",
          dark
            ? "border-white/10 bg-gradient-to-r from-slate-950/90 to-slate-900/80"
            : "border-slate-100/90 bg-gradient-to-r from-slate-50 to-white"
        )}
      >
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#E81123]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FFB900]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#107C10]" />
        </div>
        <div
          className={cn(
            "ml-2 flex min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 py-1",
            dark ? "bg-white/5" : "bg-white shadow-sm ring-1 ring-slate-200/80"
          )}
        >
          <Monitor
            className={cn("h-3.5 w-3.5 shrink-0", dark ? "text-sky-400" : "text-blue-600")}
          />
          <span
            className={cn(
              "truncate text-[11px] font-medium sm:text-xs",
              dark ? "text-slate-300" : "text-slate-500"
            )}
          >
            PDF Toolkit — Desktop · Contract_Pack.pdf
          </span>
        </div>
        <span
          className={cn(
            "hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline-flex",
            dark
              ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25"
              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
          )}
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Offline
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
        <aside
          className={cn(
            "hidden border-r p-3.5 md:block",
            dark ? "border-white/10 bg-slate-950/50" : "border-slate-100 bg-slate-50/80"
          )}
        >
          <p
            className={cn(
              "mb-2.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em]",
              dark ? "text-slate-500" : "text-slate-400"
            )}
          >
            Tools
          </p>
          <ul className="space-y-1">
            {TOOLS.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.label}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors",
                    item.active
                      ? dark
                        ? "bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20"
                        : "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                      : dark
                        ? "text-slate-400"
                        : "text-slate-500 hover:bg-white/70"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                  {item.label}
                </li>
              );
            })}
          </ul>
          <div
            className={cn(
              "mt-4 rounded-xl p-3 ring-1",
              dark ? "bg-white/[0.04] ring-white/10" : "bg-white shadow-sm ring-slate-200/80"
            )}
          >
            <p
              className={cn(
                "flex items-center gap-1.5 text-[10px] font-semibold",
                dark ? "text-sky-300" : "text-blue-700"
              )}
            >
              <ShieldCheck className="h-3 w-3" />
              Local processing
            </p>
            <p
              className={cn(
                "mt-1 text-[10px] leading-relaxed",
                dark ? "text-slate-500" : "text-slate-400"
              )}
            >
              Files stay on this PC. No upload required.
            </p>
          </div>
        </aside>

        <div
          className={cn(
            "space-y-4 p-4 sm:p-6",
            dark
              ? "bg-gradient-to-br from-slate-900 to-slate-950"
              : "bg-gradient-to-br from-white via-white to-slate-50/90"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg",
                  dark
                    ? "bg-sky-500 shadow-sky-500/30"
                    : "bg-blue-600 shadow-blue-600/30"
                )}
              >
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    dark ? "text-white" : "text-slate-900"
                  )}
                >
                  Contract_Pack.pdf
                </p>
                <p className={cn("text-xs", dark ? "text-slate-400" : "text-slate-500")}>
                  3 files · Merge ready · On this device
                </p>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                dark
                  ? "bg-sky-500/15 text-sky-300 ring-sky-400/25"
                  : "bg-blue-50 text-blue-700 ring-blue-100"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  dark ? "bg-sky-400" : "bg-blue-600"
                )}
              />
              Licensed
            </span>
          </div>

          <div
            className={cn(
              "h-2 overflow-hidden rounded-full",
              dark ? "bg-slate-800" : "bg-slate-100"
            )}
          >
            <motion.div
              className={cn(
                "h-full rounded-full",
                dark
                  ? "bg-gradient-to-r from-sky-500 to-blue-400"
                  : "bg-gradient-to-r from-blue-600 to-sky-500"
              )}
              initial={{ width: "0%" }}
              animate={{ width: "68%" }}
              transition={{ duration: 1.15, delay: 0.55, ease: DESKTOP_EASE }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {PAGES.map((page, i) => (
              <motion.div
                key={page.n}
                className={cn(
                  "relative aspect-[3/4] overflow-hidden rounded-xl border p-2.5 shadow-sm",
                  dark
                    ? "border-white/10 bg-slate-800/80"
                    : cn("border-slate-200/80 bg-gradient-to-b", page.tone)
                )}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.2 + i * 0.09, ease: DESKTOP_EASE }}
              >
                <div
                  className={cn(
                    "mb-2 h-1.5 w-2/3 rounded-full",
                    dark ? "bg-slate-600" : "bg-slate-200/90"
                  )}
                />
                <div className="space-y-1.5">
                  {[100, 85, 92, 70, 88, 60].map((w, j) => (
                    <div
                      key={j}
                      className={cn(
                        "h-1 rounded-full",
                        dark ? "bg-slate-700" : "bg-slate-200/70"
                      )}
                      style={{ width: `${w}%` }}
                    />
                  ))}
                </div>
                <span
                  className={cn(
                    "absolute bottom-2 left-2 rounded-md px-1.5 py-0.5 text-[9px] font-semibold",
                    dark
                      ? "bg-slate-900/70 text-slate-400"
                      : "bg-white/90 text-slate-500 shadow-sm"
                  )}
                >
                  {page.n}. {page.label}
                </span>
              </motion.div>
            ))}
          </div>

          <div
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ring-1",
              dark
                ? "bg-white/[0.04] ring-white/10"
                : "bg-slate-50/90 ring-slate-200/70"
            )}
          >
            <p
              className={cn(
                "truncate text-[11px] font-medium",
                dark ? "text-slate-400" : "text-slate-500"
              )}
            >
              Output → Documents\PDF Toolkit\
            </p>
            <span
              className={cn(
                "shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold",
                dark ? "bg-sky-500 text-slate-950" : "bg-blue-600 text-white"
              )}
            >
              Merge
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
