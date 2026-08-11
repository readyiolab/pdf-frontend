import type { DiagramPage, ThemeId } from "./model";

export type DiagramTheme = {
  id: ThemeId;
  label: string;
  fontFamily: string;
  background: string;
  gridColor: string;
  defaultFill: string;
  defaultStroke: string;
  defaultFontColor: string;
  edgeStroke: string;
  edgeStyle: "orthogonal" | "straight" | "entityRelation" | "elbow";
  rounded: boolean;
  shadow: boolean;
  strokeWidth: number;
  preview: { fills: string[] };
};

export const THEMES: Record<ThemeId, DiagramTheme> = {
  automatic: {
    id: "automatic",
    label: "Automatic",
    fontFamily: "Helvetica",
    background: "#ffffff",
    gridColor: "#e5e7eb",
    defaultFill: "#dae8fc",
    defaultStroke: "#6c8ebf",
    defaultFontColor: "#333333",
    edgeStroke: "#64748b",
    edgeStyle: "orthogonal",
    rounded: false,
    shadow: false,
    strokeWidth: 1.5,
    preview: { fills: ["#dae8fc", "#d5e8d4", "#ffe6cc", "#f8cecc"] },
  },
  classic: {
    id: "classic",
    label: "Classic",
    fontFamily: "Helvetica",
    background: "#ffffff",
    gridColor: "#d0d7de",
    defaultFill: "#fff2cc",
    defaultStroke: "#d6b656",
    defaultFontColor: "#000000",
    edgeStroke: "#000000",
    edgeStyle: "orthogonal",
    rounded: false,
    shadow: false,
    strokeWidth: 1,
    preview: { fills: ["#fff2cc", "#dae8fc", "#d5e8d4", "#f8cecc"] },
  },
  simple: {
    id: "simple",
    label: "Simple",
    fontFamily: "Arial",
    background: "#fafafa",
    gridColor: "#e8e8e8",
    defaultFill: "#ffffff",
    defaultStroke: "#666666",
    defaultFontColor: "#333333",
    edgeStroke: "#666666",
    edgeStyle: "straight",
    rounded: true,
    shadow: false,
    strokeWidth: 1.25,
    preview: { fills: ["#ffffff", "#f0f0f0", "#e8e8e8", "#d9d9d9"] },
  },
  minimal: {
    id: "minimal",
    label: "Minimal",
    fontFamily: "Inter, Helvetica, sans-serif",
    background: "#ffffff",
    gridColor: "#f1f5f9",
    defaultFill: "#f8fafc",
    defaultStroke: "#94a3b8",
    defaultFontColor: "#0f172a",
    edgeStroke: "#94a3b8",
    edgeStyle: "orthogonal",
    rounded: true,
    shadow: false,
    strokeWidth: 1,
    preview: { fills: ["#f8fafc", "#f1f5f9", "#e2e8f0", "#cbd5e1"] },
  },
  sketch: {
    id: "sketch",
    label: "Sketch",
    fontFamily: "Comic Sans MS, Marker Felt, cursive",
    background: "#fffef7",
    gridColor: "#e8e0d0",
    defaultFill: "#fff8e7",
    defaultStroke: "#5c4a32",
    defaultFontColor: "#3d2b1f",
    edgeStroke: "#5c4a32",
    edgeStyle: "straight",
    rounded: true,
    shadow: true,
    strokeWidth: 2,
    preview: { fills: ["#fff8e7", "#ffe4c4", "#e8f5e9", "#e3f2fd"] },
  },
  atlas: {
    id: "atlas",
    label: "Atlas",
    fontFamily: "Segoe UI, Helvetica, sans-serif",
    background: "#f5f7fa",
    gridColor: "#dce3ec",
    defaultFill: "#0052cc",
    defaultStroke: "#0747a6",
    defaultFontColor: "#ffffff",
    edgeStroke: "#42526e",
    edgeStyle: "orthogonal",
    rounded: true,
    shadow: false,
    strokeWidth: 1.5,
    preview: { fills: ["#0052cc", "#00b8d9", "#36b37e", "#ff5630"] },
  },
};

export function getTheme(id: string | undefined | null): DiagramTheme {
  if (id && id in THEMES) return THEMES[id as ThemeId];
  return THEMES.automatic;
}

/** Remap node/edge styles to theme defaults while preserving labels and positions. */
export function applyThemeToPage(page: DiagramPage, themeId: string): DiagramPage {
  const theme = getTheme(themeId);
  const fills = theme.preview.fills;

  return {
    ...page,
    nodes: page.nodes.map((node, i) => {
      if (node.kind === "freehand") {
        return {
          ...node,
          freehand: node.freehand
            ? { ...node.freehand, color: theme.defaultStroke }
            : node.freehand,
          style: {
            ...node.style,
            stroke: theme.defaultStroke,
            fontColor: theme.defaultFontColor,
            fontFamily: theme.fontFamily,
          },
        };
      }
      return {
        ...node,
        style: {
          ...node.style,
          fill: fills[i % fills.length] ?? theme.defaultFill,
          stroke: theme.defaultStroke,
          strokeWidth: theme.strokeWidth,
          fontColor:
            theme.id === "atlas" && (fills[i % fills.length] ?? theme.defaultFill) === theme.defaultFill
              ? theme.defaultFontColor
              : theme.id === "atlas"
                ? "#ffffff"
                : theme.defaultFontColor,
          fontFamily: theme.fontFamily,
          rounded: theme.rounded,
          shadow: theme.shadow,
        },
      };
    }),
    edges: page.edges.map((edge) => ({
      ...edge,
      style: {
        ...edge.style,
        stroke: theme.edgeStroke,
        strokeWidth: theme.strokeWidth,
        edgeStyle: theme.edgeStyle,
        fontColor: theme.defaultFontColor,
        fontSize: edge.style?.fontSize,
      },
    })),
  };
}
