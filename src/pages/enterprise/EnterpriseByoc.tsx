import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Cloud,
  HeartPulse,
  Landmark,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ByocFlowDiagram } from "@/components/byoc/ByocFlowDiagram";
import { ProviderChips } from "@/components/byoc/ProviderChips";
import { AnimatedChecks } from "@/components/byoc/AnimatedChecks";
import {
  BYOC_EASE,
  BYOC_FADE_UP,
  BYOC_STAGGER,
  BYOC_VIEWPORT,
  PROVIDER_CHIPS,
  type ProviderLogoId,
} from "@/components/byoc/motion";
import { ProviderLogo } from "@/components/byoc/ProviderLogo";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    n: "01",
    title: "Connect your bucket",
    body: "Enter AWS, Azure, R2, GCS, or MinIO credentials under Settings → Cloud storage. Keys are encrypted at rest — operators never see them.",
  },
  {
    n: "02",
    title: "Test + CORS check",
    body: "We probe reachability, write access, and browser CORS for your app origin. Save stays blocked until CORS is correct — first upload just works.",
  },
  {
    n: "03",
    title: "Save and go live",
    body: "A new immutable storage binding is created. New uploads, eSign PDFs, and job outputs land in your bucket under org-{id}/…",
  },
];

const USE_CASES = [
  {
    icon: Scale,
    title: "Legal & counsel",
    body: "Keep signed agreements in a firm-controlled bucket with your retention and eDiscovery policies.",
  },
  {
    icon: HeartPulse,
    title: "Healthcare",
    body: "Store clinical PDFs in a region and account you designate — metadata stays with us for workflow only.",
  },
  {
    icon: Landmark,
    title: "Financial services",
    body: "Least-privilege IAM on a dedicated bucket; rotate credentials by saving a new binding without orphaning history.",
  },
  {
    icon: Building2,
    title: "Public sector",
    body: "Meet data-residency rules by pointing storage at a bucket in your approved cloud region.",
  },
];

const PROVIDER_MATRIX: Array<{
  id: ProviderLogoId;
  name: string;
  endpoint: string;
  creds: string;
}> = [
  {
    id: "AWS",
    name: "Amazon S3",
    endpoint: "Empty (regional) or custom VPC endpoint",
    creds: "Access key ID + secret access key",
  },
  {
    id: "Azure",
    name: "Azure Blob",
    endpoint: "Built from account name (or BlobEndpoint in connection string)",
    creds: "Account key or full connection string",
  },
  {
    id: "R2",
    name: "Cloudflare R2",
    endpoint: "https://<accountid>.r2.cloudflarestorage.com",
    creds: "R2 API token (S3-compatible)",
  },
  {
    id: "GCS",
    name: "Google Cloud Storage",
    endpoint: "https://storage.googleapis.com",
    creds: "HMAC access key + secret (S3 interop)",
  },
  {
    id: "MinIO",
    name: "MinIO",
    endpoint: "Your https:// host (path-style)",
    creds: "Access key + secret",
  },
];

