import React, { createContext, useContext, useState } from "react";

export interface ColorTheme {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceSecondary: string;
  card: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  brand: string;
  brandLight: string;
  brandDark: string;
  green: string;
  greenBg: string;
  greenBorder: string;
  amber: string;
  amberBg: string;
  amberBorder: string;
  red: string;
  redBg: string;
  redBorder: string;
  blue: string;
  blueBg: string;
  purple: string;
  inputBg: string;
  inputBorder: string;
  headerBg: string;
  tabBarBg: string;
  tabBarBorder: string;
}

export const darkTheme: ColorTheme = {
  isDark: true,
  background: "#090D16",
  surface: "#0F172A",
  surfaceSecondary: "#1E293B",
  card: "#111827",
  cardBorder: "#1F2937",
  text: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  brand: "#FC8019",
  brandLight: "#FFA34D",
  brandDark: "#E26E0B",
  green: "#10B981",
  greenBg: "rgba(16, 185, 129, 0.12)",
  greenBorder: "rgba(16, 185, 129, 0.3)",
  amber: "#F59E0B",
  amberBg: "rgba(245, 158, 11, 0.12)",
  amberBorder: "rgba(245, 158, 11, 0.3)",
  red: "#EF4444",
  redBg: "rgba(239, 68, 68, 0.12)",
  redBorder: "rgba(239, 68, 68, 0.3)",
  blue: "#38BDF8",
  blueBg: "rgba(56, 189, 248, 0.12)",
  purple: "#A855F7",
  inputBg: "#1E293B",
  inputBorder: "#334155",
  headerBg: "#0F172A",
  tabBarBg: "#0B1120",
  tabBarBorder: "#1E293B",
};

export const lightTheme: ColorTheme = {
  isDark: false,
  background: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceSecondary: "#F1F5F9",
  card: "#FFFFFF",
  cardBorder: "#E2E8F0",
  text: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  brand: "#FC8019",
  brandLight: "#FFA34D",
  brandDark: "#E26E0B",
  green: "#059669",
  greenBg: "rgba(5, 150, 105, 0.1)",
  greenBorder: "rgba(5, 150, 105, 0.25)",
  amber: "#D97706",
  amberBg: "rgba(217, 119, 6, 0.1)",
  amberBorder: "rgba(217, 119, 6, 0.25)",
  red: "#DC2626",
  redBg: "rgba(220, 38, 38, 0.1)",
  redBorder: "rgba(220, 38, 38, 0.25)",
  blue: "#0284C7",
  blueBg: "rgba(2, 132, 199, 0.1)",
  purple: "#9333EA",
  inputBg: "#F8FAFC",
  inputBorder: "#CBD5E1",
  headerBg: "#FFFFFF",
  tabBarBg: "#FFFFFF",
  tabBarBorder: "#E2E8F0",
};

interface ThemeContextType {
  theme: ColorTheme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: darkTheme,
  isDark: true,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
