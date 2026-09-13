import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeContext";

interface RiskBadgeProps {
  flag: "green" | "amber" | "red" | "GREEN" | "AMBER" | "RED";
  score?: number;
  size?: "sm" | "md" | "lg";
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ flag, score, size = "md" }) => {
  const { theme } = useTheme();
  const normalized = flag.toLowerCase() as "green" | "amber" | "red";

  let bg = theme.amberBg;
  let border = theme.amberBorder;
  let text = theme.amber;
  let label = "AMBER FLAG · MODERATE RISK";

  if (normalized === "green") {
    bg = theme.greenBg;
    border = theme.greenBorder;
    text = theme.green;
    label = "GREEN FLAG · PRIME LOW RISK";
  } else if (normalized === "red") {
    bg = theme.redBg;
    border = theme.redBorder;
    text = theme.red;
    label = "RED FLAG · DEFAULT RISK";
  }

  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, borderColor: border },
        isSmall && styles.badgeSm,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: text }]} />
      <Text style={[styles.text, { color: text }, isSmall && styles.textSm]}>
        {label}
        {score !== undefined ? ` (${score}/100)` : ""}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  textSm: {
    fontSize: 10,
  },
});
