import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { TOOLS, TOOL_CATEGORIES, getToolRoute } from "@/lib/design-tokens";
import {
  ArrowRight,
  ChevronDown,
  Cloud,
  FileSignature,
  FileText,
  GitMerge,
  Hash,
  KeyRound,
  Lock,
  Mail,
  Minimize2,
  Monitor,
  Scissors,
  ShieldCheck,
  Sparkles,
  Users,
  WifiOff,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ByocFlowDiagram } from "@/components/byoc/ByocFlowDiagram";
import { ProviderChips } from "@/components/byoc/ProviderChips";
import { AnimatedChecks } from "@/components/byoc/AnimatedChecks";
import { BYOC_EASE, BYOC_VIEWPORT } from "@/components/byoc/motion";
import { DesktopAppMock } from "@/components/desktop/DesktopAppMock";
import {
  DESKTOP_EASE,
  DESKTOP_VIEWPORT,
  DOWNLOAD_MAILTO,
} from "@/components/desktop/motion";
import { EsignStatusMock } from "@/components/esign/EsignStatusMock";

const FAQS = [
  {
    q: "Are eSignatures legally binding?",
    a: "Yes. Every document signed through eSign includes a cryptographic SHA-256 hash and a full audit trail record.",
  },
  {
    q: "Can I store PDFs in my own cloud?",
    a: "Yes — on Enterprise you connect AWS, Azure, Cloudflare R2, Google Cloud, or MinIO. Uploads and signed documents land in your bucket; we keep metadata and auth on our side. You control retention, encryption keys, and region.",
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

const HERO_RAIL = [
  { id: "merge", label: "Merge", icon: GitMerge },
  { id: "split", label: "Split", icon: Scissors },
  { id: "compress", label: "Compress", icon: Minimize2 },
  { id: "esign", label: "eSign", icon: FileSignature },
  { id: "ai", label: "AI", icon: Sparkles },
  { id: "protect", label: "Protect", icon: Lock },
] as const;

const HERO_PANELS: Record<
  (typeof HERO_RAIL)[number]["id"],
  { title: string; meta: string; tone: string }
> = {
  merge: {
    title: "Merge three contracts",
    meta: "Contract_A.pdf · B.pdf · C.pdf",
    tone: "Combining pages in order…",
  },
  split: {
    title: "Split by page ranges",
    meta: "Vendor_Agreement.pdf · 12 pages",
    tone: "Extracting pages 1–4, 5–8…",
  },
  compress: {
    title: "Compress for email",
    meta: "Board_Pack.pdf · 28 MB → ~4 MB",
    tone: "Optimizing images without wrecking text…",
  },
  esign: {
    title: "Send for signature",
    meta: "Vendor_Agreement.pdf · 3 recipients",
    tone: "Waiting on A. Rivera · SHA-256 seal ready",
  },
  ai: {
    title: "Summarize this PDF",
    meta: "Q3_Policy.pdf · grounded answers only",
    tone: "Key terms, risks, and next actions…",
  },
  protect: {
    title: "Password protect",
    meta: "HR_Offer.pdf · AES encryption",
    tone: "Locking file before share…",
  },
};

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
  const [activeTool, setActiveTool] = useState<(typeof HERO_RAIL)[number]["id"]>("esign");
  const byocSectionRef = useRef<HTMLElement>(null);
  const desktopSectionRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: byocSectionRef,
    offset: ["start end", "end start"],
  });
  const { scrollYProgress: desktopScrollY } = useScroll({
    target: desktopSectionRef,
    offset: ["start end", "end start"],
  });
  const { scrollYProgress: heroScrollY } = useScroll({
    target: heroRef,
    offset: ["start end", "end start"],
  });
  const diagramY = useTransform(scrollYProgress, [0, 1], [18, -18]);
  const desktopMockY = useTransform(desktopScrollY, [0, 1], [18, -18]);
  const heroStageY = useTransform(heroScrollY, [0, 1], [16, -16]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveTool((prev) => {
        const idx = HERO_RAIL.findIndex((t) => t.id === prev);
        return HERO_RAIL[(idx + 1) % HERO_RAIL.length].id;
      });
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  const primaryCta = user ? "Open workspace" : "Start free";
  const primaryPath = "/workspace";
  const byocPath = user?.plan === "ENTERPRISE" ? "/settings/cloud" : "/enterprise";
  const byocCta = user?.plan === "ENTERPRISE" ? "Open cloud storage" : "Use your own cloud";
  const activePanel = HERO_PANELS[activeTool];
  const ActiveIcon = HERO_RAIL.find((t) => t.id === activeTool)?.icon ?? FileSignature;

  const filteredTools = useMemo(
    () =>
      TOOLS.filter(
        (tool) => toolCategory === "All" || tool.categories.includes(toolCategory)
      ),
    [toolCategory]
  );

  return (
    <div className="flex w-full flex-col overflow-x-hidden bg-[#F7F9FC] text-slate-900">
      {/* ── Hero — software stage (not marketing highlights) ──────────────── */}
      <section
        ref={heroRef}
        className="relative w-full min-h-[min(100svh,980px)] overflow-hidden -mt-14 sm:-mt-16"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 55% at 50% 0%, rgba(37,99,235,0.14), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 80%, rgba(14,165,233,0.1), transparent 50%), linear-gradient(180deg, #EEF3FA 0%, #F7F9FC 42%, #F7F9FC 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[55%] opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(100,116,139,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.16) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "linear-gradient(180deg, black, transparent)",
          }}
        />

        <div className="relative mx-auto grid min-h-[min(100svh,980px)] max-w-6xl items-center gap-8 px-4 pb-14 pt-28 sm:gap-10 sm:px-6 sm:pb-16 sm:pt-32 lg:grid-cols-[0.95fr_1.05fr] lg:gap-8 lg:px-8">
          {/* Content */}
          <motion.div
            className="relative z-10 w-full"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease }}
          >
            <h1 className="font-heading text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.05] md:text-[3.35rem]">
              PDF<span className="text-blue-600">Toolkit</span>
            </h1>

            <p className="mt-4 max-w-lg text-balance text-xl font-medium tracking-tight text-slate-700 sm:text-2xl sm:leading-snug">
              Document workflows that stay fast, private, and simple
            </p>

            <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-slate-500 sm:text-lg">
              Convert, edit, sign, and understand PDFs in one calm workspace — built for teams that
              care about speed and privacy.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="h-12 cursor-pointer rounded-full bg-blue-600 px-8 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-transform hover:scale-[1.02] hover:bg-blue-700"
                onClick={() => navigate(primaryPath)}
              >
                {primaryCta}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 cursor-pointer rounded-full border-slate-200 bg-white/90 px-7 text-sm font-semibold text-slate-700 shadow-sm hover:bg-white"
                onClick={() => scrollToId("tools")}
              >
                Browse tools
              </Button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
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
                Your cloud
              </button>
              <span className="text-slate-300" aria-hidden>
                ·
              </span>
              <button
                type="button"
                onClick={() => scrollToId("letters")}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-indigo-800 transition-colors hover:bg-indigo-50"
              >
                <FileText className="h-3.5 w-3.5" />
                Letters
              </button>
              <span className="text-slate-300" aria-hidden>
                ·
              </span>
              <button
                type="button"
                onClick={() => scrollToId("desktop")}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-blue-800 transition-colors hover:bg-blue-50"
              >
                <Monitor className="h-3.5 w-3.5" />
                Desktop
              </button>
            </div>

            <ul className="mt-8 space-y-2.5">
              {[
                "Encrypted processing with short-lived file links",
                "Legally binding eSign with SHA-256 audit trail",
                "Enterprise option: keep files in your own cloud",
              ].map((item, i) => (
                <motion.li
                  key={item}
                  className="flex items-center gap-2.5 text-sm font-medium text-slate-600"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.28 + i * 0.06, duration: 0.35, ease }}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Check className="h-3 w-3" strokeWidth={2.75} />
                  </span>
                  {item}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Immersive app UI — the unique visual */}
          <motion.div
            className="relative mx-auto w-full max-w-xl lg:max-w-none"
            style={{ y: heroStageY }}
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.12, ease }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-4 -bottom-6 top-8 rounded-[2rem] bg-gradient-to-b from-blue-600/18 via-sky-200/30 to-transparent blur-3xl sm:-inset-x-6"
            />

            <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-[#0B1220] shadow-[0_40px_100px_-30px_rgba(15,23,42,0.55)] ring-1 ring-white/10 sm:rounded-3xl">
              {/* App chrome */}
              <div className="flex items-center gap-3 border-b border-white/10 bg-slate-950/80 px-3 py-2.5 sm:px-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
                </div>
                <div className="hidden min-w-0 flex-1 items-center justify-center sm:flex">
                  <div className="flex w-full max-w-sm items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 ring-1 ring-white/10">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate text-[11px] font-medium text-slate-300">
                      workspace · PDFToolkit
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300 ring-1 ring-emerald-400/20">
                      <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
                      Live
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(primaryPath)}
                  className="ml-auto cursor-pointer rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-md shadow-blue-600/30 hover:bg-blue-500 sm:ml-0"
                >
                  Open
                </button>
              </div>

              <div className="grid grid-cols-[52px_1fr] sm:grid-cols-[64px_1fr_220px]">
                {/* Icon rail */}
                <aside className="flex flex-col items-center gap-1.5 border-r border-white/10 bg-slate-950/60 py-3">
                  {HERO_RAIL.map((tool) => {
                    const Icon = tool.icon;
                    const on = tool.id === activeTool;
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        title={tool.label}
                        onClick={() => setActiveTool(tool.id)}
                        className={cn(
                          "relative flex h-10 w-10 cursor-pointer flex-col items-center justify-center rounded-xl transition-colors",
                          on
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {on && (
                          <motion.span
                            layoutId="hero-rail-dot"
                            className="absolute -right-0.5 top-1 h-1.5 w-1.5 rounded-full bg-sky-300"
                          />
                        )}
                      </button>
                    );
                  })}
                </aside>

                {/* Canvas */}
                <div className="relative min-h-[320px] bg-gradient-to-br from-slate-900 via-[#0F172A] to-slate-950 p-4 sm:min-h-[380px] sm:p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-300 ring-1 ring-blue-400/30">
                        <ActiveIcon className="h-4 w-4" />
                      </span>
                      <div>
                        <AnimatePresence mode="wait">
                          <motion.p
                            key={activePanel.title}
                            className="text-sm font-semibold text-white"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.25 }}
                          >
                            {activePanel.title}
                          </motion.p>
                        </AnimatePresence>
                        <p className="mt-0.5 text-[11px] text-slate-400">{activePanel.meta}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-300 ring-1 ring-white/10">
                      {HERO_RAIL.find((t) => t.id === activeTool)?.label}
                    </span>
                  </div>

                  {/* Document surface */}
                  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl shadow-black/40">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                      <p className="text-[11px] font-semibold text-slate-500">Preview</p>
                      <p className="text-[10px] font-medium text-slate-400">Page 1 of 12</p>
                    </div>
                    <div className="grid gap-3 bg-slate-50/80 p-4 sm:grid-cols-[1fr_0.9fr]">
                      <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200/80">
                        <div className="h-2 w-2/3 rounded-full bg-slate-200" />
                        <div className="space-y-1.5">
                          {[100, 92, 88, 95, 70, 85, 78].map((w, i) => (
                            <div
                              key={i}
                              className="h-1.5 rounded-full bg-slate-100"
                              style={{ width: `${w}%` }}
                            />
                          ))}
                        </div>
                        {activeTool === "esign" && (
                          <motion.div
                            className="mt-3 rounded-lg border border-dashed border-blue-300 bg-blue-50/60 px-3 py-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <p className="text-[9px] font-semibold uppercase tracking-wide text-blue-700">
                              Sign here
                            </p>
                            <p className="font-heading mt-1 text-lg italic font-semibold text-slate-800">
                              A. Rivera
                            </p>
                          </motion.div>
                        )}
                        {activeTool === "ai" && (
                          <motion.div
                            className="mt-3 rounded-lg bg-fuchsia-50 px-3 py-2 ring-1 ring-fuchsia-100"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <p className="flex items-center gap-1 text-[10px] font-semibold text-fuchsia-700">
                              <Sparkles className="h-3 w-3" />
                              Summary
                            </p>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                              Policy renews Q3. Two clauses need legal review before send.
                            </p>
                          </motion.div>
                        )}
                      </div>
                      <div className="hidden space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200/80 sm:block">
                        <div className="h-2 w-1/2 rounded-full bg-slate-200" />
                        <div className="space-y-1.5">
                          {[90, 80, 96, 72, 88, 64].map((w, i) => (
                            <div
                              key={i}
                              className="h-1.5 rounded-full bg-slate-100"
                              style={{ width: `${w}%` }}
                            />
                          ))}
                        </div>
                        <div className="mt-3 flex gap-2">
                          {[1, 2, 3].map((n) => (
                            <div
                              key={n}
                              className="aspect-[3/4] flex-1 rounded-md bg-gradient-to-b from-slate-50 to-slate-100 ring-1 ring-slate-200/70"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.p
                      key={activePanel.tone}
                      className="mt-3 text-[11px] font-medium text-slate-400"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {activePanel.tone}
                    </motion.p>
                  </AnimatePresence>
                </div>

                {/* Inspector */}
                <aside className="hidden border-l border-white/10 bg-slate-950/40 p-4 sm:block">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Inspector
                  </p>
                  <div className="mt-3 space-y-2.5">
                    <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                      <p className="text-[10px] text-slate-400">Status</p>
                      <p className="mt-1 text-xs font-semibold text-white">Ready</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                      <p className="text-[10px] text-slate-400">Integrity</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                        <Hash className="h-3 w-3" />
                        SHA-256
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                      <p className="text-[10px] text-slate-400">Storage</p>
                      <p className="mt-1 text-xs font-semibold text-sky-300">
                        Platform · or BYOC
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="mt-4 h-9 w-full cursor-pointer rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500"
                    onClick={() => navigate(primaryPath)}
                  >
                    Run tool
                  </Button>
                </aside>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Tools ──────────────────────────────────────────────────────────── */}
      <section
        id="tools"
        className="relative w-full scroll-mt-20 border-t border-slate-200/70 bg-white py-20 sm:py-28"
      >
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
                  onClick={() => navigate("/esign")}
                >
                  Explore eSign
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 cursor-pointer rounded-full border-slate-200 bg-white px-7 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => navigate(user ? "/sign" : "/esign")}
                >
                  {user ? "Open eSign" : "See how it works"}
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
              <EsignStatusMock className="relative" />
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
                Enterprise · Your cloud
              </p>
              <h2 className="font-heading mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Keep files in your cloud — AWS, Azure, R2, GCS, or MinIO
              </h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-300 sm:text-lg">
                Connect your own cloud storage on Enterprise. Uploads, eSign PDFs, and tool outputs
                write to your bucket over a presigned PUT. We keep auth, jobs, and signing metadata —
                never the file bytes in our object store.
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

      {/* ── Letter Studio deep dive ─────────────────────────────────────────── */}
      <section
        id="letters"
        className="relative w-full scroll-mt-20 overflow-hidden border-t border-slate-200/70 bg-[#F7F9FC] py-20 sm:py-28"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 55% 45% at 12% 30%, rgba(99,102,241,0.1), transparent 55%), radial-gradient(ellipse 45% 40% at 90% 70%, rgba(37,99,235,0.08), transparent 50%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={BYOC_VIEWPORT}
              transition={{ duration: 0.55, ease: BYOC_EASE }}
            >
              <p className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-500/20">
                <FileText className="h-3.5 w-3.5" />
                Letter Studio · HR & Finance
              </p>
              <h2 className="font-heading mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Branded employee letters from Excel — generate, protect, send
              </h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-500 sm:text-lg">
                Design once with field tokens, map messy spreadsheets, validate every row, then
                queue password-protected PDFs. Send drafts from your own Outlook or Gmail —
                AI suggests, humans approve.
              </p>
              <ul className="mt-7 space-y-2.5">
                {[
                  "TipTap letter editor with {{Employee_Name}} tokens",
                  "Excel import, mapping & Ready / Warning / Blocked",
                  "Bulk PDFs + your mailbox (never a shared sender)",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm font-medium text-slate-600">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                      <Check className="h-3 w-3" strokeWidth={2.75} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="h-12 cursor-pointer rounded-full bg-indigo-600 px-7 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700"
                  onClick={() => navigate("/letters")}
                >
                  Explore Letter Studio
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 cursor-pointer rounded-full border-slate-200 bg-white px-7 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => navigate(user ? "/letters/studio" : "/login")}
                >
                  {user ? "Open studio" : "Start free"}
                </Button>
              </div>
            </motion.div>

            <motion.div
              className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-900/10"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={BYOC_VIEWPORT}
              transition={{ duration: 0.55, delay: 0.08, ease: BYOC_EASE }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-semibold text-slate-900">Increment batch · Q1</span>
                </div>
                <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                  AI mapped
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { label: "Ready", n: "168", className: "bg-emerald-50 text-emerald-800" },
                  { label: "Warning", n: "11", className: "bg-amber-50 text-amber-800" },
                  { label: "Blocked", n: "3", className: "bg-rose-50 text-rose-800" },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl px-3 py-3 text-center ${s.className}`}>
                    <div className="text-xl font-bold">{s.n}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span>CTC_New</span>
                  <ArrowRight className="h-3 w-3 text-slate-300" />
                  <span className="font-semibold text-indigo-700">New_CTC</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span>Emp Name</span>
                  <ArrowRight className="h-3 w-3 text-slate-300" />
                  <span className="font-semibold text-indigo-700">Employee_Name</span>
                </div>
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
                Human approval before generate. Send via your connected Outlook or Gmail only.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Desktop PDF Toolkit ─────────────────────────────────────────────── */}
      <section
        id="desktop"
        ref={desktopSectionRef}
        className="relative w-full scroll-mt-20 overflow-hidden border-t border-slate-200/70 bg-white py-20 sm:py-28"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 85% 20%, rgba(37,99,235,0.08), transparent 55%), radial-gradient(ellipse 40% 35% at 10% 80%, rgba(14,165,233,0.06), transparent 50%)",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={DESKTOP_VIEWPORT}
              transition={{ duration: 0.55, ease: DESKTOP_EASE }}
            >
              <p className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                <Monitor className="h-3.5 w-3.5" />
                Desktop · Windows
              </p>
              <h2 className="font-heading mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                PDF Toolkit for your desktop
              </h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-500 sm:text-lg">
                All your PDF tools in one Windows app — fast, private, and offline-ready after
                activation. Files stay on your PC.
              </p>
              <ul className="mt-7 space-y-2.5">
                {[
                  { icon: ShieldCheck, text: "Private local processing — no random cloud uploads" },
                  { icon: WifiOff, text: "Works offline once licensed" },
                  { icon: KeyRound, text: "Activate with a license key; team seats available" },
                ].map((row) => {
                  const Icon = row.icon;
                  return (
                    <li
                      key={row.text}
                      className="flex items-start gap-2.5 text-sm font-medium text-slate-600"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      {row.text}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="h-12 cursor-pointer rounded-full bg-blue-600 px-7 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
                  onClick={() => navigate("/desktop")}
                >
                  Explore desktop
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 cursor-pointer rounded-full border-slate-200 bg-white px-7 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <a href={DOWNLOAD_MAILTO}>Download for Windows</a>
                </Button>
              </div>
            </motion.div>

            <motion.div className="relative" style={{ y: desktopMockY }}>
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-blue-500/15 to-sky-400/10 blur-2xl" />
              <DesktopAppMock variant="light" className="relative" />
            </motion.div>
          </div>
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
                blurb: "Your own cloud storage, SLA & dedicated support",
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
            Quick answers about privacy, your cloud storage, AI, and eSignatures.
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
