import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { MetricCard } from "../components/MetricCard";
import { RiskBadge } from "../components/RiskBadge";
import { EVIDENCE_LOGS, INITIAL_BUYERS } from "../services/dataStore";
import { TabKey } from "../components/BottomTabBar";

interface HomeScreenProps {
  onNavigateTab: (tab: TabKey) => void;
  onOpenHubSubscreen: (screenId: string) => void;
  onSelectBuyer: (buyerId: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateTab,
  onOpenHubSubscreen,
  onSelectBuyer,
}) => {
  const { theme } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Hero Welcome & Status */}
      <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>Enterprise Command Desk</Text>
            <Text style={[styles.companyTitle, { color: theme.text }]}>Acme Traders Pvt Ltd</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: theme.greenBg, borderColor: theme.greenBorder }]}>
            <View style={[styles.statusDot, { backgroundColor: theme.green }]} />
            <Text style={[styles.statusText, { color: theme.green }]}>11 Adapters Active</Text>
          </View>
        </View>

        <Text style={[styles.heroSummary, { color: theme.textMuted }]}>
          Real-time trade receivables monitoring · Deterministic Green/Amber/Red underwriting · TRAI-compliant tele-recovery
        </Text>
      </View>

      {/* Financial KPIs */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCol}>
          <MetricCard
            label="Monitored Receivables"
            value="₹56.10 L"
            subtitle="4 Active Counterparties"
            badge="PORTFOLIO"
            badgeColor="brand"
          />
        </View>
        <View style={styles.kpiCol}>
          <MetricCard
            label="Overdue Receivables"
            value="₹38.10 L"
            subtitle="Immediate Action Needed"
            badge="OVERDUE"
            badgeColor="red"
          />
        </View>
      </View>

      {/* Credit Risk Flag Radar */}
      <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="pie-chart-outline" size={18} color={theme.brand} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Deterministic Credit Risk Radar</Text>
          </View>
          <TouchableOpacity onPress={() => onOpenHubSubscreen("debtors")}>
            <Text style={[styles.viewAllText, { color: theme.brand }]}>View All →</Text>
          </TouchableOpacity>
        </View>

        {/* 3 Risk Tiers */}
        <View style={styles.radarRow}>
          <View style={[styles.radarBox, { backgroundColor: theme.greenBg, borderColor: theme.greenBorder }]}>
            <Text style={[styles.radarCount, { color: theme.green }]}>1</Text>
            <Text style={[styles.radarLabel, { color: theme.green }]}>GREEN TIER</Text>
            <Text style={[styles.radarSub, { color: theme.textMuted }]}>₹3.8L · Low Risk</Text>
          </View>

          <View style={[styles.radarBox, { backgroundColor: theme.amberBg, borderColor: theme.amberBorder }]}>
            <Text style={[styles.radarCount, { color: theme.amber }]}>2</Text>
            <Text style={[styles.radarLabel, { color: theme.amber }]}>AMBER TIER</Text>
            <Text style={[styles.radarSub, { color: theme.textMuted }]}>₹23.8L · Watchlist</Text>
          </View>

          <View style={[styles.radarBox, { backgroundColor: theme.redBg, borderColor: theme.redBorder }]}>
            <Text style={[styles.radarCount, { color: theme.red }]}>1</Text>
            <Text style={[styles.radarLabel, { color: theme.red }]}>RED TIER</Text>
            <Text style={[styles.radarSub, { color: theme.textMuted }]}>₹28.5L · Default</Text>
          </View>
        </View>

        {/* Priority Attention Debtor */}
        <TouchableOpacity
          onPress={() => onSelectBuyer("buyer-1")}
          style={[styles.debtorAlertCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.redBorder }]}
        >
          <View style={styles.debtorAlertTop}>
            <View>
              <Text style={[styles.debtorName, { color: theme.text }]}>Metro Supplies Co</Text>
              <Text style={[styles.debtorOverdue, { color: theme.red }]}>
                ₹28,50,000 · 89 Days Overdue · Level 3
              </Text>
            </View>
            <RiskBadge flag="red" score={32} size="sm" />
          </View>
          <Text style={[styles.debtorActionNote, { color: theme.textSecondary }]}>
            Reason: 4 Section 138 NI Act litigation suits detected. Telephony recovery cadence active.
          </Text>
        </TouchableOpacity>
      </View>

      {/* Fast Action Shortcuts */}
      <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>QUICK WORKFLOW ACTIONS</Text>
      <View style={styles.actionGrid}>
        <TouchableOpacity
          onPress={() => onNavigateTab("verify")}
          style={[styles.actionBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: theme.brand + "18" }]}>
            <Ionicons name="shield-checkmark" size={20} color={theme.brand} />
          </View>
          <Text style={[styles.actionBtnTitle, { color: theme.text }]}>18 Statutory Adapters</Text>
          <Text style={[styles.actionBtnSub, { color: theme.textMuted }]}>GST, DIN, Udyam, Marksheets</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onNavigateTab("trace")}
          style={[styles.actionBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: theme.blueBg }]}>
            <Ionicons name="search" size={20} color={theme.blue} />
          </View>
          <Text style={[styles.actionBtnTitle, { color: theme.text }]}>OmniTrace 360™</Text>
          <Text style={[styles.actionBtnSub, { color: theme.textMuted }]}>9 Vectors Skip-Tracing</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onNavigateTab("recovery")}
          style={[styles.actionBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: theme.redBg }]}>
            <Ionicons name="call" size={20} color={theme.red} />
          </View>
          <Text style={[styles.actionBtnTitle, { color: theme.text }]}>Tele-Recovery Desk</Text>
          <Text style={[styles.actionBtnSub, { color: theme.textMuted }]}>CALL All Time & Asterisk DID</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onOpenHubSubscreen("arbitration")}
          style={[styles.actionBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: theme.amberBg }]}>
            <Ionicons name="hammer" size={20} color={theme.amber} />
          </View>
          <Text style={[styles.actionBtnTitle, { color: theme.text }]}>Arbitration 20.25%</Text>
          <Text style={[styles.actionBtnSub, { color: theme.textMuted }]}>MSMED Act §16 Claims</Text>
        </TouchableOpacity>
      </View>

      {/* Section 65B Digital Evidence Feed */}
      <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, marginBottom: 30 }]}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="lock-closed-outline" size={18} color={theme.green} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Section 65B Digital Evidence Log</Text>
          </View>
          <View style={[styles.secPill, { backgroundColor: theme.greenBg, borderColor: theme.greenBorder }]}>
            <Text style={[styles.secPillText, { color: theme.green }]}>SHA-256 SEALS</Text>
          </View>
        </View>

        {EVIDENCE_LOGS.map((ev) => (
          <View
            key={ev.id}
            style={[styles.evCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}
          >
            <View style={styles.evTop}>
              <Text style={[styles.evType, { color: theme.text }]}>{ev.type}</Text>
              <Text style={[styles.evTime, { color: theme.textMuted }]}>{ev.deliveredAt}</Text>
            </View>
            <Text style={[styles.evTarget, { color: theme.brand }]}>{ev.target}</Text>
            <View style={styles.evHashRow}>
              <Text style={[styles.evHash, { color: theme.textMuted }]} numberOfLines={1}>
                {ev.hash}
              </Text>
            </View>
            <Text style={[styles.evGov, { color: theme.blue }]}>Gov Ack: {ev.govAck}</Text>
          </View>
        ))}
      </View>
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
    marginBottom: 16,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  greeting: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  companyTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  heroSummary: {
    fontSize: 11,
    lineHeight: 16,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 6,
  },
  kpiCol: {
    flex: 1,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "700",
  },
  radarRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  radarBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
  },
  radarCount: {
    fontSize: 20,
    fontWeight: "900",
  },
  radarLabel: {
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
  },
  radarSub: {
    fontSize: 9,
    marginTop: 2,
  },
  debtorAlertCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  debtorAlertTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  debtorName: {
    fontSize: 14,
    fontWeight: "700",
  },
  debtorOverdue: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  debtorActionNote: {
    fontSize: 11,
    lineHeight: 15,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  actionBtn: {
    width: "48%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionBtnTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  actionBtnSub: {
    fontSize: 10,
    marginTop: 2,
  },
  secPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  secPillText: {
    fontSize: 9,
    fontWeight: "800",
  },
  evCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  evTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  evType: {
    fontSize: 12,
    fontWeight: "700",
  },
  evTime: {
    fontSize: 10,
  },
  evTarget: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  evHashRow: {
    marginBottom: 2,
  },
  evHash: {
    fontSize: 9,
    fontFamily: "monospace",
  },
  evGov: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
});
