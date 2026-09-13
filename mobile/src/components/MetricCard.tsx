import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeContext";

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: "brand" | "green" | "amber" | "red" | "blue";
  icon?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtitle,
  badge,
  badgeColor = "brand",
}) => {
  const { theme } = useTheme();

  let badgeBg = theme.brand + "20";
  let badgeText = theme.brand;
  if (badgeColor === "green") {
    badgeBg = theme.greenBg;
    badgeText = theme.green;
  } else if (badgeColor === "amber") {
    badgeBg = theme.amberBg;
    badgeText = theme.amber;
  } else if (badgeColor === "red") {
    badgeBg = theme.redBg;
    badgeText = theme.red;
  } else if (badgeColor === "blue") {
    badgeBg = theme.blueBg;
    badgeText = theme.blue;
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.badgeText, { color: badgeText }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginVertical: 2,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
