import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, CheckCircle2, FileText } from "lucide-react";
import { Button } from "../ui/button";

export const Footer: React.FC = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <footer className="w-full bg-card/60 backdrop-blur-md text-foreground transition-colors border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-8 mb-12 text-left">

          {/* Brand Info & Newsletter */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-foreground leading-none">
                  PDF<span className="text-foreground">Toolkit</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mt-1">
                  Enterprise PDF OS
                </span>
              </div>
            </Link>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm font-medium">
              The next-generation document platform powered by AI. Merge, compress, convert, edit, eSign, and extract intelligence from any document securely.
            </p>

            {/* Newsletter Subscription Card */}
            <div className="mt-2 rounded-2xl border border-border bg-background/80 p-4 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-1.5 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-foreground" /> Stay Updated
              </h4>
              <p className="text-xs text-muted-foreground mb-3 font-medium">
                Get monthly updates on new AI models, security compliance, and feature releases.
              </p>
              {subscribed ? (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 animate-scale-in">
                  <CheckCircle2 className="h-4 w-4" /> Thank you for subscribing!
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex items-center gap-2">
                  <input
                    type="email"
                    required
                    placeholder="Enter work email..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all"
                  />
                  <Button type="submit" size="sm" className="rounded-xl px-3.5 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 shrink-0">
                    Join <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Column 1: PDF Tools */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">PDF Core Tools</h4>
            <ul className="space-y-2 text-xs text-muted-foreground font-medium">
              <li><Link to="/workspace/merge" className="hover:text-foreground transition-colors">Merge PDF</Link></li>
              <li><Link to="/workspace/split" className="hover:text-foreground transition-colors">Split PDF</Link></li>
              <li><Link to="/workspace/compress" className="hover:text-foreground transition-colors">Compress PDF</Link></li>
              <li><Link to="/workspace/pdf-to-jpg" className="hover:text-foreground transition-colors">PDF to JPG</Link></li>
              <li><Link to="/workspace/jpg-to-pdf" className="hover:text-foreground transition-colors">JPG to PDF</Link></li>
              <li><Link to="/workspace/protect" className="hover:text-foreground transition-colors">Protect PDF</Link></li>
              <li><Link to="/esign" className="hover:text-foreground transition-colors flex items-center gap-1">eSign Documents</Link></li>
            </ul>
          </div>

          {/* Column 2: AI Intelligence */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
              AI Features
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground font-medium">
              <li><Link to="/ai/summarize" className="hover:text-foreground transition-colors">AI Document Summarizer</Link></li>
              <li><Link to="/ai/chat" className="hover:text-foreground transition-colors">Interactive PDF Chat</Link></li>
              <li><Link to="/ai/explain" className="hover:text-foreground transition-colors">AI Explain Complex PDF</Link></li>
              <li><Link to="/workspace" className="hover:text-foreground transition-colors">Multilingual AI Translator</Link></li>
              <li><Link to="/workspace" className="hover:text-foreground transition-colors">Smart OCR Engine</Link></li>
              <li><Link to="/workspace" className="hover:text-foreground transition-colors">Table & Data Extraction</Link></li>
            </ul>
          </div>

          {/* Column 3: Platform & Enterprise */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Platform</h4>
            <ul className="space-y-2 text-xs text-muted-foreground font-medium">
              <li><Link to="/workspace" className="hover:text-foreground transition-colors">Workspace Dashboard</Link></li>
              <li><Link to="/billing" className="hover:text-foreground transition-colors">Plans & Pricing</Link></li>
              <li><Link to="/enterprise" className="hover:text-foreground transition-colors">Enterprise Solution</Link></li>
              <li><Link to="/desktop" className="hover:text-foreground transition-colors">Desktop app</Link></li>
              <li><Link to="/security" className="hover:text-foreground transition-colors">Security & Trust</Link></li>
              <li><Link to="/developer" className="hover:text-foreground transition-colors flex items-center gap-1">Developer API <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-muted text-foreground font-bold">v2.0</span></Link></li>
              <li><Link to="/history" className="hover:text-foreground transition-colors">Activity History</Link></li>
            </ul>
          </div>

          {/* Column 4: Resources & Legal */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Company & Legal</h4>
            <ul className="space-y-2 text-xs text-muted-foreground font-medium">
              <li><Link to="/blog" className="hover:text-foreground transition-colors">Engineering Blog</Link></li>
              <li><Link to="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link to="/gdpr" className="hover:text-foreground transition-colors">GDPR & Compliance</Link></li>
              <li><Link to="/docs" className="hover:text-foreground transition-colors">Support & Documentation</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} PDF Toolkit Inc. All rights reserved. Enterprise document architecture.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <ShieldCheck className="size-3.5" /> 256-Bit Encrypted
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};
