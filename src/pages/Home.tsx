import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { TOOLS } from "@/lib/design-tokens";
import { ChevronRight, Zap, CheckCircle2, ShieldCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export const Home: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center animate-fade-in">
      
      {/* Hero Section */}
      <section className="w-full max-w-5xl text-center py-16 md:py-24 px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-8 animate-fade-in-down">
          <Zap className="h-4 w-4" />
          The Ultimate PDF toolkit
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
          Every tool you need to work with <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">
            PDFs in one place
          </span>
        </h1>
        
        <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
          All 100% FREE and easy to use! Merge, split, compress, convert, rotate, unlock and watermark PDFs with just a few clicks.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            size="lg" 
            className="w-full sm:w-auto text-base font-bold px-8 h-14 rounded-xl shadow-lg hover:shadow-primary/25 transition-all"
            onClick={() => navigate("/workspace")}
          >
            Explore All PDF Tools
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
          {!user && (
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full sm:w-auto text-base font-bold px-8 h-14 rounded-xl"
              onClick={() => navigate("/register")}
            >
              Sign Up for Free
            </Button>
          )}
        </div>
      </section>

      {/* Feature grid */}
      <section className="w-full max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-card border shadow-sm">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Easy to Use</h3>
            <p className="text-sm text-muted-foreground">Make PDF editing as simple as possible. You don't need to install anything or learn how to use complex software.</p>
          </div>
          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-card border shadow-sm">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Maximum Security</h3>
            <p className="text-sm text-muted-foreground">Your files are encrypted and processed in the cloud. We automatically delete all uploaded files after 1 hour.</p>
          </div>
          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-card border shadow-sm">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Lightning Fast</h3>
            <p className="text-sm text-muted-foreground">Our distributed cloud infrastructure processes your files in seconds, no matter how large they are.</p>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="w-full max-w-6xl px-4 py-16 border-t">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Popular PDF Tools</h2>
          <p className="text-muted-foreground">Select a tool below to get started immediately.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOOLS.slice(0, 9).map((tool, index) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.id}
                to={`/workspace/${tool.id}`}
                className="group relative flex flex-col items-center text-center rounded-2xl border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={cn(
                  "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none",
                  tool.gradient
                )} />
                <div className={cn(
                  "relative flex h-14 w-14 items-center justify-center rounded-2xl mb-4 transition-transform duration-300 group-hover:scale-110",
                  tool.accent
                )}>
                  <Icon className={cn("h-7 w-7", tool.accentText)} />
                </div>
                <h3 className="relative text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {tool.name}
                </h3>
                <p className="relative text-sm text-muted-foreground leading-relaxed">
                  {tool.desc}
                </p>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Button variant="outline" size="lg" className="rounded-xl px-8" onClick={() => navigate("/workspace")}>
            See All PDF Tools
          </Button>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full max-w-5xl px-4 py-20 my-12">
        <div className="relative rounded-3xl overflow-hidden bg-foreground text-background p-8 md:p-12 text-center shadow-2xl">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent pointer-events-none" />
          <h2 className="relative text-3xl md:text-4xl font-bold mb-4">Ready to boost your productivity?</h2>
          <p className="relative text-lg opacity-80 mb-8 max-w-xl mx-auto">
            Join thousands of users who trust our PDF tools for their daily work. Get unlimited access to all features.
          </p>
          <div className="relative flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="h-12 px-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-base font-bold border-none" onClick={() => navigate("/register")}>
              Create Free Account
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 rounded-xl bg-transparent border-background/20 text-background hover:bg-background/10 text-base font-bold" onClick={() => navigate("/billing")}>
              View Premium Plans
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
};
export default Home;
