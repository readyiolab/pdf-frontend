import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/button";
import {
  Menu,
  Moon,
  Sun,
  LogOut,
  CreditCard,
  Settings,
  Zap,
  Search,
  ChevronDown,
  X,
  FileText,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  PenTool,
  History,
  Cloud,
  User as UserIcon,
  Monitor,
  GitBranch,
} from "lucide-react";
import { useTheme } from "../theme-provider";
import { TOOLS, TOOL_CATEGORIES, getToolRoute } from "@/lib/design-tokens";
import { AuthModal } from "../auth/AuthModal";
import { cn } from "@/lib/utils";
import { prefetchHandlers, prefetchRoute } from "@/lib/routePrefetch";

const TOOL_GROUPS = TOOL_CATEGORIES.filter((cat) => cat !== "All")
  .map((cat) => ({
    category: cat,
    tools: TOOLS.filter((tool) => tool.categories[1] === cat),
  }))
  .filter((group) => group.tools.length > 0);

function isAiTool(id: string) {
  return id === "summarize" || id === "chatpdf" || id === "explain" || id === "ocr";
}

function navActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const isHome = location.pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSearch, setMobileSearch] = useState("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "register">("login");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    closeTools();
    closeMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const solidNav = !isHome || scrolled;

  const openAuthModal = (tab: "login" | "register") => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const closeTools = () => {
    setIsToolsOpen(false);
    setSearchQuery("");
  };

  const closeMobile = () => {
    setIsMobileMenuOpen(false);
    setMobileSearch("");
  };

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return TOOLS.filter(
      (t) => t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const mobileFiltered = useMemo(() => {
    if (!mobileSearch.trim()) return null;
    const q = mobileSearch.toLowerCase();
    return TOOLS.filter(
      (t) => t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q)
    );
  }, [mobileSearch]);

  const linkClass = (to: string) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
      navActive(location.pathname, to)
        ? "bg-slate-900/5 text-foreground shadow-sm ring-1 ring-slate-900/5 dark:bg-white/10 dark:ring-white/10"
        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
    );

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300",
          solidNav
            ? "border-b border-border/60 bg-background/85 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.35)] backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        )}
      >
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="-ml-1 cursor-pointer rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link to="/" className="group flex shrink-0 items-center gap-2" {...prefetchHandlers("/")}>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/25 transition-transform group-hover:scale-[1.03]">
                <FileText className="h-4 w-4" />
              </span>
              <span className="font-heading text-base font-bold tracking-tight text-foreground sm:text-lg">
                PDF<span className="text-blue-600">Toolkit</span>
              </span>
            </Link>

            <nav className="relative ml-1 hidden items-center gap-0.5 lg:flex">
              <div
                className="relative py-2"
                onMouseEnter={() => {
                  setIsToolsOpen(true);
                  prefetchRoute("/workspace");
                }}
                onMouseLeave={closeTools}
              >
                <button
                  type="button"
                  className={cn(
                    "flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    isToolsOpen || location.pathname.startsWith("/workspace")
                      ? "bg-slate-900/5 text-foreground shadow-sm ring-1 ring-slate-900/5 dark:bg-white/10 dark:ring-white/10"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  Tools
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      isToolsOpen && "rotate-180"
                    )}
                  />
                </button>

                {isToolsOpen && (
                  <div className="absolute left-0 top-full z-50 w-[min(92vw,580px)] pt-2">
                    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/95 p-4 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                      <div className="relative mb-3">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search tools…"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-9 w-full rounded-xl border border-border bg-muted/40 pl-9 pr-3 text-xs outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      {searchQuery.trim() ? (
                        <div className="max-h-72 space-y-0.5 overflow-y-auto overscroll-contain pr-0.5">
                          {filteredTools.length === 0 ? (
                            <p className="py-8 text-center text-xs text-muted-foreground">
                              No tools found
                            </p>
                          ) : (
                            filteredTools.map((tool) => {
                              const Icon = tool.icon;
                              return (
                                <Link
                                  key={tool.id}
                                  to={getToolRoute(tool)}
                                  onClick={closeTools}
                                  onMouseEnter={() => prefetchRoute(getToolRoute(tool))}
                                  onFocus={() => prefetchRoute(getToolRoute(tool))}
                                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-muted"
                                >
                                  <span
                                    className={cn(
                                      "flex h-8 w-8 items-center justify-center rounded-lg",
                                      tool.accent
                                    )}
                                  >
                                    <Icon className={cn("h-4 w-4", tool.accentText)} />
                                  </span>
                                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                                    {tool.name}
                                  </span>
                                  {isAiTool(tool.id) && (
                                    <span className="shrink-0 rounded-md bg-fuchsia-500/10 px-1.5 py-0.5 text-[9px] font-bold text-fuchsia-600">
                                      AI
                                    </span>
                                  )}
                                </Link>
                              );
                            })
                          )}
                        </div>
                      ) : (
                        <div className="grid max-h-[min(70vh,420px)] grid-cols-2 gap-x-5 gap-y-4 overflow-y-auto overscroll-contain pr-0.5">
                          {TOOL_GROUPS.map((group) => (
                            <div key={group.category}>
                              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                {group.category}
                              </p>
                              <ul className="space-y-0.5">
                                {group.tools.map((tool) => {
                                  const Icon = tool.icon;
                                  return (
                                    <li key={tool.id}>
                                      <Link
                                        to={getToolRoute(tool)}
                                        onClick={closeTools}
                                        onMouseEnter={() => prefetchRoute(getToolRoute(tool))}
                                        onFocus={() => prefetchRoute(getToolRoute(tool))}
                                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted"
                                      >
                                        <span
                                          className={cn(
                                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                                            tool.accent
                                          )}
                                        >
                                          <Icon className={cn("h-3.5 w-3.5", tool.accentText)} />
                                        </span>
                                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                                          {tool.name}
                                        </span>
                                        {isAiTool(tool.id) && (
                                          <span className="shrink-0 rounded bg-fuchsia-500/10 px-1 py-0.5 text-[8px] font-bold text-fuchsia-600">
                                            AI
                                          </span>
                                        )}
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <ShieldCheck className="h-3 w-3 text-emerald-500" />
                          Encrypted processing
                        </span>
                        <Link
                          to="/workspace"
                          onClick={closeTools}
                          {...prefetchHandlers("/workspace")}
                          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                        >
                          All tools ({TOOLS.length})
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Link to="/workspace" className={linkClass("/workspace")} {...prefetchHandlers("/workspace")}>
                Workspace
              </Link>
              <Link to="/esign" className={linkClass("/esign")} {...prefetchHandlers("/esign")}>
                eSign
              </Link>
              <Link to="/letters" className={linkClass("/letters")} {...prefetchHandlers("/letters")}>
                Letters
              </Link>
              <Link to="/diagrams" className={linkClass("/diagrams")} {...prefetchHandlers("/diagrams")}>
                Diagrams
              </Link>
              <Link to="/ai/summarize" className={linkClass("/ai")} {...prefetchHandlers("/ai/summarize")}>
                AI Suite
              </Link>
              <Link to="/enterprise" className={linkClass("/enterprise")} {...prefetchHandlers("/enterprise")}>
                Your cloud
              </Link>
              <Link to="/desktop" className={linkClass("/desktop")} {...prefetchHandlers("/desktop")}>
                Desktop
              </Link>
              <Link to="/billing" className={linkClass("/billing")} {...prefetchHandlers("/billing")}>
                Pricing
              </Link>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="cursor-pointer rounded-xl border border-border/60 p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden max-w-[140px] text-right xl:block">
                  <p className="truncate text-xs font-semibold leading-none text-foreground">
                    {user.name}
                  </p>
                  <p className="mt-1 flex items-center justify-end gap-1 text-[10px] font-semibold text-muted-foreground">
                    <span
                      className={cn(
                        "inline-block h-1.5 w-1.5 rounded-full",
                        user.plan === "PRO"
                          ? "bg-amber-500"
                          : user.plan === "ENTERPRISE"
                            ? "bg-sky-500"
                            : "bg-emerald-500"
                      )}
                    />
                    {user.plan}
                  </p>
                </div>

                <div className="group relative">
                  <button
                    type="button"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-blue-600/20 bg-blue-600/10 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-600/15 sm:h-9 sm:w-9 dark:text-blue-300"
                    aria-label="Account menu"
                  >
                    {user.name?.charAt(0).toUpperCase()}
                  </button>
                  <div className="invisible absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-2xl border border-border/80 bg-card/95 p-1.5 opacity-0 shadow-xl backdrop-blur-xl transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                    <div className="mb-1 border-b border-border px-3 py-2">
                      <p className="truncate text-xs font-bold">{user.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium hover:bg-muted"
                      {...prefetchHandlers("/profile")}
                    >
                      <Settings className="h-3.5 w-3.5 text-muted-foreground" /> Account
                    </Link>
                    <Link
                      to="/history"
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium hover:bg-muted"
                      {...prefetchHandlers("/history")}
                    >
                      <History className="h-3.5 w-3.5 text-muted-foreground" /> History
                    </Link>
                    <Link
                      to={user.plan === "ENTERPRISE" ? "/settings/cloud" : "/enterprise"}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium hover:bg-muted"
                      {...prefetchHandlers(
                        user.plan === "ENTERPRISE" ? "/settings/cloud" : "/enterprise"
                      )}
                    >
                      <Cloud className="h-3.5 w-3.5 text-muted-foreground" /> Your cloud
                    </Link>
                    <Link
                      to="/billing"
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium hover:bg-muted"
                      {...prefetchHandlers("/billing")}
                    >
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" /> Billing
                    </Link>
                    <div className="my-1 h-px bg-border" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Log out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className="hidden cursor-pointer rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground sm:inline-flex"
                >
                  Log in
                </button>
                <Button
                  size="sm"
                  onClick={() => openAuthModal("register")}
                  className="h-8 rounded-full bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 sm:h-9 sm:px-4"
                >
                  Get started
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer bg-black/40 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={closeMobile}
          />
          <div className="relative z-10 flex h-full w-full max-w-[min(100%,20rem)] flex-col bg-card shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <Link to="/" onClick={closeMobile} className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <FileText className="h-4 w-4" />
                </span>
                <span className="font-heading text-sm font-bold tracking-tight">
                  PDF<span className="text-blue-600">Toolkit</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={closeMobile}
                className="cursor-pointer rounded-xl p-2 text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
              <div className="space-y-0.5">
                {[
                  { to: "/workspace", match: "/workspace", label: "Workspace", icon: ArrowRight, tone: "text-blue-600" },
                  { to: "/esign", match: "/esign", label: "eSign", icon: PenTool, tone: "text-blue-600" },
                  { to: "/letters", match: "/letters", label: "Letters", icon: FileText, tone: "text-indigo-600" },
                  { to: "/diagrams", match: "/diagrams", label: "Diagrams", icon: GitBranch, tone: "text-orange-600" },
                  { to: "/ai/summarize", match: "/ai", label: "AI Suite", icon: Sparkles, tone: "text-fuchsia-500" },
                  { to: "/enterprise", match: "/enterprise", label: "Your cloud", icon: Cloud, tone: "text-sky-500" },
                  { to: "/desktop", match: "/desktop", label: "Desktop", icon: Monitor, tone: "text-blue-600" },
                  { to: "/billing", match: "/billing", label: "Pricing", icon: Zap, tone: "text-amber-500" },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = navActive(location.pathname, item.match);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={closeMobile}
                      {...prefetchHandlers(item.to)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                        active
                          ? "bg-blue-50 text-blue-800 dark:bg-blue-500/10 dark:text-blue-200"
                          : "hover:bg-muted"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", item.tone)} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              <div className="mt-4 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => setMobileToolsOpen((o) => !o)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    All tools ({TOOLS.length})
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      mobileToolsOpen && "rotate-180"
                    )}
                  />
                </button>

                {mobileToolsOpen && (
                  <div className="mt-2 space-y-3">
                    <div className="relative px-1">
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search tools…"
                        value={mobileSearch}
                        onChange={(e) => setMobileSearch(e.target.value)}
                        className="h-9 w-full rounded-xl border border-border bg-muted/40 pl-9 pr-3 text-xs outline-none focus:border-primary"
                      />
                    </div>

                    {mobileFiltered ? (
                      <div className="space-y-0.5">
                        {mobileFiltered.length === 0 ? (
                          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                            No tools found
                          </p>
                        ) : (
                          mobileFiltered.map((tool) => {
                            const Icon = tool.icon;
                            return (
                              <Link
                                key={tool.id}
                                to={getToolRoute(tool)}
                                onClick={closeMobile}
                                className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-muted"
                              >
                                <span
                                  className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-lg",
                                    tool.accent
                                  )}
                                >
                                  <Icon className={cn("h-4 w-4", tool.accentText)} />
                                </span>
                                <span className="truncate text-xs font-semibold">{tool.name}</span>
                              </Link>
                            );
                          })
                        )}
                      </div>
                    ) : (
                      TOOL_GROUPS.map((group) => (
                        <div key={group.category}>
                          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {group.category}
                          </p>
                          <div className="space-y-0.5">
                            {group.tools.map((tool) => {
                              const Icon = tool.icon;
                              return (
                                <Link
                                  key={tool.id}
                                  to={getToolRoute(tool)}
                                  onClick={closeMobile}
                                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-muted active:bg-muted"
                                >
                                  <span
                                    className={cn(
                                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                      tool.accent
                                    )}
                                  >
                                    <Icon className={cn("h-4 w-4", tool.accentText)} />
                                  </span>
                                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                                    {tool.name}
                                  </span>
                                  {isAiTool(tool.id) && (
                                    <span className="ml-auto shrink-0 rounded bg-fuchsia-500/10 px-1.5 py-0.5 text-[9px] font-bold text-fuchsia-600">
                                      AI
                                    </span>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1 py-1">
                    <UserIcon className="h-4 w-4 shrink-0 text-blue-600" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold">{user.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="h-9 w-full rounded-xl text-xs font-semibold text-destructive"
                  >
                    Log out
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => openAuthModal("login")}
                    variant="outline"
                    className="h-9 rounded-xl text-xs font-semibold"
                  >
                    Log in
                  </Button>
                  <Button
                    onClick={() => openAuthModal("register")}
                    className="h-9 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Sign up
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </>
  );
};
