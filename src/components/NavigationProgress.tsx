import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const MIN_VISIBLE_MS = 150;
const MAX_VISIBLE_MS = 4000;

/**
 * Thin top progress bar on pathname change so navigation never feels “stuck”
 * while lazy chunks or first paint catch up.
 */
export function NavigationProgress() {
  const { pathname } = useLocation();
  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false);
  const startedAt = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }

    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (maxTimer.current) clearTimeout(maxTimer.current);

    startedAt.current = Date.now();
    setDone(false);
    setActive(true);

    const finish = () => {
      const elapsed = Date.now() - startedAt.current;
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
      hideTimer.current = setTimeout(() => {
        setDone(true);
        hideTimer.current = setTimeout(() => {
          setActive(false);
          setDone(false);
        }, 200);
      }, wait);
    };

    // Settle after next paint + a short tick (covers sync swaps and chunk loads).
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        finish();
      });
    });

    maxTimer.current = setTimeout(finish, MAX_VISIBLE_MS);

    return () => {
      cancelAnimationFrame(raf);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (maxTimer.current) clearTimeout(maxTimer.current);
    };
  }, [pathname]);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden"
      role="progressbar"
      aria-hidden
    >
      <div
        className={cn(
          "h-full origin-left bg-primary transition-transform duration-200 ease-out",
          done ? "scale-x-100 opacity-0" : "animate-nav-progress"
        )}
        style={done ? { transform: "scaleX(1)", opacity: 0 } : undefined}
      />
      <style>{`
        @keyframes nav-progress {
          0% { transform: scaleX(0.08); }
          50% { transform: scaleX(0.55); }
          100% { transform: scaleX(0.85); }
        }
        .animate-nav-progress {
          animation: nav-progress 1.2s ease-out forwards;
          transform-origin: left;
        }
      `}</style>
    </div>
  );
}
