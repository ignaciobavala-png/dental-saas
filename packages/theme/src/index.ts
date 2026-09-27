export const palette = {
  canvas: "#ffffff",
  soft: "#f8f9fa",
  card: "#f5f5f5",
  ink: "#111111",
  body: "#374151",
  muted: "#6b7280",
  line: "#e5e7eb",
  accent: "#111111",
  accentHover: "#242424",
  brand: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  dark: "#101010",
} as const;

export type PresetName = "arocena";

export type ThemeTokens = {
  colors: {
    bg: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    accentFg: string;
    border: string;
  };
  radius: "none" | "sm" | "md" | "lg" | "pill";
  fonts: {
    display: string;
    body: string;
  };
};

export const presets: Record<PresetName, ThemeTokens> = {
  arocena: {
    colors: {
      bg: palette.canvas,
      surface: palette.soft,
      text: palette.ink,
      muted: palette.muted,
      accent: palette.accent,
      accentFg: "#ffffff",
      border: palette.line,
    },
    radius: "md",
    fonts: {
      display: '"Manrope", ui-sans-serif, system-ui, sans-serif',
      body: '"Inter", ui-sans-serif, system-ui, sans-serif',
    },
  },
};