export default function EnterpriseByoc() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start end", "end start"],
  });
  const diagramY = useTransform(scrollYProgress, [0, 1], [14, -14]);

  const isEnterprise = user?.plan === "ENTERPRISE";
  const primaryPath = isEnterprise ? "/settings/cloud" : "/billing";
  const primaryLabel = isEnterprise ? "Connect your bucket" : "See Enterprise plans";
  const secondaryPath = isEnterprise ? "/workspace" : "/sign";
  const secondaryLabel = isEnterprise ? "Back to workspace" : "Try eSign first";

  return (
    <div className="flex w-full flex-col overflow-x-hidden bg-[#F7F9FC] text-slate-900">
      {/* Hero */}
      <section
        ref={heroRef}
        className="relative w-full overflow-hidden border-b border-slate-200/70 -mt-14 sm:-mt-16"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 18% 20%, rgba(14,165,233,0.12), transparent 55%), radial-gradient(ellipse 45% 40% at 40% 90%, rgba(37,99,235,0.07), transparent 50%), linear-gradient(165deg, #F7F9FC 0%, #EEF4FB 42%, #F7F9FC 100%)",
          }}
        />

        <div className="relative mx-auto grid max-w-[1600px] items-center gap-8 px-4 pb-14 pt-28 sm:gap-10 sm:px-6 sm:pb-16 sm:pt-32 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:pb-20 xl:gap-16">
          <motion.div
            className="relative z-10 w-full"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: BYOC_EASE }}
          >
            <p className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
              <Cloud className="h-3.5 w-3.5" />
              Enterprise · Your own cloud
            </p>
            <h1 className="font-heading mt-5 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl sm:leading-[1.1] lg:text-[2.75rem] xl:text-5xl">
              Your PDFs stay in your bucket. We never keep the bytes.
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-slate-500 sm:text-lg">
              Connect AWS, Azure, Cloudflare R2, GCS, or MinIO. Browser uploads go straight to your
              storage. Auth, jobs, and signing metadata stay on PDFToolkit.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="h-12 cursor-pointer rounded-full bg-blue-600 px-8 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
                onClick={() => navigate(primaryPath)}
              >
                {primaryLabel}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 cursor-pointer rounded-full border-slate-200 bg-white/80 px-8 text-sm font-semibold text-slate-700 hover:bg-white"
                onClick={() =>
                  document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                See how it works
              </Button>
            </div>
            <AnimatedChecks
              className="mt-9"
              variant="light"
              items={[
                "Presigned PUT — files never transit our disk",
                "CORS verified before Save",
                "Operators never see your raw credentials",
              ]}
            />
            <ProviderChips variant="light" className="mt-8" />
          </motion.div>

          <motion.div
            className="relative w-full"
            style={{ y: diagramY }}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75, delay: 0.12, ease: BYOC_EASE }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-sky-400/25 via-blue-500/10 to-transparent blur-2xl lg:-inset-6"
            />
            <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden  sm:rounded-[2rem] lg:aspect-auto lg:min-h-[32rem] xl:min-h-[36rem]">
              <img
                src="/image.png"
                alt="Your storage, secure processing, files stay in your cloud — AWS, Azure, Google Cloud"
                width={1600}
                height={1200}
                className="h-full w-full object-contain object-center p-3 sm:p-4 lg:p-5"
                decoding="async"
                fetchPriority="high"
              />
            </div>
          </motion.div>
        </div>

        <div className="relative border-t border-slate-200/60 bg-white/50 py-10 backdrop-blur-sm sm:py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <ByocFlowDiagram variant="light" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="w-full border-b border-slate-200/70 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
              How it works
            </p>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Live in three steps
            </h2>
            <p className="mt-3 text-base text-slate-500 sm:text-lg">
              Same flow as Settings → Cloud storage — Test, fix CORS if needed, Save.
            </p>
          </div>

          <motion.ol
            className="mt-12 grid gap-5 md:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={BYOC_VIEWPORT}
            variants={BYOC_STAGGER}
          >
            {STEPS.map((step) => (
              <motion.li
                key={step.n}
                variants={BYOC_FADE_UP}
                className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-[#F8FAFC] p-6 shadow-sm"
              >
                <span className="font-heading text-4xl font-bold text-sky-200">{step.n}</span>
                <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.body}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      {/* Use cases */}
      <section className="w-full border-b border-slate-200/70 bg-[#F7F9FC] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
              Built for trust
            </p>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Who this is for
            </h2>
          </div>

          <motion.div
            className="mt-12 grid gap-4 sm:grid-cols-2"
            initial="hidden"
            whileInView="visible"
            viewport={BYOC_VIEWPORT}
            variants={BYOC_STAGGER}
          >
            {USE_CASES.map((uc) => {
              const Icon = uc.icon;
              return (
                <motion.div
                  key={uc.title}
                  variants={BYOC_FADE_UP}
                  className="flex gap-4 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition-transform hover:-translate-y-0.5"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-slate-900">{uc.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{uc.body}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Provider matrix */}
      <section className="w-full border-b border-slate-200/70 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                Providers
              </p>
              <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                What you need to connect
              </h2>
              <p className="mt-3 text-base text-slate-500">
                Endpoint shape and credential type for each provider we support in production.
              </p>
            </div>
            <ProviderChips variant="light" />
          </div>

          <div className="mt-10 overflow-hidden rounded-3xl border border-slate-200/90 bg-[#F8FAFC] shadow-sm">
            <div className="hidden grid-cols-[1.1fr_1.4fr_1.3fr] gap-4 border-b border-slate-200/80 bg-white px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:grid">
              <span>Provider</span>
              <span>Endpoint</span>
              <span>Credentials</span>
            </div>
            {PROVIDER_MATRIX.map((row, i) => (
              <motion.div
                key={row.id}
                className={cn(
                  "grid gap-2 border-b border-slate-200/70 px-5 py-4 last:border-0 sm:grid-cols-[1.1fr_1.4fr_1.3fr] sm:gap-4 sm:items-center",
                  i % 2 === 1 && "bg-white/60"
                )}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={BYOC_VIEWPORT}
                transition={{ delay: i * 0.04, duration: 0.4, ease: BYOC_EASE }}
              >
                <p className="flex items-center gap-2.5 text-sm font-semibold text-slate-900">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                    <ProviderLogo id={row.id} />
                  </span>
                  {row.name}
                </p>
                <p className="font-mono text-xs leading-relaxed text-slate-600 sm:text-[13px]">
                  <span className="mb-0.5 block text-[10px] font-sans font-semibold uppercase tracking-wide text-slate-400 sm:hidden">
                    Endpoint
                  </span>
                  {row.endpoint}
                </p>
                <p className="text-sm text-slate-600">
                  <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">
                    Credentials
                  </span>
                  {row.creds}
                </p>
              </motion.div>
            ))}
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
            {PROVIDER_CHIPS.map((p) => (
              <li key={p.id} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {p.tip}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative w-full overflow-hidden border-t border-slate-200/70">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 0% 50%, rgba(14,165,233,0.22), transparent 55%), radial-gradient(ellipse 55% 70% at 100% 40%, rgba(37,99,235,0.18), transparent 50%), linear-gradient(165deg, #0B1220 0%, #0F172A 48%, #111827 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 70% 80% at 50% 50%, black, transparent)",
          }}
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={BYOC_VIEWPORT}
            transition={{ duration: 0.55, ease: BYOC_EASE }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300/90">
              Next step
            </p>
            <h2 className="font-heading mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl sm:leading-[1.12]">
              {isEnterprise
                ? "Point PDFToolkit at your bucket — then keep working."
                : "Your files. Your cloud. Same calm workspace."}
            </h2>
            <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-slate-300 sm:text-lg">
              {isEnterprise
                ? "Open Cloud storage, run the connection test, fix CORS if we ask, then Save. New uploads and signed PDFs write straight to you."
                : "Enterprise lets you connect AWS, Azure, R2, GCS, or MinIO so PDFs never sit in our object store — only keys and workflow metadata do."}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="h-12 cursor-pointer rounded-full bg-sky-400 px-7 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-400/25 hover:bg-sky-300"
                onClick={() => navigate(primaryPath)}
              >
                {primaryLabel}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 cursor-pointer rounded-full border-slate-500/80 bg-transparent px-7 text-sm font-semibold text-slate-100 hover:bg-white/5 hover:text-white"
                onClick={() => navigate(secondaryPath)}
              >
                {secondaryLabel}
              </Button>
            </div>

            <button
              type="button"
              onClick={() => navigate("/#byoc")}
              className="mt-6 inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-sky-300"
            >
              See it on the homepage
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </motion.div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={BYOC_VIEWPORT}
            transition={{ duration: 0.55, delay: 0.08, ease: BYOC_EASE }}
          >
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-sky-500/20 to-blue-600/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Bytes stay with you</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Browser → your bucket. We keep auth, jobs, and signing status only.
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/30">
                  <ShieldCheck className="h-5 w-5" />
                </span>
              </div>

              <div className="mt-6 grid grid-cols-5 gap-2">
                {PROVIDER_CHIPS.map((p, i) => (
                  <motion.div
                    key={p.id}
                    title={p.label}
                    className="flex flex-col items-center gap-1.5 rounded-xl bg-white/[0.06] px-1 py-2.5 ring-1 ring-white/10"
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={BYOC_VIEWPORT}
                    transition={{ delay: 0.12 + i * 0.05, duration: 0.35, ease: BYOC_EASE }}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95">
                      <ProviderLogo id={p.id} className="h-4 w-4" />
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400">{p.id}</span>
                  </motion.div>
                ))}
              </div>

              <ul className="mt-6 space-y-2.5 border-t border-white/10 pt-5">
                {[
                  "CORS checked before you can Save",
                  "Keys encrypted — operators never see them",
                  "Switch providers without orphaning files",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
