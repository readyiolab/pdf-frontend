import type { Transition, Variants } from "framer-motion";

/** Shared motion tokens for Desktop PDF Toolkit marketing surfaces. */
export const DESKTOP_EASE = [0.22, 1, 0.36, 1] as const;

export const DESKTOP_VIEWPORT = { once: true, margin: "-40px" as const };

export const DESKTOP_TRANSITION: Transition = {
  duration: 0.55,
  ease: DESKTOP_EASE,
};

export const DESKTOP_STAGGER: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.045 },
  },
};

export const DESKTOP_FADE_UP: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: DESKTOP_EASE },
  },
};

export const DOWNLOAD_MAILTO =
  "mailto:support@zuvigo.com?subject=PDF%20Toolkit%20Desktop%20Download";

export const LICENSE_MAILTO =
  "mailto:support@zuvigo.com?subject=PDF%20Toolkit%20Desktop%20License";

export const SALES_MAILTO =
  "mailto:support@zuvigo.com?subject=PDF%20Toolkit%20Desktop%20-%20Contact%20Sales";
