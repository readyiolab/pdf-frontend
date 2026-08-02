import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { BYOC_EASE, BYOC_VIEWPORT } from "./motion";

interface AnimatedChecksProps {
  items: string[];
  variant?: "dark" | "light";
  className?: string;
}

export function AnimatedChecks({
  items,
  variant = "dark",
  className,
}: AnimatedChecksProps) {
  const dark = variant === "dark";

  return (
    <ul className={cn("space-y-3.5", className)}>
      {items.map((item, i) => (
        <motion.li
          key={item}
          className={cn(
            "flex items-center gap-3 text-sm font-medium",
            dark ? "text-slate-200" : "text-slate-700"
          )}
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={BYOC_VIEWPORT}
          transition={{ delay: 0.08 + i * 0.07, duration: 0.4, ease: BYOC_EASE }}
        >
          <span
            className={cn(
              "relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-sm",
              dark
                ? "bg-sky-500 text-slate-950 shadow-sky-500/30"
                : "bg-blue-600 text-white shadow-blue-600/25"
            )}
          >
            <motion.span
              className="absolute inset-0 flex items-center justify-center"
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={BYOC_VIEWPORT}
              transition={{
                delay: 0.18 + i * 0.07,
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
  );
}
