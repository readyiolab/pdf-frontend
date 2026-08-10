import { NavLink, Outlet, useNavigate } from "react-router-dom";
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

const NAV = [
  { to: "/letters/studio", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/letters/templates", label: "Templates", icon: PenLine },
  { to: "/letters/brands", label: "Brand", icon: Palette },
  { to: "/letters/batches/new", label: "New batch", icon: Upload },
  { to: "/letters/history", label: "History", icon: History },
  { to: "/letters/team", label: "Team", icon: Users },
] as const;

/**
 * Full-viewport Letter Studio chrome — replaces site navbar/footer while inside
 * the product. Marketing page at /letters stays outside this shell.
 */
export function LetterStudioShell() {
  const navigate = useNavigate();

  return (
    <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-[#F4F6FA] text-slate-900">
      {/* Top bar */}
      <header className="z-20 flex h-12 shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/95 px-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-md sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-600/25">
            <FileText className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-heading text-sm font-bold tracking-tight">
              Letter Studio
            </p>
          </div>
        </div>

        <nav className="ml-2 hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto md:flex">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={"end" in item ? item.end : false}
                className={({ isActive }) =>
                  cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                    isActive
                      ? "bg-indigo-50 text-indigo-800"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )
                }
              >
                <Icon className="size-3.5 opacity-80" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-lg text-xs text-slate-600"
            onClick={() => navigate("/letters")}
          >
            Overview
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-slate-500"
            aria-label="Close studio"
            onClick={() => navigate("/")}
          >
            <X className="size-4" />
          </Button>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-slate-200/80 bg-white px-2 py-1.5 md:hidden">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={"end" in item ? item.end : false}
              className={({ isActive }) =>
                cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold",
                  isActive
                    ? "bg-indigo-50 text-indigo-800"
                    : "text-slate-600 hover:bg-slate-50"
                )
              }
            >
              <Icon className="size-3.5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
