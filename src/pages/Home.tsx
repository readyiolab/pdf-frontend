import React, { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { TOOLS, TOOL_CATEGORIES, getToolRoute } from "@/lib/design-tokens";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Cloud,
  FileSignature,
  FileText,
  Hash,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ByocFlowDiagram } from "@/components/byoc/ByocFlowDiagram";
import { ProviderChips } from "@/components/byoc/ProviderChips";
import { AnimatedChecks } from "@/components/byoc/AnimatedChecks";
import { BYOC_EASE, BYOC_VIEWPORT } from "@/components/byoc/motion";

const FAQS = [
  {
    q: "Are eSignatures legally binding?",
    a: "Yes. Every document signed through eSign includes a cryptographic SHA-256 hash and a full audit trail record.",
  },
  {
    q: "What is Bring Your Own Cloud (BYOC)?",
    a: "On Enterprise, you point PDFToolkit at your own object storage. Uploads, signed documents, and job outputs land in your bucket — we keep metadata and auth on our side. You control retention, encryption keys, and region.",
  },
  {
    q: "Are my documents kept private and secure?",
    a: "Yes. Files go to encrypted private cloud storage and are accessible only via short-lived signed links. Stateless tool files are purged automatically after 60 minutes. Enterprise teams can also connect their own AWS, Azure, R2, GCS, or MinIO bucket.",
  },
  {
    q: "How does AI summarization work?",
    a: "We parse your PDF’s text layer with high-speed OCR and LLM embeddings to produce concise executive summaries — without training on your data.",
  },
];

const HOME_CATEGORIES = ["All", ...TOOL_CATEGORIES.filter((c) => c !== "All")];

const ease = [0.22, 1, 0.36, 1] as const;

