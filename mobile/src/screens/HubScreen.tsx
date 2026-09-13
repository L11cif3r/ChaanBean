import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

interface HubScreenProps {
  onSelectSubscreen: (id: string) => void;
}

export const HubScreen: React.FC<HubScreenProps> = ({ onSelectSubscreen }) => {
  const { theme } = useTheme();

  const hubItems = [
    {
      id: "subscription",
      title: "Subscription & Enterprise Tiers",
      subtitle: "3-tier plans (Starter, Growth, Enterprise), add-on seats & payment gateway",
      icon: "card",
      color: theme.brand,
      badge: "Mandatory Gateway",
    },
    {
      id: "debtors",
      title: "Debtors Portfolio & Risk Underwriting",
      subtitle: "Green/Amber/Red counterparty risk flags, exposure limits & radar breakdown",
      icon: "people",
      color: theme.brand,
      badge: "Portfolio Risk",
    },
    {
      id: "business-check",
      title: "Financial Intelligence & Documents",
      subtitle: "12-section financial dossiers, 4-year trend analysis & side-by-side comparison",
      icon: "business",
      color: theme.blue,
      badge: "12 Sections",
    },
    {
      id: "arbitration",
      title: "Statutory Arbitration Center",
      subtitle: "MSMED Act 2006 §16 compound interest (20.25% p.a.), claim drafts & Aadhaar e-Sign",
      icon: "hammer",
      color: theme.red,
      badge: "20.25% p.a.",
    },
    {
      id: "trust-hub",
      title: "Trust Hub & Community Blacklist",
      subtitle: "Digital Trust ID passport (0-1000 score), compliance badges & peer defaults",
      icon: "shield-checkmark",
      color: theme.green,
      badge: "Trust Passport",
    },
    {
      id: "admin-os",
      title: "Owner / Admin Executive OS",
      subtitle: "7-Stage CRM Kanban, Ad ROI intelligence (Leads vs Wins), & MRR waterfall",
      icon: "stats-chart",
      color: theme.purple,
      badge: "Executive Desk",
    },
    {
      id: "settings",
      title: "Platform Settings & Health",
      subtitle: "Obsidian Dark / Light theme toggle, backend modes & 11 gateway health telemetry",
      icon: "settings",
      color: theme.amber,
      badge: "11 Adapters",
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.heroTitle, { color: theme.text }]}>Platform Navigation Hub</Text>
        <Text style={[styles.heroDesc, { color: theme.textSecondary }]}>
          Access specialized modules: Debtors underwriting, Financial intelligence, Arbitration council, Trust Hub, and Admin OS.
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        {hubItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => onSelectSubscreen(item.id)}
            style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <View style={styles.itemRow}>
              <View style={[styles.iconCircle, { backgroundColor: item.color + "18" }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>{item.title}</Text>
                  <View style={[styles.badge, { backgroundColor: item.color + "18" }]}>
                    <Text style={[styles.badgeText, { color: item.color }]}>{item.badge}</Text>
                  </View>
                </View>
                <Text style={[styles.itemSub, { color: theme.textMuted }]}>{item.subtitle}</Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} style={{ marginLeft: 8 }} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  heroDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  itemCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "800",
    flex: 1,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  itemSub: {
    fontSize: 11,
    lineHeight: 15,
  },
});
