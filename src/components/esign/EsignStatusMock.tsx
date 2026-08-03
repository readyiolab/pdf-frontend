import { motion } from "framer-motion";
import { Hash, Mail, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ESIGN_EASE } from "./motion";

const SIGNERS = [
  { name: "Alex Chen", role: "Legal", status: "Signed", done: true },
  { name: "Jordan Lee", role: "Finance", status: "Signed", done: true },
  { name: "Sam Rivera", role: "Vendor", status: "Pending", done: false },
] as const;

interface EsignStatusMockProps {
  className?: string;
}

export function EsignStatusMock({ className }: EsignStatusMockProps) {
  return (
    <div
      className={cn(
        "relative rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.35)] sm:p-8",
        className
      )}
    >
      <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">Vendor_Agreement.pdf</p>
          <p className="text-xs text-slate-500">3 signers · sequential order</p>
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
          In progress
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {SIGNERS.map((row, i) => (
          <motion.div
            key={row.name}
            className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3.5 ring-1 ring-slate-100"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + i * 0.08, duration: 0.4, ease: ESIGN_EASE }}
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
  );
}
