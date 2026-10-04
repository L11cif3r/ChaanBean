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
          bg: "#F8F9FA", // Clean white/off-white canvas
          card: "#FFFFFF", // Pure white card surface
          cardHover: "#FFF8F2", // Subtle Swiggy orange hover
          border: "#E5E7EB", // High-contrast clean border
          borderLight: "#F3F4F6",
          textPrimary: "#111827",
          textSecondary: "#4B5563",
          textMuted: "#6B7280",
          green: "#10B981",
          greenDark: "#064E3B",
          amber: "#F59E0B",
          amberDark: "#78350F",
          red: "#EF4444",
          redDark: "#7F1D1D",
          navy: "#F9FAFB",
          slate: "#F3F4F6",
          accent: "#FC8019", // Swiggy Orange
          accentHover: "#E26D0A",
          brand: "#FC8019", // Swiggy Orange
          brandLight: "#FFA34D",
          brandDark: "#E26D0A",
          brandGlow: "rgba(252, 128, 25, 0.35)",
          swiggyOrange: "#FC8019",
          swiggyLight: "#FFF2E7",
        },
      },
    },
  },
  plugins: [],
};

export default config;
