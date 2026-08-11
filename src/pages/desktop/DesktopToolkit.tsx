import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Check,
  Download,
  HardDrive,
  KeyRound,
  Lock,
  Monitor,
  ShieldCheck,
  WifiOff,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DESKTOP_EASE,
  DESKTOP_FADE_UP,
  DESKTOP_STAGGER,
  DESKTOP_VIEWPORT,
  DOWNLOAD_MAILTO,
  LICENSE_MAILTO,
  SALES_MAILTO,
} from "@/components/desktop/motion";

const HERO_CHECKS = [
  "PDF tools + Diagram Studio",
  "Files stay on your PC",
  "Works offline after activation",
  "Windows desktop apps",
] as const;

const WHY = [
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Files stay on your PC. Nothing is uploaded to random cloud editors.",
  },
  {
    icon: Zap,
    title: "Built for speed",
    body: "Native desktop processing — no waiting on uploads or browser tabs.",
  },
  {
    icon: WifiOff,
    title: "Works offline",
    body: "After activation, use your tools without an internet connection.",
  },
  {
    icon: HardDrive,
    title: "Your machine, your storage",
    body: "Outputs land where you choose. No third-party file retention.",
  },
] as const;

const FEATURE_GROUPS = [
  {
    title: "Organize",
    items: [
      "Merge",
      "Split",
      "Organize pages (multi-PDF)",
      "Rotate",
      "Compare",
    ],
  },
  {
    title: "Edit & Protect",
    items: [
      "Watermark",
      "Stamp",
      "Bates numbers",
      "Quicksign",
      "Compress",
      "Encrypt",
      "Decrypt",
      "Protect",
      "Redact",
    ],
  },
  {
    title: "Convert",
    items: [
      "PDF ↔ Images",
      "Images → PDF",
      "Office → PDF",
      "PDF → Word",
      "Web → PDF",
      "OCR",
      "Batch create",
      "Extract text",
    ],
  },
  {
    title: "Diagram Studio",
    items: [
      "Draw.io-style canvas",
      "Shape libraries & connectors",
      "Multi-page diagrams",
      "Export PNG / SVG / PDF",
      "Offline after license",
    ],
  },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Download",
    body: "Get the Windows installer from our team. We’ll send the link to your inbox.",
  },
  {
    n: "02",
    title: "Install",
    body: "Run the setup once. PDF Toolkit and Diagram Studio live on your desktop — no browser required.",
  },
  {
    n: "03",
    title: "Enter license key",
    body: "Activate with your key. One seat or a team pack — same calm flow.",
  },
  {
    n: "04",
    title: "Use your tools",
    body: "Merge, protect, convert, and diagram — all offline after activation.",
  },
] as const;

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function DesktopToolkit() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start end", "end start"],
  });
  const mockY = useTransform(scrollYProgress, [0, 1], [14, -14]);

  return (
    <div className="flex w-full flex-col overflow-x-hidden bg-[#F7F9FC] text-slate-900">
      {/* Hero */}
      <section
        ref={heroRef}
        className="relative w-full min-h-[min(100svh,920px)] overflow-hidden border-b border-slate-200/70 -mt-14 sm:-mt-16"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 82% 10%, rgba(37,99,235,0.18), transparent 52%), radial-gradient(ellipse 55% 45% at 8% 88%, rgba(14,165,233,0.12), transparent 50%), radial-gradient(ellipse 40% 30% at 42% 48%, rgba(255,255,255,0.85), transparent 70%), linear-gradient(165deg, #F7F9FC 0%, #E8EEF8 42%, #F7F9FC 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(100,116,139,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.2) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 40%, black, transparent)",
          }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-28 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl"
          animate={{ y: [0, 18, 0], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-16 bottom-20 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl"
          animate={{ y: [0, -22, 0], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        />

        <div className="relative mx-auto grid min-h-[min(100svh,920px)] max-w-6xl items-center gap-6 px-4 pb-14 pt-28 sm:gap-8 sm:px-6 sm:pb-16 sm:pt-32 lg:grid-cols-2 lg:gap-8 lg:px-8">
          <motion.div
            className="relative z-10 w-full"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: DESKTOP_EASE }}
          >
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm ring-1 ring-blue-200/80 backdrop-blur-sm">
              <Monitor className="h-3.5 w-3.5" />
              Desktop · by Zuvigo
            </p>

            <h1 className="font-heading mt-6 text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.05] lg:text-[3.25rem] xl:text-[3.5rem]">
              PDF<span className="text-blue-600">Toolkit</span>
              <span className="block text-2xl font-semibold tracking-tight text-slate-600 sm:text-3xl lg:text-[1.75rem]">
                + Diagram Studio Desktop
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-balance text-xl font-medium tracking-tight text-slate-700 sm:text-2xl sm:leading-snug">
              PDF tools and diagrams — offline on Windows
            </p>

            <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-slate-500 sm:text-lg">
              Fast, private, and offline-ready. Install on Windows, activate with a license key,
              and keep every file and diagram on your machine.
            </p>

            <motion.div
              className="mt-8 flex flex-wrap items-center gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18, ease: DESKTOP_EASE }}
            >
              <Button
                asChild
                size="lg"
                className="h-12 cursor-pointer rounded-full bg-blue-600 px-8 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-transform hover:scale-[1.02] hover:bg-blue-700"
              >
                <a href={DOWNLOAD_MAILTO}>
                  <Download className="mr-1.5 h-4 w-4" />
                  Download for Windows
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 cursor-pointer rounded-full border-slate-200/90 bg-white/80 px-8 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm hover:bg-white"
                onClick={() => scrollToId("features")}
              >
                See features
              </Button>
            </motion.div>

            <motion.div
              className="mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.32, ease: DESKTOP_EASE }}
            >
              <a
                href={SALES_MAILTO}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-blue-700"
              >
                Contact sales for team licenses
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </motion.div>

            <ul className="mt-9 space-y-3">
              {HERO_CHECKS.map((item, i) => (
                <motion.li
                  key={item}
                  className="flex items-center gap-3 text-sm font-medium text-slate-700"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.28 + i * 0.07, duration: 0.4, ease: DESKTOP_EASE }}
                >
                  <span className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-white shadow-sm shadow-blue-600/25">
                    <motion.span
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        delay: 0.38 + i * 0.07,
                        type: "spring",
                        stiffness: 380,
                        damping: 22,
                      }}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={2.75} />
                    </motion.span>
                  </span>
                  {item}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            className="relative w-full"
            style={{ y: mockY }}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.85, delay: 0.14, ease: DESKTOP_EASE }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-blue-400/30 via-sky-500/15 to-transparent blur-2xl lg:-inset-6"
            />
            <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden sm:rounded-[1.5rem] lg:aspect-auto lg:min-h-[28rem] xl:min-h-[30rem]">
              <img
                src="/desktop.png"
                alt="PDF Toolkit desktop app on Windows — organize, protect, and convert PDFs locally"
                width={1600}
                height={1200}
                className="h-full w-full object-contain object-center drop-shadow-[0_28px_60px_rgba(15,23,42,0.28)]"
                decoding="async"
                fetchPriority="high"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why desktop */}
      <section className="w-full border-b border-slate-200/70 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
              Why desktop
            </p>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Privacy and speed without the browser
            </h2>
            <p className="mt-3 text-base text-slate-500 sm:text-lg">
              A licensed Windows app for teams that want control — not another upload portal.
            </p>
          </div>

          <motion.div
            className="mt-12 grid gap-5 sm:grid-cols-2"
            initial="hidden"
            whileInView="visible"
            viewport={DESKTOP_VIEWPORT}
            variants={DESKTOP_STAGGER}
          >
            {WHY.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  variants={DESKTOP_FADE_UP}
                  className="flex gap-4 rounded-3xl border border-slate-200/90 bg-[#F8FAFC] p-6"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{item.body}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="w-full scroll-mt-20 border-b border-slate-200/70 bg-[#F7F9FC] py-20 sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
              Features
            </p>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Every tool in one place
            </h2>
            <p className="mt-3 text-base text-slate-500 sm:text-lg">
              Organize, edit, protect, convert, and diagram — without leaving your desktop.
            </p>
          </div>

          <motion.div
            className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            whileInView="visible"
            viewport={DESKTOP_VIEWPORT}
            variants={DESKTOP_STAGGER}
          >
            {FEATURE_GROUPS.map((group) => (
              <motion.div key={group.title} variants={DESKTOP_FADE_UP}>
                <h3 className="font-heading text-lg font-semibold tracking-tight text-slate-900">
                  {group.title}
                </h3>
                <ul className="mt-4 space-y-2.5 border-t border-slate-200/80 pt-4">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2.5 text-sm text-slate-600"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
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
              Live in four steps
            </h2>
            <p className="mt-3 text-base text-slate-500 sm:text-lg">
              Download, install, activate — then open any PDF tool you need.
            </p>
          </div>

          <motion.ol
            className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            whileInView="visible"
            viewport={DESKTOP_VIEWPORT}
            variants={DESKTOP_STAGGER}
          >
            {STEPS.map((step) => (
              <motion.li
                key={step.n}
                variants={DESKTOP_FADE_UP}
                className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-[#F8FAFC] p-6"
              >
                <span className="font-heading text-4xl font-bold text-blue-200">{step.n}</span>
                <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.body}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      {/* For teams */}
      <section className="w-full border-b border-slate-200/70 bg-[#F7F9FC] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={DESKTOP_VIEWPORT}
              transition={{ duration: 0.55, ease: DESKTOP_EASE }}
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                For teams
              </p>
              <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Organization licenses that scale with seats
              </h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-500 sm:text-lg">
                Multi-seat packs for departments that need the same toolkit on every workstation —
                without fake price tables.
              </p>
              <ul className="mt-7 space-y-3">
                {[
                  "Shared organization key or bulk individual keys",
                  "Admin-managed seats for your team",
                  "Same offline desktop experience per machine",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    {line}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="lg"
                className="mt-9 h-12 cursor-pointer rounded-full bg-blue-600 px-7 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
              >
                <a href={SALES_MAILTO}>
                  Contact sales
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </a>
              </Button>
              <p className="mt-4 text-sm text-slate-500">
                Prefer the cloud?{" "}
                <Link to="/billing" className="font-semibold text-blue-600 hover:text-blue-700">
                  See online plans
                </Link>{" "}
                — Free, Pro $12/mo, Enterprise.
              </p>
            </motion.div>

            <motion.div
              className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white p-7 shadow-sm sm:p-8"
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={DESKTOP_VIEWPORT}
              transition={{ duration: 0.55, delay: 0.08, ease: DESKTOP_EASE }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Team rollout</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    One conversation with support — we set up seats and keys for your org.
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                  <Building2 className="h-5 w-5" />
                </span>
              </div>
              <ul className="mt-6 space-y-3 border-t border-slate-100 pt-5">
                {[
                  { icon: Lock, label: "License activation on each Windows PC" },
                  { icon: Monitor, label: "Identical toolset across seats" },
                  { icon: ShieldCheck, label: "Files never leave your network by default" },
                ].map((row) => {
                  const Icon = row.icon;
                  return (
                    <li key={row.label} className="flex items-center gap-3 text-sm text-slate-600">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-700 ring-1 ring-slate-200/80">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      {row.label}
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative w-full overflow-hidden border-t border-slate-200/70">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 0% 50%, rgba(37,99,235,0.26), transparent 55%), radial-gradient(ellipse 55% 70% at 100% 40%, rgba(14,165,233,0.2), transparent 50%), linear-gradient(165deg, #0B1220 0%, #0F172A 48%, #111827 100%)",
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
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/3 top-0 h-px w-1/3 bg-gradient-to-r from-transparent via-sky-400/50 to-transparent"
          initial={{ opacity: 0, scaleX: 0.4 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={DESKTOP_VIEWPORT}
          transition={{ duration: 0.8, ease: DESKTOP_EASE }}
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 text-white sm:px-6 sm:py-28 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={DESKTOP_VIEWPORT}
            transition={{ duration: 0.55, ease: DESKTOP_EASE }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300/90">
              Get started
            </p>
            <h2 className="font-heading mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl sm:leading-[1.12]">
              Ready for PDF &amp; Diagrams on Windows?
            </h2>
            <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-slate-300 sm:text-lg">
              Request the installer or a license key. We reply from{" "}
              <a
                href="mailto:support@zuvigo.com"
                className="font-semibold text-sky-300 underline-offset-2 hover:underline"
              >
                support@zuvigo.com
              </a>
              — usually the same day. For cloud SaaS pricing,{" "}
              <Link to="/billing" className="font-semibold text-sky-300 underline-offset-2 hover:underline">
                see online plans
              </Link>
              .
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="h-12 cursor-pointer rounded-full bg-sky-400 px-7 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-400/25 transition-transform hover:scale-[1.02] hover:bg-sky-300"
              >
                <a href={DOWNLOAD_MAILTO}>
                  <Download className="mr-1.5 h-4 w-4" />
                  Download for Windows
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 cursor-pointer rounded-full border-slate-500/80 bg-transparent px-7 text-sm font-semibold text-slate-100 hover:bg-white/5 hover:text-white"
              >
                <a href={LICENSE_MAILTO}>Get a license</a>
              </Button>
            </div>

            <Link
              to="/#desktop"
              className="mt-7 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-sky-300"
            >
              See it on the homepage
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={DESKTOP_VIEWPORT}
            transition={{ duration: 0.55, delay: 0.08, ease: DESKTOP_EASE }}
          >
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-sky-500/20 to-blue-600/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Your next three emails</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Installer link, license key, and activation help — from support.
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/30">
                  <Monitor className="h-5 w-5" />
                </span>
              </div>

              <ol className="mt-6 space-y-3">
                {[
                  { n: "1", title: "Email us", body: "Download or license request" },
                  { n: "2", title: "Install on Windows", body: "Run setup once on your PC" },
                  { n: "3", title: "Activate & go", body: "Enter your key — tools unlock" },
                ].map((step, i) => (
                  <motion.li
                    key={step.n}
                    className="flex items-start gap-3 rounded-xl bg-white/[0.05] px-3.5 py-3 ring-1 ring-white/10"
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={DESKTOP_VIEWPORT}
                    transition={{ delay: 0.12 + i * 0.06, duration: 0.35, ease: DESKTOP_EASE }}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-xs font-bold text-sky-300 ring-1 ring-sky-400/25">
                      {step.n}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{step.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{step.body}</p>
                    </div>
                  </motion.li>
                ))}
              </ol>

              <div className="mt-5 flex items-center gap-2.5 border-t border-white/10 pt-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </span>
                <p className="text-xs leading-relaxed text-slate-400">
                  Private by design — processing stays on your machine after activation.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
