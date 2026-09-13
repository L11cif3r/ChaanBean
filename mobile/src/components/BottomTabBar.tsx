import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

export type TabKey = "home" | "verify" | "trace" | "recovery" | "more";

interface BottomTabBarProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ currentTab, onSelectTab }) => {
  const { theme } = useTheme();

  const tabs: Array<{ key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }> = [
    { key: "home", label: "Command", icon: "grid-outline", activeIcon: "grid" },
    { key: "verify", label: "Verify (18)", icon: "shield-checkmark-outline", activeIcon: "shield-checkmark" },
    { key: "trace", label: "OmniTrace", icon: "search-outline", activeIcon: "search" },
    { key: "recovery", label: "Recovery", icon: "call-outline", activeIcon: "call" },
    { key: "more", label: "Hub", icon: "ellipsis-horizontal-circle-outline", activeIcon: "ellipsis-horizontal-circle" },
  ];

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.tabBarBg,
          borderTopColor: theme.tabBarBorder,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = currentTab === tab.key;
        const iconName = isActive ? tab.activeIcon : tab.icon;
        const color = isActive ? theme.brand : theme.textMuted;

        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onSelectTab(tab.key)}
            style={styles.tabButton}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
          >
            <Ionicons name={iconName} size={22} color={color} />
            <Text style={[styles.tabLabel, { color }, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {isActive && <View style={[styles.activeIndicator, { backgroundColor: theme.brand }]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    height: 62,
    borderTopWidth: 1,
    paddingBottom: 6,
    paddingTop: 6,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  tabLabelActive: {
    fontWeight: "800",
  },
  activeIndicator: {
    width: 16,
    height: 3,
    borderRadius: 2,
    position: "absolute",
    top: -6,
  },
});