function isAiTool(id: string) {
  return id === "summarize" || id === "chatpdf" || id === "explain" || id === "ocr";
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export const Home: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [toolCategory, setToolCategory] = useState("All");
  const byocSectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: byocSectionRef,
    offset: ["start end", "end start"],
  });
  const diagramY = useTransform(scrollYProgress, [0, 1], [18, -18]);

  const primaryCta = user ? "Open workspace" : "Start free";
  const primaryPath = "/workspace";
  const byocPath = user?.plan === "ENTERPRISE" ? "/settings/cloud" : "/enterprise";
  const byocCta = user?.plan === "ENTERPRISE" ? "Open cloud storage" : "Explore Enterprise BYOC";

  const filteredTools = useMemo(
    () =>
      TOOLS.filter(
        (tool) => toolCategory === "All" || tool.categories.includes(toolCategory)
      ),
    [toolCategory]
  );

  return (
    <div className="flex w-full flex-col overflow-x-hidden bg-[#F7F9FC] text-slate-900">
      {/* ── Hero (extends under transparent navbar) ────────────────────────── */}
      <section className="relative w-full min-h-[min(100svh,920px)] overflow-hidden -mt-14 sm:-mt-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 78% 8%, rgba(37,99,235,0.16), transparent 52%), radial-gradient(ellipse 55% 45% at 8% 88%, rgba(14,165,233,0.1), transparent 50%), radial-gradient(ellipse 40% 30% at 50% 50%, rgba(255,255,255,0.8), transparent 70%), linear-gradient(165deg, #F7F9FC 0%, #E8EEF8 42%, #F7F9FC 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(100,116,139,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.22) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 35%, black, transparent)",
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
          className="pointer-events-none absolute -right-16 bottom-24 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl"
          animate={{ y: [0, -22, 0], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        />

        <div className="relative mx-auto flex min-h-[min(100svh,920px)] max-w-6xl flex-col justify-center px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-32 lg:px-8">
          <motion.div
            className="mx-auto max-w-3xl text-center"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
          >
            <p className="font-heading mb-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-[3.5rem] md:leading-[1.05]">
              PDFToolkit
            </p>

            <h1 className="text-balance text-xl font-medium tracking-tight text-slate-700 sm:text-2xl md:text-[1.75rem] md:leading-snug">
              Document workflows that stay fast, private, and simple
            </h1>

            <p className="mx-auto mt-4 max-w-lg text-pretty text-base leading-relaxed text-slate-500 sm:text-lg">
              Convert, edit, sign, and understand PDFs in one calm workspace.
            </p>

            <motion.div
              className="mt-8 flex flex-col items-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2, ease }}
            >
              <Button
                size="lg"
                className="h-12 cursor-pointer rounded-full bg-blue-600 px-8 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-transform hover:scale-[1.02] hover:bg-blue-700"
                onClick={() => navigate(primaryPath)}
              >
                {primaryCta}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-1 gap-y-2 text-sm">
                <button
                  type="button"
                  onClick={() => scrollToId("esign")}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-blue-700 transition-colors hover:bg-blue-50"
                >
                  <FileSignature className="h-3.5 w-3.5" />
                  eSign
                </button>
                <span className="text-slate-300" aria-hidden>
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => scrollToId("byoc")}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-sky-800 transition-colors hover:bg-sky-50"
                >
                  <Cloud className="h-3.5 w-3.5" />
                  Bring Your Own Cloud
                </button>
              </div>
            </motion.div>
          </motion.div>

          {/* Product visual */}
          <motion.div
            className="relative mx-auto mt-12 w-full max-w-5xl sm:mt-16"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.16, ease }}
          >
            <div className="absolute -inset-x-10 -bottom-10 top-10 rounded-[2.5rem] bg-gradient-to-b from-blue-600/15 via-sky-200/30 to-transparent blur-3xl sm:-inset-x-20" />
            <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-[0_32px_100px_-28px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/60 backdrop-blur-sm sm:rounded-3xl">
              <div className="flex items-center gap-2 border-b border-slate-100/90 bg-gradient-to-r from-slate-50 to-white px-4 py-3.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
                <span className="ml-3 text-xs font-medium text-slate-400">
                  Workspace · PDFToolkit
                </span>
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Secure
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
                <aside className="hidden border-r border-slate-100 bg-slate-50/70 p-4 md:block">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Tools
                  </p>
                  <ul className="space-y-1">
                    {[
                      { label: "Merge PDF", icon: Zap },
                      { label: "Compress", icon: FileText },
                      { label: "eSign", icon: FileSignature, active: true },
                      { label: "Summarize", icon: Sparkles },
                      { label: "Protect", icon: Lock },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <li
                          key={item.label}
                          className={cn(
                            "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors",
                            item.active
                              ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                              : "text-slate-500"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                          {item.label}
                        </li>
                      );
                    })}
                  </ul>
                </aside>
                <div className="space-y-4 bg-gradient-to-br from-white to-slate-50/80 p-5 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
                        <FileSignature className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Vendor_Agreement.pdf
                        </p>
                        <p className="text-xs text-slate-500">Ready to send · 12 pages</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                      Live
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-500"
                      initial={{ width: "0%" }}
                      animate={{ width: "72%" }}
                      transition={{ duration: 1.2, delay: 0.6, ease }}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm">
                      <p className="text-[11px] font-medium text-slate-400">Recipients</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">2 of 3 signed</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm">
                      <p className="text-[11px] font-medium text-slate-400">Audit trail</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">SHA-256 verified</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Tools ──────────────────────────────────────────────────────────── */}
      <section className="relative w-full border-t border-slate-200/70 bg-white py-20 sm:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-50/80 to-transparent"
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                Toolkit
              </p>
              <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Every PDF tool you need
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-500 sm:text-lg">
                Merge, compress, convert, protect, and more — pick a tool and start in seconds.
              </p>
            </div>
            <Button
              variant="outline"
              className="h-10 w-fit cursor-pointer rounded-full border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => navigate("/workspace")}
            >
              Open all tools
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="mt-8 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {HOME_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setToolCategory(cat)}
                className={cn(
                  "shrink-0 cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition-all",
                  toolCategory === cat
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/15"
                    : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <motion.div
            className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.045 } },
            }}
          >
            {filteredTools.map((tool) => {
              const Icon = tool.icon;
              const ai = isAiTool(tool.id);
              const featured = tool.id === "esign";

              return (
                <motion.div
                  key={tool.id}
                  variants={{
                    hidden: { opacity: 0, y: 18 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.45, ease },
                    },
                  }}
                >
                  <Link
                    to={getToolRoute(tool)}
                    className={cn(
                      "group relative flex h-full flex-col overflow-hidden rounded-2xl border p-5 transition-all duration-300",
                      featured
                        ? "border-blue-200 bg-gradient-to-br from-blue-50 via-white to-sky-50 shadow-md shadow-blue-600/10 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-600/15"
                        : "border-slate-200/90 bg-[#F8FAFC] hover:-translate-y-1 hover:border-slate-300 hover:bg-white hover:shadow-xl hover:shadow-slate-900/8"
                    )}
                  >
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                        tool.gradient
                      )}
                    />
                    <div className="relative flex items-start justify-between gap-3">
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-105",
                          tool.accent
                        )}
                      >
                        <Icon className={cn("h-5 w-5", tool.accentText)} />
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {featured && (
                          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            Popular
                          </span>
                        )}
                        {ai && (
                          <span className="rounded-full bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fuchsia-600 ring-1 ring-fuchsia-500/20">
                            AI
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative mt-4 flex-1">
                      <h3 className="text-[15px] font-semibold tracking-tight text-slate-900 group-hover:text-blue-700">
                        {tool.name}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                        {tool.desc}
                      </p>
                    </div>
                    <div className="relative mt-5 flex items-center justify-between border-t border-slate-200/70 pt-3.5">
                      <span className="text-[11px] font-medium text-slate-400">
                        {tool.categories[1]}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600">
                        Open
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── eSign highlight ───────────────────────────────────────────────── */}
      <section
        id="esign"
        className="relative w-full overflow-hidden border-t border-slate-200/70 bg-[#F7F9FC] py-20 sm:py-28"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 85% 40%, rgba(37,99,235,0.12), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, ease }}
            >
              <p className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                <FileSignature className="h-3.5 w-3.5" />
                eSign
              </p>
              <h2 className="font-heading mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Send, sign, and verify with a full audit trail
              </h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-500 sm:text-lg">
                Collect legally binding signatures without leaving PDFToolkit. Recipients sign in
                order, every open and signature is logged, and the finished PDF is sealed with a
                SHA-256 hash you can verify later.
              </p>
              <ul className="mt-7 space-y-3.5">
                {[
                  "Multi-recipient signing order with reminders",
                  "Cryptographic SHA-256 seal on every completed PDF",
                  "Private encrypted storage for in-flight documents",
                  "Reusable templates, self-sign, and completion emails",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-sm font-medium text-slate-700"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-600/25">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="h-12 cursor-pointer rounded-full bg-blue-600 px-7 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
                  onClick={() => navigate("/sign")}
                >
                  Try eSign
                  <FileSignature className="ml-1.5 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 cursor-pointer rounded-full border-slate-200 bg-white px-7 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => navigate("/workspace")}
                >
                  Open workspace
                </Button>
              </div>
            </motion.div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.08, ease }}
            >
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-blue-600/10 to-sky-400/10 blur-2xl" />
              <div className="relative rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.35)] sm:p-8">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Vendor_Agreement.pdf</p>
                    <p className="text-xs text-slate-500">3 signers · sequential order</p>
                  </div>
                  <span className="ml-auto rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                    In progress
                  </span>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    { name: "Alex Chen", role: "Legal", status: "Signed", done: true },
                    { name: "Jordan Lee", role: "Finance", status: "Signed", done: true },
                    { name: "Sam Rivera", role: "Vendor", status: "Pending", done: false },
                  ].map((row, i) => (
                    <motion.div
                      key={row.name}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3.5 ring-1 ring-slate-100"
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.15 + i * 0.08, duration: 0.4, ease }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white",
                            row.done ? "bg-blue-600" : "bg-slate-300"
                          )}
                        >
                          {row.name.charAt(0)}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{row.name}</p>
                          <p className="text-[11px] text-slate-400">{row.role}</p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          row.done ? "text-emerald-600" : "text-slate-400"
                        )}
                      >
                        {row.status}
                      </span>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
                  <div className="rounded-2xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-100">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      <Hash className="h-3 w-3" />
                      Document hash
                    </p>
                    <p className="mt-1 truncate font-mono text-[11px] font-medium text-slate-700">
                      a7f3…9c2e
                    </p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50/80 px-3.5 py-3 ring-1 ring-emerald-100">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700/70">
                      <Mail className="h-3 w-3" />
                      Notify on complete
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-emerald-800">Enabled</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            className="mt-14 grid gap-4 sm:grid-cols-3"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
          >
            {[
              {
                icon: Users,
                title: "1. Invite signers",
                body: "Add recipients, set signing order, and send from the same workspace.",
              },
              {
                icon: FileSignature,
                title: "2. Collect signatures",
                body: "Each person signs in turn. Opens, declines, and completions are recorded.",
              },
              {
                icon: ShieldCheck,
                title: "3. Seal & archive",
                body: "Finished PDFs get a SHA-256 seal plus an audit trail you can download.",
              },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{step.body}</p>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── BYOC deep dive ─────────────────────────────────────────────────── */}
      <section
        id="byoc"
        ref={byocSectionRef}
        className="relative w-full overflow-hidden border-t border-slate-200/70 bg-slate-950 py-20 text-white sm:py-28"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 12% 20%, rgba(14,165,233,0.28), transparent 55%), radial-gradient(ellipse 50% 40% at 88% 70%, rgba(37,99,235,0.22), transparent 50%), linear-gradient(180deg, #0B1220 0%, #0F172A 100%)",
          }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/3 top-0 h-px w-1/3 bg-gradient-to-r from-transparent via-sky-400/50 to-transparent"
          initial={{ opacity: 0, scaleX: 0.4 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={BYOC_VIEWPORT}
          transition={{ duration: 0.8, ease: BYOC_EASE }}
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={BYOC_VIEWPORT}
              transition={{ duration: 0.55, ease: BYOC_EASE }}
            >
              <p className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-300 ring-1 ring-sky-400/30">
                <Cloud className="h-3.5 w-3.5" />
                Enterprise · BYOC
              </p>
              <h2 className="font-heading mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Keep files in your cloud — AWS, Azure, R2, GCS, or MinIO
              </h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-300 sm:text-lg">
                Bring Your Own Cloud for Enterprise. Uploads, eSign PDFs, and tool outputs write to
                your bucket over a presigned PUT. We keep auth, jobs, and signing metadata — never
                the file bytes in our object store.
              </p>
              <AnimatedChecks
                className="mt-7"
                variant="dark"
                items={[
                  "Browser uploads go straight to your bucket",
                  "CORS self-check before you can Save",
                  "Provider switches never orphan old files",
                  "Keys encrypted at rest — operators never see them",
                ]}
              />
              <div className="mt-9 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="h-12 cursor-pointer rounded-full bg-sky-500 px-7 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/25 hover:bg-sky-400"
                  onClick={() => navigate(byocPath)}
                >
                  {byocCta}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 cursor-pointer rounded-full border-slate-600 bg-transparent px-7 text-sm font-semibold text-slate-100 hover:bg-white/5 hover:text-white"
                  onClick={() => navigate("/billing")}
                >
                  View plans
                </Button>
              </div>
            </motion.div>

            <motion.div className="relative" style={{ y: diagramY }}>
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-sky-500/20 to-blue-600/10 blur-2xl" />
              <ByocFlowDiagram variant="dark" className="relative" />
              <ProviderChips variant="dark" className="relative mt-4" />
            </motion.div>
          </div>

          <motion.div
            className="mt-14 grid gap-4 sm:grid-cols-3"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={BYOC_VIEWPORT}
            transition={{ duration: 0.5, ease: BYOC_EASE }}
          >
            {[
              {
                icon: KeyRound,
                title: "1. Connect your bucket",
                body: "Enter AWS, Azure, R2, GCS, or MinIO credentials under Cloud storage. Keys stay encrypted.",
              },
              {
                icon: ShieldCheck,
                title: "2. Pass CORS & health",
                body: "We verify reachability, write access, and browser CORS for your app origin before Save unlocks.",
              },
              {
                icon: Cloud,
                title: "3. Go live",
                body: "New uploads and signed PDFs land under org-{id}/… in your bucket. Switch providers without orphans.",
              },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/25">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-white">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{step.body}</p>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <section className="w-full border-t border-slate-200/70 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            Pricing
          </p>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Simple pricing
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-base text-slate-500 sm:text-lg">
            Start free. Upgrade when you need unlimited tools, larger files, and priority processing.
          </p>

          <div className="mx-auto mt-14 grid max-w-4xl gap-5 text-left sm:grid-cols-3">
            {[
              {
                name: "Free",
                price: "$0",
                blurb: "Core tools & light AI usage",
                cta: "Get started",
                path: "/workspace",
                featured: false,
              },
              {
                name: "Pro",
                price: "$12",
                blurb: "Unlimited tools, eSign & AI credits",
                cta: "Upgrade",
                path: "/billing",
                featured: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                blurb: "BYOC storage, SLA & dedicated support",
                cta: "Learn more",
                path: "/enterprise",
                featured: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "relative flex flex-col rounded-3xl border p-6 transition-transform hover:-translate-y-0.5",
                  plan.featured
                    ? "border-blue-500/40 bg-slate-900 text-white shadow-2xl shadow-blue-600/20"
                    : "border-slate-200 bg-[#F8FAFC] shadow-sm"
                )}
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
                    Best value
                  </span>
                )}
                <p
                  className={cn(
                    "text-sm font-semibold",
                    plan.featured ? "text-blue-300" : "text-slate-500"
                  )}
                >
                  {plan.name}
                </p>
                <p className="mt-3 text-4xl font-bold tracking-tight">
                  {plan.price}
                  {plan.price.startsWith("$") && plan.price !== "$0" && (
                    <span
                      className={cn(
                        "text-sm font-normal",
                        plan.featured ? "text-slate-400" : "text-slate-400"
                      )}
                    >
                      /mo
                    </span>
                  )}
                </p>
                <p
                  className={cn(
                    "mt-3 flex-1 text-sm leading-relaxed",
                    plan.featured ? "text-slate-300" : "text-slate-500"
                  )}
                >
                  {plan.blurb}
                </p>
                <Button
                  variant={plan.featured ? "secondary" : "outline"}
                  className={cn(
                    "mt-7 h-11 w-full cursor-pointer rounded-full text-sm font-semibold",
                    plan.featured
                      ? "bg-white text-slate-900 hover:bg-slate-100"
                      : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                  )}
                  onClick={() => navigate(plan.path)}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>

          <Link
            to="/billing"
            className="mt-10 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Compare all plans
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section className="w-full border-t border-slate-200/70 bg-[#F7F9FC] py-20 sm:py-28">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            FAQ
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-sm text-slate-500">
            Quick answers about privacy, BYOC, AI, and eSignatures.
          </p>
          <div className="mt-10 space-y-3">
            {FAQS.map((item, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={item.q}
                  className={cn(
                    "overflow-hidden rounded-2xl border bg-white transition-shadow",
                    open
                      ? "border-blue-200 shadow-md shadow-blue-600/5"
                      : "border-slate-200 shadow-sm"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50/80"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
                        open && "rotate-180 text-blue-600"
                      )}
                    />
                  </button>
                  {open && (
                    <div className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-500">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
