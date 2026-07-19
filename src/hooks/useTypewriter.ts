import { useEffect, useRef, useState } from "react";

/**
 * Reveals `full` progressively, the way a chat model appears to "type" its
 * answer. We already have the whole string in hand — this is a presentation
 * effect, not real token streaming — but it reads identically to the user and
 * avoids the proxy-buffering fragility of SSE behind a production reverse proxy.
 *
 * Speed scales with length so a short summary and a long one both finish in a
 * bounded, comfortable window rather than the short one flashing instantly and
 * the long one crawling.
 */
export function useTypewriter(full: string, enabled = true): { shown: string; done: boolean } {
  const [shown, setShown] = useState(enabled ? "" : full);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      setShown(full);
      return;
    }
    if (!full) {
      setShown("");
      return;
    }

    // Aim to finish in ~2.5s regardless of length, min 2 chars/tick so it never
    // feels sluggish on a long document summary.
    const perTick = Math.max(2, Math.ceil(full.length / 150));
    let i = 0;
    setShown("");

    const tick = () => {
      i += perTick;
      setShown(full.slice(0, i));
      if (i < full.length) {
        frame.current = window.setTimeout(tick, 16);
      }
    };
    frame.current = window.setTimeout(tick, 16);

    return () => window.clearTimeout(frame.current);
  }, [full, enabled]);

  return { shown, done: shown.length >= full.length };
}
