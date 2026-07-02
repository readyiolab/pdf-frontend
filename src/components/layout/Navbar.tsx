import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/button";
import {
  Menu,
  Moon,
  Sun,
  User,
  LogOut,
  CreditCard,
  Settings,
  Zap,
} from "lucide-react";
import { useTheme } from "../theme-provider";
import { TOOLS } from "@/lib/design-tokens";

interface NavbarProps {
  onMenuClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 mx-auto max-w-[1600px]">
        
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors md:hidden"
            aria-label="Toggle Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M8.25 10.875a2.625 2.625 0 115.25 0 2.625 2.625 0 01-5.25 0z" />
                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.125 4.5a4.125 4.125 0 102.338 7.524l2.007 2.006a.75.75 0 101.06-1.06l-2.006-2.007a4.125 4.125 0 00-3.399-6.463z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">PDF Tools SaaS</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1 ml-6 relative">
            <button 
              className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
              onMouseEnter={() => setIsToolsOpen(true)}
              onMouseLeave={() => setIsToolsOpen(false)}
            >
              Tools
            </button>
            <Link to="/workspace" className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors">
              Workspace
            </Link>
            <Link to="/billing" className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors flex items-center gap-1.5">
              Pricing <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
            </Link>

            {/* Mega Menu Dropdown */}
            {isToolsOpen && (
              <div 
                className="absolute top-full left-0 mt-2 w-[480px] rounded-2xl border bg-card p-4 shadow-xl grid grid-cols-2 gap-2 animate-fade-in-up"
                onMouseEnter={() => setIsToolsOpen(true)}
                onMouseLeave={() => setIsToolsOpen(false)}
              >
                {TOOLS.slice(0, 8).map(tool => (
                  <Link
                    key={tool.id}
                    to={`/workspace/${tool.id}`}
                    className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted transition-colors"
                    onClick={() => setIsToolsOpen(false)}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tool.accent}`}>
                      <tool.icon className={`h-4 w-4 ${tool.accentText}`} />
                    </div>
                    <div>
                      <div className="text-sm font-bold">{tool.name}</div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1">{tool.desc}</div>
                    </div>
                  </Link>
                ))}
                <div className="col-span-2 pt-2 mt-2 border-t text-center">
                  <Link to="/workspace" className="text-xs font-semibold text-primary hover:underline">
                    View all tools &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-full text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-bold leading-none">{user.name}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-end gap-1">
                  <span className={`inline-block h-2 w-2 rounded-full ${user.plan === 'PRO' ? 'bg-amber-500' : 'bg-primary'}`} />
                  {user.plan} Plan
                </p>
              </div>
              <div className="relative group">
                <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold transition-transform group-hover:scale-105 border border-primary/20">
                  {user.name?.charAt(0).toUpperCase()}
                </button>
                {/* User Dropdown */}
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border bg-card p-2 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all animate-fade-in-up origin-top-right">
                  <div className="px-3 py-2 border-b mb-2 sm:hidden">
                    <p className="text-sm font-bold">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Link to="/profile" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">
                    <Settings className="h-4 w-4" /> Account Settings
                  </Link>
                  <Link to="/history" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">
                    <User className="h-4 w-4" /> Activity History
                  </Link>
                  <Link to="/billing" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">
                    <CreditCard className="h-4 w-4" /> Billing & Plan
                  </Link>
                  <div className="h-px bg-border my-2" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> Log out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="hidden sm:inline-block px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                Log in
              </Link>
              <Link to="/register">
                <Button className="rounded-xl px-5 font-bold shadow-sm">
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
