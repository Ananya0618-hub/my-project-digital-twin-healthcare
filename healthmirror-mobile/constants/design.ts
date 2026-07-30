// constants/design.ts
// HealthMirror design system — single source of truth for colors, spacing,
// radii, typography and shadows so every screen looks consistent.

export const palette = {
  primary: "#2563EB",      // brand blue
  primaryDark: "#1D4ED8",
  primarySoft: "#E6EEFF",
  teal: "#0D9488",         // secondary accent (health/verification)
  tealSoft: "#DEFAF6",

  success: "#16A34A",
  successSoft: "#E7F8ED",
  warning: "#D97706",
  warningSoft: "#FEF3C7",
  danger: "#DC2626",
  dangerSoft: "#FDE8E8",

  ink900: "#0F172A",
  ink700: "#1F2937",
  ink500: "#6B7280",
  ink300: "#9CA3AF",
  border: "#E5E7EB",
  surface: "#FFFFFF",
  background: "#F4F7FB",
  white: "#FFFFFF",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 26, fontWeight: "800" as const, color: palette.ink900 },
  h2: { fontSize: 20, fontWeight: "700" as const, color: palette.ink900 },
  body: { fontSize: 15, fontWeight: "400" as const, color: palette.ink700 },
  label: { fontSize: 13, fontWeight: "600" as const, color: palette.ink500 },
  caption: { fontSize: 12, fontWeight: "500" as const, color: palette.ink500 },
};

export const shadow = {
  card: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  floating: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
};
