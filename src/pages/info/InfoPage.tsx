import { ShieldCheck, Code, BookOpen, Lock, FileText, CheckCircle2, ArrowRight, Building2, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface InfoPageProps {
  type:
    | "enterprise"
    | "security"
    | "developer"
    | "blog"
    | "about"
    | "privacy"
    | "terms"
    | "gdpr"
    | "docs";
}

const PAGE_DATA = {
  enterprise: {
    badge: "Enterprise Platform",
    title: "Enterprise Document SaaS & AI Integration",
    subtitle:
      "Empower your enterprise workforce with bank-grade encryption, custom SSO, and dedicated cloud workers.",
    icon: Building2,
    sections: [
      {
        heading: "Custom Dedicated Infrastructure",
        content:
          "Run isolated PDF worker nodes deployed in your preferred geographic location with guaranteed SLAs and zero queue times.",
      },
      {
        heading: "SSO & Identity Governance",
        content:
          "SAML 2.0, Okta, Azure AD, and Google Workspace integrations with granular role-based permissions.",
      },
      {
        heading: "Custom SLA & 24/7 Dedicated Support",
        content:
          "Dedicated account management, custom contract terms, and guaranteed 99.99% uptime availability.",
      },
    ],
  },
  security: {
    badge: "Security & Trust",
    title: "Bank-Grade Encryption & Data Protection",
    subtitle:
      "Your documents are protected with AES-256 bit encryption at rest and TLS 1.3 in transit.",
    icon: ShieldCheck,
    sections: [
      {
        heading: "SOC2 Type II & ISO 27001 Certified",
        content:
          "Our platform undergoes rigorous annual third-party audits to verify absolute security compliance.",
      },
      {
        heading: "Automated File purging",
        content:
          "Stateless document operations are automatically deleted from memory and cloud buffers within 60 minutes.",
      },
      {
        heading: "Legally Binding eSign Audit Trails",
        content:
          "Cryptographically signed audit certificates documenting IP addresses, timestamps, and identity hashes for every signature.",
      },
    ],
  },
  developer: {
    badge: "Developer API",
    title: "REST & Webhook Developer APIs",
    subtitle:
      "Integrate PDF compression, eSign, OCR, and AI summaries into your apps with 5 lines of code.",
    icon: Code,
    sections: [
      {
        heading: "High Throughput Conversion Endpoints",
        content:
          "Process thousands of documents programmatically with low latency and predictable rate limits.",
      },
      {
        heading: "Real-time Webhook Callbacks",
        content:
          "Receive instant HTTP notifications when recipient signatures complete or AI jobs complete.",
      },
      {
        heading: "SDKs for TypeScript, Python & Go",
        content:
          "Official client libraries with full type safety and async promise handling.",
      },
    ],
  },
  blog: {
    badge: "Engineering Blog",
    title: "Latest Insights & Engineering Tech",
    subtitle:
      "Deep dives into PDF rendering engines, web assembly OCR, and generative document AI.",
    icon: BookOpen,
    sections: [
      {
        heading: "Building Sub-second In-Browser PDF Compression",
        content:
          "How we leveraged WebAssembly and native C++ PDF utilities to compress heavy files right in the browser.",
      },
      {
        heading: "The Future of Legal Contracts with Generative AI",
        content:
          "Exploring how LLM fine-tuning speeds up contract reviews and clause extraction by 85%.",
      },
    ],
  },
  about: {
    badge: "About Us",
    title: "Modernizing Document Intelligence",
    subtitle:
      "We build fast, privacy-first tools designed to streamline modern business workflows.",
    icon: FileText,
    sections: [
      {
        heading: "Our Mission",
        content:
          "To eliminate bloated desktop software and replace legacy PDF converters with an ultra-fast, intelligent enterprise web platform.",
      },
      {
        heading: "Global Operations",
        content:
          "Serving over 50,000 teams and individual professionals across 120+ countries.",
      },
    ],
  },
  privacy: {
    badge: "Privacy Policy",
    title: "Your Privacy is Our Core Priority",
    subtitle:
      "We do not sell your personal data or train public AI models on your private documents.",
    icon: Lock,
    sections: [
      {
        heading: "Data Retention",
        content:
          "Uploaded files for stateless jobs are permanently deleted after processing or 60 minutes, whichever comes first.",
      },
      {
        heading: "No AI Model Training",
        content:
          "Document contents submitted to AI assistants are processed in isolated memory and never used for foundation model training.",
      },
    ],
  },
  terms: {
    badge: "Terms of Service",
    title: "Terms & Conditions of Service",
    subtitle:
      "Clear, transparent guidelines governing the use of our PDF platform and API services.",
    icon: FileText,
    sections: [
      {
        heading: "Acceptable Use",
        content:
          "Users agree not to upload malicious software, illicit content, or violate intellectual property rights.",
      },
      {
        heading: "Account Security",
        content:
          "You are responsible for maintaining the confidentiality of your account credentials and access keys.",
      },
    ],
  },
  gdpr: {
    badge: "GDPR & Compliance",
    title: "EU General Data Protection Regulation",
    subtitle:
      "Full compliance with European data sovereignty and user privacy directives.",
    icon: CheckCircle2,
    sections: [
      {
        heading: "Data Subject Rights",
        content:
          "Users can request full export or permanent deletion of their account data at any time.",
      },
      {
        heading: "EU Server Hosting",
        content:
          "European enterprise accounts can opt for dedicated EU-only data hosting and processing regions.",
      },
    ],
  },
  docs: {
    badge: "Documentation",
    title: "Documentation & User Guides",
    subtitle:
      "Step-by-step guides for PDF tools, eSign workflows, and API integrations.",
    icon: HelpCircle,
    sections: [
      {
        heading: "Getting Started with E-Sign",
        content:
          "Learn how to create documents, assign field tags, and invite recipients for digital signature.",
      },
      {
        heading: "AI PDF Chat & Executive Summaries",
        content:
          "How to query complex documents with custom prompts and strict source citations.",
      },
    ],
  },
};

export default function InfoPage({ type }: InfoPageProps) {
  const data = PAGE_DATA[type] ?? PAGE_DATA.about;
  const Icon = data.icon;

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto animate-fade-in text-left">
      {/* Page Header */}
      <div className="mb-10 pb-8 border-b border-border">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-foreground text-xs font-semibold mb-4 border border-border">
          <Icon className="size-3.5 text-foreground" />
          <span>{data.badge}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
          {data.title}
        </h1>
        <p className="text-base text-muted-foreground mt-3 max-w-2xl font-normal">
          {data.subtitle}
        </p>
      </div>

      {/* Main Content Sections */}
      <div className="space-y-8">
        {data.sections.map((sec, idx) => (
          <div
            key={idx}
            className="p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-sm shadow-xs"
          >
            <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
              <span className="size-2 rounded-full bg-foreground inline-block" />
              {sec.heading}
            </h3>
            <p className="text-sm text-muted-foreground font-normal leading-relaxed">
              {sec.content}
            </p>
          </div>
        ))}
      </div>

      {/* CTA Box */}
      <div className="mt-12 p-8 rounded-3xl border border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div>
          <h4 className="text-lg font-semibold text-foreground">
            Ready to get started?
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            Access 15+ PDF and AI document tools in one workspace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/workspace">
            <Button className="rounded-xl px-5 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-md">
              Open Workspace <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
