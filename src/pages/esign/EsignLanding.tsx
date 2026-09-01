import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Check,
  FileCheck2,
  FileSignature,
  Hash,
  Link2,
  Lock,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth/AuthModal";
import {
  ESIGN_EASE,
  ESIGN_FADE_UP,
  ESIGN_STAGGER,
  ESIGN_VIEWPORT,
} from "@/components/esign/motion";

const HERO_CHECKS = [
  "Multi-recipient signing with order control",
  "SHA-256 seal on every completed PDF",
  "Recipients sign via private link — no account needed",
] as const;

const WHY = [
  {
    icon: ShieldCheck,
    title: "Full audit trail",
    body: "Opens, declines, and signatures are logged with timestamps you can export.",
  },
  {
    icon: Users,
    title: "Sequential or parallel",
    body: "Send in a fixed order, or let everyone sign at once — your call.",
  },
  {
    icon: Link2,
    title: "Private signer links",
    body: "Each recipient gets a secure link. They do not need a PDFToolkit account.",
  },
  {
    icon: Hash,
    title: "Cryptographic seal",
    body: "Finished PDFs are sealed with a SHA-256 hash you can verify later.",
  },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Invite signers",
    body: "Upload a PDF or Word document (.docx), place fields, add recipients, and set signing order.",
  },
  {
    n: "02",
    title: "Collect signatures",
    body: "Each person signs in turn (or in parallel). Opens and completions are recorded.",
  },
  {
    n: "03",
    title: "Seal & archive",
    body: "The finished PDF gets a SHA-256 seal plus an audit trail you can download.",
  },
] as const;

const CASES = [
  {
    icon: UserRound,
    title: "Just me",
    body: "Self-sign — add your signature and you are done.",
  },
  {
    icon: UserRound,
    title: "One other person",
    body: "We email them a private link to review and sign.",
  },
  {
    icon: Users,
    title: "Several people, in order",
    body: "Each person gets the email only after the one before them finishes.",
  },
  {
    icon: Users,
    title: "Several people, any order",
    body: "Everyone gets the link at once and can sign whenever they like.",
  },
] as const;

