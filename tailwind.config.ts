import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        chaan: {
          bg: "#0B0F17", // Deep slate foundation in dark mode
          card: "#131B2A", // Card surface in dark mode
          cardHover: "#1A2538",
          border: "#243247", // High-contrast border in dark mode
          borderLight: "#334460",
          textPrimary: "#F8FAFC",
          textSecondary: "#94A3B8",
          textMuted: "#64748B",
          green: "#10B981",
          greenDark: "#064E3B",
          amber: "#F59E0B",
          amberDark: "#78350F",
          red: "#EF4444",
          redDark: "#7F1D1D",
          navy: "#0E1524",
          slate: "#1E293B",
          accent: "#38BDF8",
          accentHover: "#0284C7",
          brand: "#F44851",
          brandLight: "#FF6B72",
          brandDark: "#D9303A",
          brandGlow: "rgba(244, 72, 81, 0.35)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
