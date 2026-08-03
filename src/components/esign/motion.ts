import type { Transition, Variants } from "framer-motion";

/** Shared motion tokens for eSign marketing surfaces. */
export const ESIGN_EASE = [0.22, 1, 0.36, 1] as const;

export const ESIGN_VIEWPORT = { once: true, margin: "-40px" as const };

export const ESIGN_TRANSITION: Transition = {
  duration: 0.55,
  ease: ESIGN_EASE,
};

export const ESIGN_STAGGER: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.045 },
  },
};

export const ESIGN_FADE_UP: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: ESIGN_EASE },
  },
};
