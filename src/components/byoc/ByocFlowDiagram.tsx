import { useReducedMotion, motion } from "framer-motion";
import { Cloud, Database, Globe, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { BYOC_EASE, BYOC_VIEWPORT } from "./motion";

export type ByocFlowVariant = "dark" | "light";

interface ByocFlowDiagramProps {
  variant?: ByocFlowVariant;
  className?: string;
}

const PATH_DATA = "M 48 110 C 160 110, 200 60, 320 60";
const PATH_META = "M 48 130 C 140 160, 200 200, 280 200 C 340 200, 380 200, 432 200";

export function ByocFlowDiagram({
  variant = "dark",
  className,
}: ByocFlowDiagramProps) {
  const reduceMotion = useReducedMotion();
  const dark = variant === "dark";

  const card = dark
    ? "border-white/10 bg-slate-900/70 text-white ring-sky-500/20"
    : "border-slate-200/90 bg-white text-slate-900 ring-slate-200/60 shadow-xl shadow-slate-900/8";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  const label = dark ? "text-slate-200" : "text-slate-700";
  const nodeBg = dark ? "bg-slate-800/90 ring-white/10" : "bg-slate-50 ring-slate-200";
  const dataStroke = dark ? "#38bdf8" : "#0284c7";
  const metaStroke = dark ? "#64748b" : "#94a3b8";
  const dataDot = dark ? "#7dd3fc" : "#0ea5e9";
  const metaDot = dark ? "#94a3b8" : "#64748b";

  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-3xl border p-4 ring-1 backdrop-blur-sm sm:p-6",
        card,
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={BYOC_VIEWPORT}
      transition={{ duration: 0.55, ease: BYOC_EASE }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className={cn("text-sm font-semibold", label)}>Where your files live</p>
          <p className={cn("text-xs", muted)}>
            Bytes go to your bucket · only keys &amp; status stay with us
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
            dark
              ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25"
              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          )}
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Connected · CORS verified
        </span>
      </div>

      {/* Desktop / tablet SVG flow */}
      <div className="relative hidden min-h-[280px] sm:block">
        <svg
          viewBox="0 0 480 260"
          className="h-auto w-full"
          role="img"
          aria-label="Architecture: browser uploads PDFs to your cloud bucket; PDFToolkit stores only metadata"
        >
          <defs>
            <linearGradient id={`byoc-data-${variant}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={dataStroke} stopOpacity="0.2" />
              <stop offset="50%" stopColor={dataStroke} stopOpacity="1" />
              <stop offset="100%" stopColor={dataStroke} stopOpacity="0.35" />
            </linearGradient>
          </defs>

          {/* Data lane (thick) */}
          <motion.path
            d={PATH_DATA}
            fill="none"
            stroke={`url(#byoc-data-${variant})`}
            strokeWidth={3.5}
            strokeLinecap="round"
            initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
            whileInView={reduceMotion ? undefined : { pathLength: 1, opacity: 1 }}
            viewport={BYOC_VIEWPORT}
            transition={{ duration: 1.1, ease: BYOC_EASE, delay: 0.15 }}
          />
          {/* Metadata lane (thin, dimmer) */}
          <motion.path
            d={PATH_META}
            fill="none"
            stroke={metaStroke}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeDasharray="4 6"
            opacity={0.55}
            initial={reduceMotion ? false : { pathLength: 0 }}
            whileInView={reduceMotion ? undefined : { pathLength: 1 }}
            viewport={BYOC_VIEWPORT}
            transition={{ duration: 1.2, ease: BYOC_EASE, delay: 0.28 }}
          />

          {!reduceMotion && (
            <>
              <PacketDot pathD={PATH_DATA} color={dataDot} duration={2.8} />
              <PacketDot
                pathD={PATH_META}
                color={metaDot}
                duration={4.2}
                delay={0.6}
                size={3.5}
              />
            </>
          )}
        </svg>

        {/* HTML nodes overlaid */}
        <div className="pointer-events-none absolute inset-0">
          <FlowNode
            className="left-0 top-[22%]"
            icon={Globe}
            title="Browser"
            subtitle="Your users"
            nodeBg={nodeBg}
            label={label}
            muted={muted}
            delay={0}
          />
          <FlowNode
            className="right-0 top-[2%]"
            icon={Cloud}
            title="Your bucket"
            subtitle="AWS · Azure · R2 · GCS · MinIO"
            nodeBg={nodeBg}
            label={label}
            muted={muted}
            delay={0.08}
            highlight
            dark={dark}
          />
          <FlowNode
            className="left-[32%] top-[62%]"
            icon={Server}
            title="PDFToolkit API"
            subtitle="Auth · jobs · signing"
            nodeBg={nodeBg}
            label={label}
            muted={muted}
            delay={0.12}
          />
          <FlowNode
            className="right-0 bottom-[2%]"
            icon={Database}
            title="Our database"
            subtitle="Metadata only"
            nodeBg={nodeBg}
            label={label}
            muted={muted}
            delay={0.16}
          />
        </div>

        <div className="mt-1 flex flex-wrap gap-4 px-1 text-[10px] font-medium">
          <span className="inline-flex items-center gap-1.5" style={{ color: dataStroke }}>
            <span className="h-0.5 w-4 rounded-full" style={{ background: dataStroke }} />
            PDF bytes (presigned PUT)
          </span>
          <span className={cn("inline-flex items-center gap-1.5", muted)}>
            <span
              className="h-px w-4 border-t border-dashed"
              style={{ borderColor: metaStroke }}
            />
            Job + auth · file keys · audit
          </span>
        </div>
      </div>

      {/* Mobile stacked cards */}
      <div className="space-y-3 sm:hidden">
        {[
          { icon: Globe, title: "Browser", sub: "Presigned upload" },
          { icon: Cloud, title: "Your bucket", sub: "PDF bytes stay here", highlight: true },
          { icon: Server, title: "PDFToolkit API", sub: "Never stores your files" },
          { icon: Database, title: "Our database", sub: "Keys, status, audit only" },
        ].map((n, i) => {
          const Icon = n.icon;
          return (
            <motion.div
              key={n.title}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3.5 py-3 ring-1",
                nodeBg,
                n.highlight &&
                  (dark
                    ? "ring-sky-400/40 bg-sky-500/10"
                    : "ring-sky-300/60 bg-sky-50")
              )}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={BYOC_VIEWPORT}
              transition={{ delay: 0.05 * i, duration: 0.4, ease: BYOC_EASE }}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl",
                  n.highlight
                    ? dark
                      ? "bg-sky-500 text-slate-950"
                      : "bg-sky-500 text-white"
                    : dark
                      ? "bg-slate-700 text-slate-200"
                      : "bg-white text-slate-600 shadow-sm"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className={cn("text-sm font-semibold", label)}>{n.title}</p>
                <p className={cn("text-xs", muted)}>{n.sub}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function PacketDot({
  pathD,
  color,
  duration,
  delay = 0,
  size = 5,
}: {
  pathD: string;
  color: string;
  duration: number;
  delay?: number;
  size?: number;
}) {
  // Animate along path using SVG animateMotion (reliable, no CSS offset-path quirks)
  return (
    <circle r={size} fill={color} opacity={0.95}>
      <animateMotion
        dur={`${duration}s`}
        begin={`${delay}s`}
        repeatCount="indefinite"
        path={pathD}
      />
    </circle>
  );
}

function FlowNode({
  className,
  icon: Icon,
  title,
  subtitle,
  nodeBg,
  label,
  muted,
  delay,
  highlight,
  dark,
}: {
  className: string;
  icon: typeof Globe;
  title: string;
  subtitle: string;
  nodeBg: string;
  label: string;
  muted: string;
  delay: number;
  highlight?: boolean;
  dark?: boolean;
}) {
  return (
    <motion.div
      className={cn(
        "absolute max-w-[148px] rounded-2xl px-3 py-2.5 ring-1 backdrop-blur-sm",
        nodeBg,
        highlight &&
          (dark
            ? "ring-sky-400/45 shadow-lg shadow-sky-500/20"
            : "ring-sky-300 shadow-md shadow-sky-500/15"),
        className
      )}
      initial={{ opacity: 0, scale: 0.92 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={BYOC_VIEWPORT}
      transition={{ delay, duration: 0.4, ease: BYOC_EASE }}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            highlight
              ? dark
                ? "bg-sky-500 text-slate-950"
                : "bg-sky-500 text-white"
              : dark
                ? "bg-slate-700 text-slate-200"
                : "bg-white text-slate-600 shadow-sm"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className={cn("truncate text-xs font-semibold", label)}>{title}</p>
          <p className={cn("truncate text-[10px] leading-snug", muted)}>{subtitle}</p>
        </div>
      </div>
    </motion.div>
  );
}
