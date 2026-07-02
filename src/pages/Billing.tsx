import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../services/api";
import { Button } from "../components/ui/button";
import { Spinner } from "../components/ui/spinner";
import { CheckCircle2, Zap, Shield, Crown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Billing: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const plans = [
    {
      id: "FREE",
      name: "Basic",
      price: "₹0",
      period: "forever",
      desc: "Perfect for occasional use",
      features: [
        "5 operations per day",
        "5MB max file size",
        "Standard processing speed",
        "Basic tools access",
      ],
      icon: Shield,
      popular: false,
    },
    {
      id: "PRO",
      name: "Professional",
      price: "₹199",
      period: "per month",
      desc: "For heavy users and businesses",
      features: [
        "Unlimited daily operations",
        "100MB max file size",
        "Priority processing speed",
        "Advanced OCR access",
        "No ads & dedicated support",
      ],
      icon: Crown,
      popular: true,
    },
  ];

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast.error("Please sign in to upgrade your plan.");
      window.location.href = "/login";
      return;
    }
    
    if (user.plan === planId) {
      toast.info(`You are already on the ${planId} plan.`);
      return;
    }

    if (planId === "FREE") {
      toast.info("You are already on the free tier.");
      return;
    }

    setLoadingPlan(planId);
    try {
      const data = await apiService.initiateCheckout("plan_N1234abc");
      
      const options = {
        key: data.razorpayKey,
        subscription_id: data.subscriptionId,
        name: "PDF Tools SaaS",
        description: "Pro Plan Subscription",
        handler: async function (_response: any) {
          toast.success("Payment successful! Upgrading your account...");
          await new Promise(resolve => setTimeout(resolve, 2000));
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
      rzp.on("payment.failed", function (_response: any) {
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
      <div className="text-center mb-12 max-w-2xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-500 text-sm font-semibold mb-6 animate-fade-in-down">
          <Zap className="h-4 w-4" />
          Simple, transparent pricing
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
          Upgrade your PDF workflow
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Get unlimited access to all premium tools, faster processing speeds, and larger file uploads.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto px-4 w-full">
        {plans.map((plan, index) => {
          const isCurrentPlan = user?.plan === plan.id || (!user && plan.id === "FREE");
          const Icon = plan.icon;

          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-3xl border bg-card p-8 shadow-sm transition-all duration-300 animate-fade-in-up",
                plan.popular 
                  ? "border-primary shadow-xl shadow-primary/10 scale-100 md:scale-105 z-10" 
                  : "hover:border-primary/30 hover:shadow-md",
                isCurrentPlan && "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground shadow-sm">
                  Most Popular
                </div>
              )}

              <div className="flex items-center gap-4 mb-6">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl",
                  plan.popular ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.desc}</p>
                </div>
              </div>

              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                <span className="text-sm font-medium text-muted-foreground">/{plan.period}</span>
              </div>

              <div className="flex-1 space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className={cn(
                      "h-5 w-5 shrink-0",
                      plan.popular ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className="text-sm font-medium text-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                size="lg"
                variant={plan.popular ? "default" : "outline"}
                className={cn(
                  "w-full rounded-xl h-12 text-base font-bold transition-all active:scale-[0.98]",
                  isCurrentPlan && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => handleSubscribe(plan.id)}
                disabled={loadingPlan === plan.id || isCurrentPlan}
              >
                {loadingPlan === plan.id ? (
                  <Spinner className="mr-2 h-5 w-5" />
                ) : null}
                {isCurrentPlan ? "Current Plan" : plan.popular ? "Upgrade to Pro" : "Get Started"}
                {!isCurrentPlan && !loadingPlan && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-16 text-center max-w-2xl px-4 text-sm text-muted-foreground">
        <p>Payments are securely processed via Razorpay. Subscriptions automatically renew unless canceled. You can cancel anytime from your account settings.</p>
      </div>
    </div>
  );
};
export default Billing;
