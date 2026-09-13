import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

interface HeaderBarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title = "ChaanBean",
  subtitle = "MSME Credit & Recovery",
  showBack = false,
  onBack,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.headerBg,
          borderBottomColor: theme.cardBorder,
        },
      ]}
    >
      <View style={styles.leftRow}>
        {showBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.logoIcon, { backgroundColor: theme.brand }]}>
            <Text style={styles.logoLetter}>CB</Text>
          </View>
        )}
        <View style={styles.titleContainer}>
          <Text style={[styles.brandTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.brandSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>

      <View style={styles.rightRow}>
        <View style={[styles.walletBadge, { backgroundColor: theme.brand + "18", borderColor: theme.brand + "40" }]}>
          <Ionicons name="wallet-outline" size={12} color={theme.brand} style={{ marginRight: 4 }} />
          <Text style={[styles.walletText, { color: theme.brand }]}>₹98,250</Text>
        </View>

        <TouchableOpacity
          onPress={toggleTheme}
          style={[
            styles.themeButton,
            {
              backgroundColor: theme.surfaceSecondary,
              borderColor: theme.cardBorder,
            },
          ]}
          accessibilityLabel="Toggle Theme"
        >
          <Ionicons
            name={isDark ? "sunny-outline" : "moon-outline"}
            size={18}
            color={isDark ? "#F59E0B" : "#6366F1"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backButton: {
    marginRight: 10,
    padding: 4,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  logoLetter: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  titleContainer: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: "500",
  },
  rightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  walletBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  walletText: {
    fontSize: 11,
    fontWeight: "800",
  },
  themeButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