const TRUST = [
  {
    icon: Lock,
    title: "Encrypted in flight",
    body: "Documents stay in private encrypted storage while signing is underway.",
  },
  {
    icon: Link2,
    title: "Short-lived access",
    body: "Signer links are private and time-bound — not a public share page.",
  },
  {
    icon: FileCheck2,
    title: "Completion record",
    body: "Download the sealed PDF and certificate of completion when the flow ends.",
  },
] as const;

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function EsignLanding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start end", "end start"],
  });
  const mockY = useTransform(scrollYProgress, [0, 1], [14, -14]);

  const startEsign = () => {
    if (user) {
      navigate("/sign");
      return;
    }
    setAuthOpen(true);
  };

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
              "radial-gradient(ellipse 90% 70% at 82% 10%, rgba(37,99,235,0.16), transparent 52%), radial-gradient(ellipse 55% 45% at 8% 88%, rgba(14,165,233,0.1), transparent 50%), radial-gradient(ellipse 40% 30% at 42% 48%, rgba(255,255,255,0.85), transparent 70%), linear-gradient(165deg, #F7F9FC 0%, #E8EEF8 42%, #F7F9FC 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(100,116,139,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.18) 1px, transparent 1px)",
            backgroundSize: "68px 68px",
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
            transition={{ duration: 0.7, ease: ESIGN_EASE }}
          >
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm ring-1 ring-blue-200/80 backdrop-blur-sm">
              <FileSignature className="h-3.5 w-3.5" />
              eSign · PDFToolkit
            </p>

            <h1 className="font-heading mt-6 text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.05] lg:text-[3.25rem]">
              Send, sign, and verify
            </h1>

            <p className="mt-4 max-w-xl text-balance text-xl font-medium tracking-tight text-slate-700 sm:text-2xl sm:leading-snug">
              Legally binding signatures with a full audit trail
            </p>

            <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-slate-500 sm:text-lg">
              Collect signatures without leaving PDFToolkit. Recipients sign in order, every open
              and signature is logged, and the finished PDF is sealed with a SHA-256 hash.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="h-12 cursor-pointer rounded-full bg-blue-600 px-8 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-transform hover:scale-[1.02] hover:bg-blue-700"
                onClick={startEsign}
              >
                Start eSign
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 cursor-pointer rounded-full border-slate-200/90 bg-white/80 px-8 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm hover:bg-white"
                onClick={() => scrollToId("how-it-works")}
              >
                See how it works
              </Button>
            </div>

            <ul className="mt-9 space-y-3">
              {HERO_CHECKS.map((item, i) => (
                <motion.li
                  key={item}
                  className="flex items-center gap-3 text-sm font-medium text-slate-700"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.28 + i * 0.07, duration: 0.4, ease: ESIGN_EASE }}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-600/25">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.75} />
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
            transition={{ duration: 0.85, delay: 0.14, ease: ESIGN_EASE }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-blue-400/30 via-sky-500/15 to-transparent blur-2xl lg:-inset-6"
            />
            <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden sm:rounded-[1.5rem] lg:aspect-auto lg:min-h-[28rem] xl:min-h-[30rem]">
              <img
                src="/esign.png"
                alt="eSign with PDFToolkit — send, collect signatures, and seal documents with an audit trail"
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

      {/* Why eSign */}
      <section className="w-full border-b border-slate-200/70 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
              Why eSign
            </p>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Signing that stays clear and verifiable
            </h2>
            <p className="mt-3 text-base text-slate-500 sm:text-lg">
              Built for agreements that need order, proof, and a calm recipient experience.
            </p>
          </div>

          <motion.div
            className="mt-12 grid gap-5 sm:grid-cols-2"
            initial="hidden"
            whileInView="visible"
            viewport={ESIGN_VIEWPORT}
            variants={ESIGN_STAGGER}
          >
            {WHY.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  variants={ESIGN_FADE_UP}
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

      {/* How it works */}
      <section
        id="how-it-works"
        className="w-full scroll-mt-20 border-b border-slate-200/70 bg-[#F7F9FC] py-20 sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
              How it works
            </p>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Live in three steps
            </h2>
            <p className="mt-3 text-base text-slate-500 sm:text-lg">
              Same flow as your workspace — upload, place fields, send, and seal.
            </p>
          </div>

          <motion.ol
            className="mt-12 grid gap-5 md:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={ESIGN_VIEWPORT}
            variants={ESIGN_STAGGER}
          >
            {STEPS.map((step) => (
              <motion.li
                key={step.n}
                variants={ESIGN_FADE_UP}
                className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm"
              >
                <span className="font-heading text-4xl font-bold text-blue-200">{step.n}</span>
                <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.body}</p>
              </motion.li>
            ))}
          </motion.ol>

          <div className="mt-16 max-w-2xl">
            <h3 className="font-heading text-2xl font-bold tracking-tight text-slate-900">
              Signing situations we support
            </h3>
            <p className="mt-2 text-base text-slate-500">
              Self-sign, one recipient, or a team — sequential or parallel.
            </p>
          </div>

          <motion.div
            className="mt-8 grid gap-4 sm:grid-cols-2"
            initial="hidden"
            whileInView="visible"
            viewport={ESIGN_VIEWPORT}
            variants={ESIGN_STAGGER}
          >
            {CASES.map((c) => {
              const Icon = c.icon;
              return (
                <motion.div
                  key={c.title}
                  variants={ESIGN_FADE_UP}
                  className="flex gap-4 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{c.title}</h4>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">{c.body}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Trust */}
      <section className="w-full border-b border-slate-200/70 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
              Trust
            </p>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Security built into the flow
            </h2>
          </div>

          <motion.div
            className="mt-12 grid gap-5 md:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={ESIGN_VIEWPORT}
            variants={ESIGN_STAGGER}
          >
            {TRUST.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  variants={ESIGN_FADE_UP}
                  className="rounded-3xl border border-slate-200/90 bg-[#F8FAFC] p-6"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-[15px] font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{item.body}</p>
                </motion.div>
              );
            })}
          </motion.div>
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

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 text-white sm:px-6 sm:py-28 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={ESIGN_VIEWPORT}
            transition={{ duration: 0.55, ease: ESIGN_EASE }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300/90">
              Get started
            </p>
            <h2 className="font-heading mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl sm:leading-[1.12]">
              Ready to send your next agreement?
            </h2>
            <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-slate-300 sm:text-lg">
              Open eSign in your workspace, place fields, invite recipients, and seal the finished
              PDF with a verifiable hash.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="h-12 cursor-pointer rounded-full bg-sky-400 px-7 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-400/25 transition-transform hover:scale-[1.02] hover:bg-sky-300"
                onClick={startEsign}
              >
                Start eSign
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 cursor-pointer rounded-full border-slate-500/80 bg-transparent px-7 text-sm font-semibold text-slate-100 hover:bg-white/5 hover:text-white"
                onClick={() => navigate("/workspace")}
              >
                Open workspace
              </Button>
            </div>

            <Link
              to="/#esign"
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
            viewport={ESIGN_VIEWPORT}
            transition={{ duration: 0.55, delay: 0.08, ease: ESIGN_EASE }}
          >
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-sky-500/20 to-blue-600/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">What you get</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Ordered signing, audit trail, and a sealed PDF — in one workspace.
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/30">
                  <FileSignature className="h-5 w-5" />
                </span>
              </div>
              <ul className="mt-6 space-y-2.5 border-t border-white/10 pt-5">
                {[
                  "Self-sign or multi-recipient flows",
                  "Private links for each signer",
                  "SHA-256 seal + downloadable certificate",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        defaultTab="login"
        onSuccess={() => navigate("/sign")}
      />
    </div>
  );
}
