import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../services/api";
import { Button } from "../components/ui/button";
import { Spinner } from "../components/ui/spinner";
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Crown,
  Monitor,
  Shield,
  WifiOff,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  FEATURE_COMPARE_ROWS,
  OFFLINE_PRODUCTS,
  ONLINE_PLANS,
  SALES_MAILTO,
  formatFeatureCell,
  type OnlinePlanId,
} from "@/lib/pricing";

const PLAN_ICONS = {
  FREE: Shield,
  PRO: Crown,
  ENTERPRISE: Building2,
} as const;

export const Billing: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planId: OnlinePlanId) => {
    if (planId === "ENTERPRISE") {
      navigate("/enterprise");
      return;
    }

    if (planId === "FREE") {
      if (!user) {
        navigate("/register");
        return;
      }
      toast.info("You are already on the free tier.");
      return;
    }

    if (!user) {
      toast.error("Please sign in to upgrade your plan.");
      navigate("/login");
      return;
    }

    if (user.plan === planId) {
      toast.info(`You are already on the ${planId} plan.`);
      return;
    }

    setLoadingPlan(planId);
    try {
      const data = await apiService.initiateCheckout("plan_N1234abc");

      const options = {
        key: data.razorpayKey,
        subscription_id: data.subscriptionId,
        name: "PDF Toolkit",
        description: "Pro Plan — $12/mo",
        handler: async function (_response: unknown) {
          toast.success("Payment successful! Upgrading your account...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
          await refreshProfile();
          toast.success("Welcome to Pro!");
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: "#0f172a",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (_response: unknown) {
        toast.error("Payment failed. Please try again.");
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate checkout.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="flex flex-col items-center py-8 animate-fade-in">
      {/* Hero */}
      <div className="text-center mb-12 max-w-2xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 text-sm font-semibold mb-6">
          <Zap className="h-4 w-4" />
          Simple pricing
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
          Online plans &amp; offline licenses
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Start free in the cloud. Upgrade to Pro when you need unlimited tools, eSign, and AI.
          Prefer local? License our Windows desktop apps.
        </p>
        <p className="mt-3 text-sm font-medium text-muted-foreground">All online prices in USD.</p>
      </div>

      {/* Online cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto px-4 w-full">
        {ONLINE_PLANS.map((plan, index) => {
          const isCurrentPlan =
            user?.plan === plan.id || (!user && plan.id === "FREE");
          const Icon = PLAN_ICONS[plan.id];

          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-3xl border bg-card p-8 shadow-sm transition-all duration-300",
                plan.featured
                  ? "border-primary shadow-xl shadow-primary/10 scale-100 md:scale-105 z-10"
                  : "hover:border-primary/30 hover:shadow-md",
                isCurrentPlan && "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground shadow-sm">
                  Best value
                </div>
              )}

              <div className="flex items-center gap-4 mb-6">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl",
                    plan.featured
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.blurb}</p>
                </div>
              </div>

              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                {plan.period && (
                  <span className="text-sm font-medium text-muted-foreground">/{plan.period}</span>
                )}
              </div>

              <ul className="flex-1 space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <CheckCircle2
                      className={cn(
                        "h-5 w-5 shrink-0",
                        plan.featured ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span className="text-sm font-medium text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                variant={plan.featured ? "default" : "outline"}
                className={cn(
                  "w-full rounded-xl h-12 text-base font-bold",
                  isCurrentPlan && plan.id !== "ENTERPRISE" && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => handleSubscribe(plan.id)}
                disabled={
                  loadingPlan === plan.id || (isCurrentPlan && plan.id !== "ENTERPRISE")
                }
              >
                {loadingPlan === plan.id ? <Spinner className="mr-2 h-5 w-5" /> : null}
                {plan.id === "ENTERPRISE"
                  ? "Learn more"
                  : isCurrentPlan
                    ? "Current Plan"
                    : plan.featured
                      ? "Upgrade to Pro"
                      : "Get Started"}
                {!isCurrentPlan && !loadingPlan && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Feature compare */}
      <div id="compare" className="mt-20 w-full max-w-5xl px-4 scroll-mt-24">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Compare all features
          </h2>
          <p className="mt-2 text-muted-foreground">
            Everything included in online Free, Pro, and Enterprise.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3.5 font-semibold text-foreground">Feature</th>
                <th className="px-4 py-3.5 font-semibold text-foreground text-center">Free</th>
                <th className="px-4 py-3.5 font-semibold text-primary text-center">Pro</th>
                <th className="px-4 py-3.5 font-semibold text-foreground text-center">
                  Enterprise
                </th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_COMPARE_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{row.label}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    <Cell value={row.free} />
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-foreground">
                    <Cell value={row.pro} highlight />
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    <Cell value={row.enterprise} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Offline */}
      <div className="mt-20 w-full max-w-5xl px-4">
        <div className="text-center mb-8">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
            <WifiOff className="h-3.5 w-3.5" />
            Offline · Windows
          </p>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Desktop licenses
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
            Prefer files on your machine? License PDF Toolkit and Diagram Studio for Windows —
            offline after activation. Contact sales for seats — no surprise cloud fees.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {OFFLINE_PRODUCTS.map((product) => (
            <div
              key={product.id}
              className="flex flex-col rounded-3xl border border-border bg-card p-7 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                  <Monitor className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{product.name}</h3>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    License · Contact sales
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{product.blurb}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {product.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    {b}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button asChild className="rounded-xl">
                  <a href={product.downloadMailto}>Download</a>
                </Button>
                <Button asChild variant="outline" className="rounded-xl">
                  <a href={product.licenseMailto}>Get license</a>
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/desktop">
              Explore desktop
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-full">
            <a href={SALES_MAILTO}>Contact sales</a>
          </Button>
        </div>
      </div>

      <div className="mt-16 text-center max-w-2xl px-4 text-sm text-muted-foreground">
        <p>
          Online prices are in USD. Cloud subscriptions renew via Razorpay unless canceled.
          Desktop apps use a license key — purchase or renew through sales.
        </p>
      </div>
    </div>
  );
};

function Cell({
  value,
  highlight,
}: {
  value: boolean | string;
  highlight?: boolean;
}) {
  if (value === true) {
    return (
      <Check
        className={cn(
          "mx-auto h-5 w-5",
          highlight ? "text-primary" : "text-emerald-600"
        )}
        strokeWidth={2.5}
      />
    );
  }
  if (value === false) {
    return <span className="text-muted-foreground/50">—</span>;
  }
  return <span>{formatFeatureCell(value)}</span>;
}

export default Billing;
