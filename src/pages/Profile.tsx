import React, { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Spinner } from "../components/ui/spinner";
import { User, Mail, CreditCard, Clock, LogOut, Shield, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Profile: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = React.useState(false);

  // Redirect if not logged in and done loading
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center animate-fade-in">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const copyToken = () => {
    const token = localStorage.getItem("saas_jwt_token");
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      toast.success("API Token copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Calculate usage percentage safely
  const usagePercentage = user.dailyOpsLimit > 0
    ? Math.min(100, Math.round((user.dailyOpsUsed / user.dailyOpsLimit) * 100))
    : 0;

  const circumference = 2 * Math.PI * 40; // r=40
  const strokeDashoffset = circumference - (usagePercentage / 100) * circumference;

  return (
    <div className="max-w-4xl mx-auto py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Account Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile, API keys, and view your usage limits.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Profile Info & Plan */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={user.name} disabled className="pl-9 bg-muted/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={user.email} disabled className="pl-9 bg-muted/50" />
                </div>
              </div>
            </div>
          </div>

          {!user.emailVerified && !user.isGuest && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-sm">
              <h2 className="mb-1 text-base font-semibold text-foreground">Email not verified yet</h2>
              <p className="mb-3 text-sm text-muted-foreground">
                You can use the workspace now. Verify anytime to unlock e-sign, AI, and billing.
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate("/verify-email")}>
                Verify email
              </Button>
            </div>
          )}

          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Developer API Token
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Use this token to authenticate API requests. Do not share this token with anyone.
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="password"
                value="••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"
                disabled
                className="font-mono bg-muted/50"
              />
              <Button
                variant="outline"
                onClick={copyToken}
                className="w-24 shrink-0 transition-all active:scale-95"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Usage & Actions */}
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Current Plan
            </h2>
            
            <div className="flex items-center justify-between mb-6 pb-6 border-b">
              <div>
                <p className="text-2xl font-extrabold text-foreground">{user.plan}</p>
                <p className="text-xs text-muted-foreground mt-1">Plan status: Active</p>
              </div>
              {user.plan === "FREE" && (
                <Button size="sm" className="rounded-lg shadow-sm" onClick={() => navigate("/billing")}>
                  Upgrade
                </Button>
              )}
            </div>

            <h3 className="text-sm font-semibold mb-4">Daily Usage</h3>
            <div className="flex justify-center mb-4">
              <div className="relative h-32 w-32">
                {/* SVG Ring Background */}
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle
                    className="stroke-muted"
                    strokeWidth="8"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                  {/* SVG Ring Progress */}
                  <circle
                    className={cn(
                      "transition-all duration-1000 ease-out",
                      usagePercentage >= 100 ? "stroke-destructive" : "stroke-primary"
                    )}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                </svg>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold">{user.dailyOpsRemaining}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Left</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between text-xs font-medium text-muted-foreground mb-4">
              <span>0</span>
              <span>{user.dailyOpsUsed} / {user.dailyOpsLimit === 999999 ? "∞" : user.dailyOpsLimit} used</span>
            </div>

            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Resets at {new Date(user.dailyOpsResetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <Button
            variant="destructive"
            className="w-full rounded-xl shadow-sm bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border-none"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out Securely
          </Button>
        </div>
      </div>
    </div>
  );
};
export default Profile;
