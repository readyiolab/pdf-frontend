import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, amount: 0.25 } as const;

const HERO_CHECKS = [
  "Excel in → branded PDFs out",
  "Your Outlook or Gmail sends",
  "AI drafts, humans approve",
] as const;

const STEPS = [
  {
    n: "01",
    title: "Design the letter",
    body: "Pick a starter (increment, offer, confirmation…) or ask AI to draft. Insert fields like {{Employee_Name}} — no Word macros.",
  },
  {
    n: "02",
    title: "Import & map Excel",
    body: "Upload a spreadsheet, map messy columns (CTC_New → New_CTC), validate blanks and duplicates before anything generates.",
  },
  {
    n: "03",
    title: "Generate & send",
    body: "Approve a sample, queue password-protected PDFs, then create drafts or send from your connected Outlook or Gmail.",
  },
] as const;

const FEATURES = [
  {
    icon: FileText,
    title: "Brand Letter Studio",
    body: "Logo, letterhead, signatory, and TipTap editing with reusable blocks.",
  },
  {
    icon: FileSpreadsheet,
    title: "Excel-ready batches",
    body: "Column detection, mapping, validation, and row-level Ready / Warning / Blocked.",
  },
  {
    icon: Mail,
    title: "Your mailbox sends",
    body: "Microsoft Graph or Gmail OAuth — drafts by default, send-now only with confirmation.",
  },
  {
    icon: Sparkles,
    title: "AI that stays optional",
    body: "Draft, polish, smart mapping, anomaly flags — never auto-approve or auto-send.",
  },
  {
    icon: Users,
    title: "Org & roles",
    body: "Invite HR and finance with Owner / Admin / HR Manager / Viewer access.",
  },
  {
    icon: ShieldCheck,
    title: "Org-scoped & audited",
    body: "Every batch stays in your org. PDF passwords never appear in logs or API responses.",
  },
] as const;

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function LettersLanding() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start end", "end start"],
  });
  const mockY = useTransform(scrollYProgress, [0, 1], [14, -14]);

  const studioPath = token ? "/letters/studio" : "/login";
  const ctaLabel = token ? "Open Letter Studio" : "Start free";

  return (
    <div className="flex w-full flex-col overflow-x-hidden bg-[#F7F9FC] text-slate-900">
      <section
        ref={heroRef}
        className="relative w-full min-h-[min(100svh,920px)] overflow-hidden border-b border-slate-200/70 -mt-14 sm:-mt-16"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 82% 10%, rgba(37,99,235,0.16), transparent 52%), radial-gradient(ellipse 55% 45% at 8% 88%, rgba(99,102,241,0.1), transparent 50%), linear-gradient(165deg, #F7F9FC 0%, #E8EEF8 42%, #F7F9FC 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(100,116,139,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.18) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 40%, black, transparent)",
          }}
        />

        <div className="relative mx-auto grid min-h-[min(100svh,920px)] max-w-6xl items-center gap-8 px-4 pb-14 pt-28 sm:px-6 sm:pb-16 sm:pt-32 lg:grid-cols-2 lg:gap-10 lg:px-8">
          <motion.div
            className="relative z-10 w-full"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm ring-1 ring-blue-200/80 backdrop-blur-sm">
              <FileText className="h-3.5 w-3.5" />
              Letter Studio · HR & Finance
            </p>

            <h1 className="font-heading mt-6 text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.05] lg:text-[3.25rem]">
              Employee letters at scale
            </h1>

            <p className="mt-4 max-w-xl text-balance text-xl font-medium tracking-tight text-slate-700 sm:text-2xl sm:leading-snug">
              Brand once. Import Excel. Generate password-protected PDFs. Send from your mailbox.
            </p>

            <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-slate-500 sm:text-lg">
              Built for HR teams who still live in spreadsheets — with validation gates and human
              approval before anything goes out.
            </p>

            <motion.div
              className="mt-8 flex flex-wrap items-center gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18, ease: EASE }}
            >
              <Button
                size="lg"
                className="h-12 cursor-pointer rounded-full bg-blue-600 px-8 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
                onClick={() => navigate(studioPath)}
              >
                {ctaLabel}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 cursor-pointer rounded-full border-slate-200/90 bg-white/80 px-8 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm hover:bg-white"
                onClick={() => scrollToId("how")}
              >
                See how it works
              </Button>
            </motion.div>

            <ul className="mt-8 space-y-2.5">
              {HERO_CHECKS.map((item, i) => (
                <motion.li
                  key={item}
                  className="flex items-center gap-2.5 text-sm font-medium text-slate-600"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.28 + i * 0.06, duration: 0.35, ease: EASE }}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <CheckCircle2 className="h-3 w-3" strokeWidth={2.75} />
                  </span>
                  {item}
                </motion.li>
              ))}
            </ul>

            {user?.plan === "FREE" && (
              <p className="mt-6 text-xs text-slate-500">
                Free includes a 5-row trial batch. Upgrade to PRO to send via Outlook/Gmail.
              </p>
            )}
          </motion.div>

          <motion.div className="relative mx-auto w-full max-w-lg lg:max-w-none" style={{ y: mockY }}>
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-blue-500/20 to-indigo-500/10 blur-2xl"
            />
            <LettersStudioMock />
          </motion.div>
        </div>
      </section>

      <section id="how" className="relative border-b border-slate-200/70 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">How it works</p>
            <h2 className="font-heading mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Three steps from spreadsheet to signed-off letters
            </h2>
          </motion.div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.n}
                className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT}
                transition={{ duration: 0.45, delay: i * 0.08, ease: EASE }}
              >
                <span className="font-heading text-3xl font-bold text-blue-600/25">{step.n}</span>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-slate-950 py-20 text-white sm:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 20% 0%, rgba(37,99,235,0.35), transparent 55%), linear-gradient(180deg, #0B1220 0%, #0F172A 100%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-300">Capabilities</p>
            <h2 className="font-heading mt-2 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
              Everything HR needs — without leaving the spreadsheet workflow
            </h2>
          </motion.div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT}
                  transition={{ duration: 0.4, delay: i * 0.05, ease: EASE }}
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-blue-500/20 text-sky-300 ring-1 ring-sky-400/20">
                    <Icon className="size-4" />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.body}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/70 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Ready for your next increment cycle?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-base text-slate-500">
            Create an org, invite your HR team, and run your first batch in minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="h-12 cursor-pointer rounded-full bg-blue-600 px-8 font-semibold text-white hover:bg-blue-700"
              onClick={() => navigate(studioPath)}
            >
              {ctaLabel}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 cursor-pointer rounded-full px-8 font-semibold"
              onClick={() => navigate("/billing")}
            >
              View plans
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function LettersStudioMock() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_40px_100px_-30px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/5">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/90 px-3 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-2 truncate text-[11px] font-medium text-slate-500">
          Letter Studio · Increment batch
        </span>
      </div>
      <div className="grid gap-0 sm:grid-cols-[140px_1fr]">
        <div className="hidden space-y-2 border-r border-slate-100 bg-slate-50/50 p-3 sm:block">
          {["Only you", "Brand", "Template", "Excel", "Validate"].map((label, i) => (
            <div
              key={label}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${
                i === 3 ? "bg-blue-600 text-white" : "text-slate-600"
              }`}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-900">Column mapping</p>
              <p className="text-[10px] text-slate-500">182 rows · AI suggested 9 fields</p>
            </div>
            <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold text-violet-700">
              AI
            </span>
          </div>
          <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2 text-[10px]">
            {[
              ["CTC_New", "New_CTC"],
              ["Emp Name", "Employee_Name"],
              ["Mail ID", "Employee_Email"],
            ].map(([from, to]) => (
              <div key={from} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1.5 ring-1 ring-slate-100">
                <span className="font-medium text-slate-600">{from}</span>
                <ArrowRight className="size-3 text-slate-300" />
                <span className="font-semibold text-blue-700">{to}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Ready", n: "168", tone: "text-emerald-700 bg-emerald-50" },
              { label: "Warning", n: "11", tone: "text-amber-700 bg-amber-50" },
              { label: "Blocked", n: "3", tone: "text-rose-700 bg-rose-50" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl px-2 py-2 text-center ${s.tone}`}>
                <div className="text-sm font-bold">{s.n}</div>
                <div className="text-[9px] font-semibold uppercase tracking-wide opacity-80">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
