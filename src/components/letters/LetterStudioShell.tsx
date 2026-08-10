import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FileText,
  History,
  LayoutDashboard,
  Palette,
  PenLine,
  Upload,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LetterOnboardingWizard } from "./LetterOnboardingWizard";

const NAV = [
  { to: "/letters/studio", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/letters/brands", label: "Brand", icon: Palette },
  { to: "/letters/templates", label: "Templates", icon: PenLine },
  { to: "/letters/batches/new", label: "New batch", icon: Upload },
  { to: "/letters/history", label: "History", icon: History },
  { to: "/letters/team", label: "Team", icon: Users },
] as const;

/**
 * Full-viewport Letter Studio — hover-expanding left sidebar + edge-to-edge content.
 * Marketing page at /letters stays outside this shell.
 */
export function LetterStudioShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const flush =
    location.pathname.startsWith("/letters/templates") ||
    location.pathname.startsWith("/letters/batches");

  return (
    <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-white text-slate-900">
      {/* Desktop sidebar — collapsed by default, expands on hover */}
      <aside
        className={cn(
          "group/sidebar hidden shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-[#F8FAFC]",
          "w-[64px] transition-[width] duration-200 ease-out hover:w-[220px] focus-within:w-[220px] md:flex"
        )}
      >
        <div className="flex h-12 items-center gap-2.5 border-b border-slate-200/80 px-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <FileText className="size-3.5" />
          </span>
          <p className="truncate font-heading text-sm font-bold tracking-tight opacity-0 transition-opacity duration-150 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
            Letter Studio
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={"end" in item ? item.end : false}
                title={item.label}
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40",
                    isActive
                      ? "bg-indigo-50 text-indigo-800"
                      : "text-slate-600 hover:bg-white hover:text-slate-900"
                  )
                }
              >
                <Icon className="size-4 shrink-0 opacity-80" />
                <span className="truncate opacity-0 transition-opacity duration-150 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-slate-200/80 p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            title="Product overview"
            className="h-9 w-full justify-start gap-2 rounded-lg px-2.5 text-xs text-slate-600 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            onClick={() => navigate("/letters")}
          >
            <FileText className="size-4 shrink-0 opacity-70" />
            <span className="truncate opacity-0 transition-opacity duration-150 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
              Product overview
            </span>
          </Button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 md:px-4">
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <FileText className="size-3.5" />
            </span>
            <p className="truncate font-heading text-sm font-bold">Letter Studio</p>
          </div>
          <p className="hidden text-sm text-slate-500 md:block">
            Create branded employee letters from Excel
          </p>
          <div className="ml-auto">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-slate-500 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
              aria-label="Close studio"
              onClick={() => navigate("/")}
            >
              <X className="size-4" />
            </Button>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-slate-200 bg-[#F8FAFC] px-2 py-1.5 md:hidden">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={"end" in item ? item.end : false}
                className={({ isActive }) =>
                  cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40",
                    isActive
                      ? "bg-indigo-50 text-indigo-800"
                      : "text-slate-600 hover:bg-white"
                  )
                }
              >
                <Icon className="size-3.5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div
          className={cn(
            "min-h-0 flex-1",
            flush ? "overflow-hidden" : "overflow-y-auto overscroll-contain"
          )}
        >
          <div className={cn(flush ? "flex h-full min-h-0 flex-col" : "min-h-full")}>
            <Outlet />
          </div>
        </div>
      </div>

      <LetterOnboardingWizard />
    </div>
  );
}
