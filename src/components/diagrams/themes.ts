export type DiagramThemeId =
  | "automatic"
  | "classic"
  | "simple"
  | "minimal"
  | "sketch"
  | "atlas";

export type DiagramTheme = {
  id: DiagramThemeId;
  label: string;
  swatches: string[];
};

export const DIAGRAM_THEMES: DiagramTheme[] = [
  {
    id: "automatic",
    label: "Automatic",
    swatches: ["#dae8fc", "#fff2cc", "#d5e8d4", "#f8cecc", "#e1d5e7"],
  },
  {
    id: "classic",
    label: "Classic",
    swatches: ["#ffffff", "#000000", "#d0d0d0", "#6495ed", "#ffd700"],
  },
  {
    id: "simple",
    label: "Simple",
    swatches: ["#f5f5f5", "#333333", "#90caf9", "#a5d6a7", "#ef9a9a"],
  },
  {
    id: "minimal",
    label: "Minimal",
    swatches: ["#ffffff", "#111827", "#e5e7eb", "#9ca3af", "#6b7280"],
  },
  {
    id: "sketch",
    label: "Sketch",
    swatches: ["#fffef0", "#2d2d2d", "#ffcc80", "#80cbc4", "#ce93d8"],
  },
  {
    id: "atlas",
    label: "Atlas",
    swatches: ["#e8f0fe", "#1a73e8", "#34a853", "#fbbc04", "#ea4335"],
  },
];
