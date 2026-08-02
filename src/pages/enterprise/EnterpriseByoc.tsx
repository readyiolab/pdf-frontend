import { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  Sparkles,
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
    body: "Meet data-residency rules by pointing BYOC at a bucket in your approved cloud region.",
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
  const primaryLabel = isEnterprise ? "Open cloud storage" : "Talk to us / view plans";

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
              "radial-gradient(ellipse 80% 60% at 70% 0%, rgba(14,165,233,0.14), transparent 55%), radial-gradient(ellipse 50% 40% at 10% 80%, rgba(37,99,235,0.08), transparent 50%), linear-gradient(180deg, #F7F9FC 0%, #EEF4FB 45%, #F7F9FC 100%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:px-8">
          <motion.div
            className="mx-auto max-w-3xl text-center"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: BYOC_EASE }}
          >
            <p className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
              <Cloud className="h-3.5 w-3.5" />
              Enterprise · Bring Your Own Cloud
            </p>
            <h1 className="font-heading mt-5 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.08]">
              Your PDFs stay in your bucket. We never keep the bytes.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-slate-500 sm:text-lg">
              Connect AWS, Azure, Cloudflare R2, GCS, or MinIO. Browser uploads go straight to your
              storage. Auth, jobs, and signing metadata stay on PDFToolkit.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
              className="mx-auto mt-10 max-w-md text-left"
              variant="light"
              items={[
                "Presigned PUT — files never transit our disk",
                "CORS verified before Save",
                "Operators never see your raw credentials",
              ]}
            />
          </motion.div>

          <motion.div className="relative mx-auto mt-12 max-w-4xl" style={{ y: diagramY }}>
            <ByocFlowDiagram variant="light" />
            <ProviderChips variant="light" className="mt-4 justify-center" />
          </motion.div>
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
              Where BYOC earns its keep
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
                Sourced from our production BYOC requirements — endpoint shape and credential type
                per provider.
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
      <section className="w-full py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-900 px-6 py-12 text-center shadow-2xl shadow-slate-900/20 sm:px-12 sm:py-14">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(14,165,233,0.25), transparent 60%)",
              }}
            />
            <ShieldCheck className="relative mx-auto h-10 w-10 text-sky-400" />
            <h2 className="font-heading relative mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Ready to keep documents in your cloud?
            </h2>
            <p className="relative mx-auto mt-3 max-w-md text-sm text-slate-300 sm:text-base">
              {isEnterprise
                ? "Open Cloud storage, run Test Connection, apply CORS if prompted, and Save."
                : "Enterprise unlocks BYOC. View plans or ask us to provision your organization."}
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-12 cursor-pointer rounded-full bg-sky-500 px-8 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/25 hover:bg-sky-400"
                onClick={() => navigate(primaryPath)}
              >
                {primaryLabel}
                <Sparkles className="ml-1.5 h-4 w-4" />
              </Button>
              <Link
                to="/#byoc"
                className="text-sm font-semibold text-sky-300 hover:text-sky-200"
              >
                Back to homepage BYOC
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
