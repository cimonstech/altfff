/** Brand-aligned chart palette — matches globals.css tokens, not Recharts defaults. */
export const ADMIN_CHART_COLORS = {
  ink: "#015347",
  forest: "#007563",
  gold: "#da8e06",
  goldDeep: "#956104",
  madder: "#ca902b",
  indigo: "#c5810a",
  paper: "#f6f1e7",
  surface: "#efe7d8",
  hairline: "rgba(23, 28, 38, 0.14)",
} as const;

export const ADMIN_CHART_SERIES = [
  ADMIN_CHART_COLORS.forest,
  ADMIN_CHART_COLORS.gold,
  ADMIN_CHART_COLORS.madder,
  ADMIN_CHART_COLORS.ink,
  ADMIN_CHART_COLORS.indigo,
  ADMIN_CHART_COLORS.goldDeep,
] as const;
