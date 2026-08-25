export const LETTER_ONBOARDING_KEY = "letter_onboarding_v1";

export type LetterNextStep = 1 | 2 | 3;

export function isLetterOnboardingDone(): boolean {
  try {
    return localStorage.getItem(LETTER_ONBOARDING_KEY) === "done";
  } catch {
    return false;
  }
}

export function markLetterOnboardingDone(): void {
  try {
    localStorage.setItem(LETTER_ONBOARDING_KEY, "done");
  } catch {
    /* ignore */
  }
}

/**
 * Next primary action. Brand is recommended, not a hard gate —
 * the core path is write a letter → send many from Excel.
 */
export function computeLetterNextStep(counts: {
  brandCount: number;
  templateCount: number;
  batchCount: number;
}): LetterNextStep {
  if (counts.templateCount === 0) return 2;
  if (counts.batchCount === 0) return 3;
  return 3;
}

export function shouldShowLetterOnboarding(counts: {
  brandCount: number;
  templateCount: number;
}): boolean {
  if (isLetterOnboardingDone()) return false;
  // First-time: no brand yet or no templates
  return counts.brandCount === 0 || counts.templateCount === 0;
}

export const LETTER_HOW_IT_WORKS = [
  "Optional: add your company look (logo & signatory)",
  "Write one letter with fields that change per employee",
  "Upload Excel and create PDFs — or email them",
] as const;

export const LETTER_STEP_META = [
  {
    n: 1 as const,
    title: "Your company look",
    short: "Company look",
    desc: "Add your logo and who signs the letters. You can skip and add this later.",
    to: "/letters/brands",
    cta: "Set up company look",
    recommended: true,
  },
  {
    n: 2 as const,
    title: "Your letter",
    short: "Letter",
    desc: "Write one letter with fields that change per employee.",
    to: "/letters/templates",
    cta: "Open letter templates",
    recommended: false,
  },
  {
    n: 3 as const,
    title: "Send many letters",
    short: "Send letters",
    desc: "Upload a spreadsheet, review employees, then create PDFs or email them.",
    to: "/letters/batches/new",
    cta: "Start sending letters",
    recommended: false,
  },
] as const;
