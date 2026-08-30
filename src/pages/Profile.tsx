import React, { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Spinner } from "../components/ui/spinner";
import { User, Mail, CreditCard, Clock, LogOut, Shield, Cloud } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiService } from "@/services/api";

function ContactAddressCard() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    phone: "",
    company: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });

  useEffect(() => {
    apiService
      .getTrackingProfile()
      .then((data: any) => {
        const p = data.profile || {};
        setForm({
          phone: p.phone || "",
          company: p.company || "",
          addressLine1: p.addressLine1 || "",
          addressLine2: p.addressLine2 || "",
          city: p.city || "",
          state: p.state || "",
          postalCode: p.postalCode || "",
          country: p.country || "",
        });
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await apiService.updateTrackingProfile(form);
      toast.success("Contact details saved");
    } catch (e: any) {
      toast.error(e.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-bold mb-1">Contact &amp; address</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Optional billing / mailing details for your account.
      </p>
      {loading ? (
        <Spinner className="h-5 w-5" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={set("phone")} />
          </div>
          <div className="space-y-1">
            <Label>Company</Label>
            <Input value={form.company} onChange={set("company")} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Address line 1</Label>
            <Input value={form.addressLine1} onChange={set("addressLine1")} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Address line 2</Label>
            <Input value={form.addressLine2} onChange={set("addressLine2")} />
          </div>
          <div className="space-y-1">
            <Label>City</Label>
            <Input value={form.city} onChange={set("city")} />
          </div>
          <div className="space-y-1">
            <Label>State</Label>
            <Input value={form.state} onChange={set("state")} />
          </div>
          <div className="space-y-1">
            <Label>Postal code</Label>
            <Input value={form.postalCode} onChange={set("postalCode")} />
          </div>
          <div className="space-y-1">
            <Label>Country</Label>
            <Input value={form.country} onChange={set("country")} />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save contact details"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export const Profile: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

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
          Manage your profile, API keys, cloud storage, and usage limits.
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

          <ContactAddressCard />

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
              Developer API access
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your browser session uses secure httpOnly cookies. For programmatic API access, use
              scoped API keys from the developer portal — never copy session credentials from the browser.
            </p>
            <Button variant="outline" onClick={() => navigate("/developer")}>
              View API documentation
            </Button>
          </div>

          <div className="rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50/80 to-white p-6 shadow-sm dark:border-sky-500/20 dark:from-sky-500/10 dark:to-card">
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Cloud className="h-5 w-5 text-sky-600" />
              Your cloud storage
            </h2>
            {user.plan === "ENTERPRISE" ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect AWS, Azure, R2, GCS, or MinIO so uploads and signed PDFs write to your
                  bucket — not ours.
                </p>
                <Button
                  className="rounded-xl bg-sky-600 text-white hover:bg-sky-700"
                  onClick={() => navigate("/settings/cloud")}
                >
                  <Cloud className="mr-1.5 h-4 w-4" />
                  Connect / manage bucket
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Keep PDFs in <span className="font-medium text-foreground">your</span> AWS, Azure,
                  R2, GCS, or MinIO bucket. This is included with the{" "}
                  <span className="font-medium text-foreground">Enterprise</span> plan. Your current
                  plan is <span className="font-semibold text-foreground">{user.plan}</span>.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="rounded-xl bg-sky-600 text-white hover:bg-sky-700"
                    onClick={() => navigate("/enterprise")}
                  >
                    How your cloud works
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => navigate("/billing")}
                  >
                    Upgrade to Enterprise
                  </Button>
                </div>
              </>
            )}
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
              {(user.plan === "PRO" || user.plan === "ENTERPRISE") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  onClick={() =>
                    navigate(user.plan === "ENTERPRISE" ? "/settings/cloud" : "/enterprise")
                  }
                >
                  <Cloud className="mr-1.5 h-4 w-4" />
                  {user.plan === "ENTERPRISE" ? "Cloud storage" : "Your cloud"}
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
