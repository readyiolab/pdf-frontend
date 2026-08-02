import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { BYOC_EASE, BYOC_VIEWPORT, PROVIDER_CHIPS } from "./motion";
import { ProviderLogo } from "./ProviderLogo";

interface ProviderChipsProps {
  variant?: "dark" | "light";
  className?: string;
}

export function ProviderChips({
  variant = "dark",
  className,
}: ProviderChipsProps) {
  const dark = variant === "dark";

  return (
    <motion.div
      className={cn("flex flex-wrap gap-2", className)}
      initial="hidden"
      whileInView="visible"
      viewport={BYOC_VIEWPORT}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.045 } },
      }}
    >
      {PROVIDER_CHIPS.map((p) => (
        <Tooltip key={p.id}>
          <TooltipTrigger asChild>
            <motion.button
              type="button"
              className={cn(
                "inline-flex cursor-default items-center gap-2 rounded-full py-1.5 pl-2 pr-3 text-[11px] font-semibold ring-1 transition-transform",
                dark
                  ? "bg-slate-800 text-slate-200 ring-white/10 hover:bg-slate-700"
                  : "bg-white text-slate-700 shadow-sm ring-slate-200 hover:bg-slate-50"
              )}
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.35, ease: BYOC_EASE },
                },
              }}
              whileHover={{ y: -2, scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full",
                  dark ? "bg-white/95" : "bg-slate-50 ring-1 ring-slate-100"
                )}
              >
                <ProviderLogo id={p.id} className="h-3.5 w-3.5" />
              </span>
              {p.label}
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] text-xs">
            {p.tip}
          </TooltipContent>
        </Tooltip>
      ))}
    </motion.div>
  );
}
