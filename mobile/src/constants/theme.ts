/**
 * NearBitez mobile theme.
 *
 * Carries the brand's warm orange identity and the light/dark surface ladder
 * from the web app, but the scales are re-tuned for mobile: larger touch
 * targets, tighter spacing, and type sizes that hold up on a small screen.
 * Deliberately not a copy of the desktop CSS.
 */

export type ThemeMode = "light" | "dark";

export interface ThemeColors {
  primary: string;
  primarySoft: string;
  primaryText: string;
  onPrimary: string;

  background: string;
  surface: string;
  card: string;
  raised: string;

  text: string;
  textMuted: string;
  textFaint: string;
  onAccent: string;

  border: string;
  borderStrong: string;

  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;
  info: string;
  infoSoft: string;

  overlay: string;
}

const light: ThemeColors = {
  primary: "#ea580c",
  primarySoft: "#fef3e8",
  primaryText: "#b43c0a",
  onPrimary: "#ffffff",

  background: "#f8f5f0",
  surface: "#fffdfb",
  card: "#ffffff",
  raised: "#ffffff",

  text: "#231f1c",
  textMuted: "#847c74",
  textFaint: "#b0a89f",
  onAccent: "#ffffff",

  border: "#eae4db",
  borderStrong: "#d8d0c4",

  success: "#059669",
  successSoft: "#ecfdf5",
  warning: "#d97706",
  warningSoft: "#fffbeb",
  error: "#e11d48",
  errorSoft: "#fff1f2",
  info: "#0284c7",
  infoSoft: "#f0f9ff",

  overlay: "rgba(28, 25, 23, 0.45)",
};

const dark: ThemeColors = {
  primary: "#fb852e",
  primarySoft: "#3a2619",
  primaryText: "#fdc385",
  onPrimary: "#1a1207",

  background: "#18161b",
  surface: "#211e25",
  card: "#211e25",
  raised: "#2a262f",

  text: "#faf9fa",
  textMuted: "#9e98a5",
  textFaint: "#746e7c",
  onAccent: "#1a1207",

  border: "#38333e",
  borderStrong: "#4c4654",

  success: "#34d399",
  successSoft: "rgba(16, 185, 129, 0.12)",
  warning: "#fbbf24",
  warningSoft: "rgba(245, 158, 11, 0.12)",
  error: "#fb7185",
  errorSoft: "rgba(244, 63, 94, 0.12)",
  info: "#38bdf8",
  infoSoft: "rgba(56, 189, 248, 0.12)",

  overlay: "rgba(0, 0, 0, 0.6)",
};

export const palettes: Record<ThemeMode, ThemeColors> = { light, dark };

/** 4pt base scale — everything lands on a multiple of 4 for optical rhythm. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 24, fontWeight: "700" },
  heading: { fontSize: 19, fontWeight: "700" },
  subheading: { fontSize: 16, fontWeight: "600" },
  body: { fontSize: 15, fontWeight: "400" },
  label: { fontSize: 13, fontWeight: "600" },
  caption: { fontSize: 12, fontWeight: "500" },
} as const;

/**
 * Android needs `elevation`; iOS needs the shadow* family. Both are set so a
 * surface looks the same on either platform.
 */
export const elevation = {
  none: {},
  sm: {
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  md: {
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
} as const;

/** Minimum tappable size (Material guideline). */
export const HIT_SLOP_MIN = 44;

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  elevation: typeof elevation;
}

export const buildTheme = (mode: ThemeMode): Theme => ({
  mode,
  colors: palettes[mode],
  spacing,
  radius,
  typography,
  elevation,
});
