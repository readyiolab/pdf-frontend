import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { TOOLS, getToolRoute, type ToolConfig } from "@/lib/design-tokens";
import {
  LayoutDashboard,
  History,
  CreditCard,
  User,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { token } = useAuth();
  const location = useLocation();

  // eSign is NOT listed here — it lives in the PDF Toolkit section below,
  // sourced from TOOLS, so it appears exactly once in the sidebar.
  const mainNavItems = [
    { name: "Workspace Dashboard", path: "/workspace", icon: LayoutDashboard },
    { name: "History Logs", path: "/history", icon: History, requiresAuth: true },
    { name: "Pricing & Plans", path: "/billing", icon: CreditCard },
    { name: "My Settings", path: "/profile", icon: User, requiresAuth: true },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Matches on prefix so a tool's sub-routes keep it highlighted — /sign/:id
  // (the designer) must not un-highlight the eSign entry.
  const isToolActive = (tool: ToolConfig) => {
    const route = getToolRoute(tool);
    return location.pathname === route || location.pathname.startsWith(`${route}/`);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden animate-in fade-in"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex-col border-r bg-card/50 backdrop-blur-md pt-0 transition-transform duration-300 md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b md:hidden bg-background">
          <span className="font-bold">Navigation</span>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6 gap-8 no-scrollbar">
          {/* Main Navigation */}
          <div>
            <span className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-3">
              Management
            </span>
            <nav className="space-y-1">
              {mainNavItems.map((item) => {
                if (item.requiresAuth && !token) return null;
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* PDF Tools Navigation */}
          <div className="flex flex-1 flex-col">
            <span className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-3">
              PDF Toolkit
            </span>
            <nav className="space-y-1 pb-4">
              {TOOLS.map((tool) => {
                if (tool.requiresAuth && !token) return null;
                const Icon = tool.icon;
                const active = isToolActive(tool);

                return (
                  <Link
                    key={tool.id}
                    to={getToolRoute(tool)}
                    onClick={onClose}
                    className={cn(
                      "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150",
                      active
                        ? "bg-card border shadow-sm text-foreground ring-1 ring-primary/20"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                        active ? tool.accent : "bg-transparent group-hover:bg-muted-foreground/10"
                      )}>
                        <Icon className={cn("h-4 w-4", active ? tool.accentText : "text-muted-foreground group-hover:text-foreground")} />
                      </div>
                      <span>{tool.name}</span>
                    </div>
                    {active && <ChevronRight className="h-4 w-4 text-primary" />}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
};
