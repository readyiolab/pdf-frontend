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

export function computeLetterNextStep(counts: {
  brandCount: number;
  templateCount: number;
  batchCount: number;
}): LetterNextStep {
  if (counts.brandCount === 0) return 1;
  if (counts.templateCount === 0) return 2;
  return 3;
}

export function shouldShowLetterOnboarding(counts: {
  brandCount: number;
  templateCount: number;
}): boolean {
  if (isLetterOnboardingDone()) return false;
  // First-time: no brand yet (checklist incomplete)
  return counts.brandCount === 0 || counts.templateCount === 0;
}

export const LETTER_STEP_META = [
  {
    n: 1 as const,
    title: "Your company look",
    short: "Brand",
    desc: "Add your logo and who signs the letters.",
    to: "/letters/brands",
    cta: "Set up brand",
  },
  {
    n: 2 as const,
    title: "Your letter",
    short: "Template",
    desc: "Write one letter with fields that change per employee.",
    to: "/letters/templates",
    cta: "Open templates",
  },
  {
    n: 3 as const,
    title: "Send many letters",
    short: "Batch",
    desc: "Upload Excel, check the data, then create PDFs.",
    to: "/letters/batches/new",
    cta: "Start a batch",
  },
] as const;
