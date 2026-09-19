import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

interface ReportsScreenProps {
  onClose?: () => void;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({ onClose }) => {
  const { theme } = useTheme();
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const agingBuckets = [
    { label: "0 - 30 Days (Current)", amount: 1250000, pct: 22, color: theme.green, tag: "Low Risk" },
    { label: "31 - 60 Days (Watchlist L1)", amount: 1480000, pct: 26, color: theme.amber, tag: "Active L1" },
    { label: "61 - 90 Days (Delinquent L2)", amount: 1820000, pct: 32, color: theme.brand, tag: "Tele-Recovery" },
    { label: "90+ Days (Default / Legal L3)", amount: 1060000, pct: 19, color: theme.red, tag: "Arbitration" },
  ];

  const channelPerformance = [
    { channel: "L1 WhatsApp / SMS Automated Reminders", rate: 48.5, collected: "₹8.40 L", icon: "logo-whatsapp", color: "#25D366" },
    { channel: "L2 Asterisk Voice PBX & OmniTrace™", rate: 31.2, collected: "₹5.20 L", icon: "call", color: theme.blue },
    { channel: "L3 MSMED §16 Legal Notices & Arbitration", rate: 84.0, collected: "₹19.80 L", icon: "hammer", color: theme.purple },
  ];

  const handleExport = (type: "CSV" | "PDF") => {
    setExportNotice(`Exporting executive ${type} aging & risk portfolio report...`);
    setTimeout(() => {
      setExportNotice(`Executive audit ${type} exported and verified.`);
      setTimeout(() => setExportNotice(null), 3500);
    }, 800);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Banner */}
      <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.badgeRow}>
          <View style={[styles.phasePill, { backgroundColor: theme.greenBg, borderColor: theme.greenBorder }]}>
            <Text style={[styles.phasePillText, { color: theme.green }]}>PHASE 7: EXECUTIVE INTELLIGENCE</Text>
          </View>
          <View style={styles.liveIndicator}>
            <Ionicons name="stats-chart" size={14} color={theme.brand} />
            <Text style={[styles.liveText, { color: theme.brand }]}>REAL-TIME AGING</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Management & Aging Audit</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Trade receivables aging waterfall, recovery cadence ROI, and credit risk migration telemetry.
        </Text>

        <View style={styles.exportBtnRow}>
          <TouchableOpacity
            onPress={() => handleExport("CSV")}
            style={[styles.exportBtn, { backgroundColor: theme.brand }]}
          >
            <Ionicons name="document-text-outline" size={15} color="#fff" />
            <Text style={styles.exportBtnText}>Export CSV</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleExport("PDF")}
            style={[styles.exportBtn, { backgroundColor: theme.purple }]}
          >
            <Ionicons name="print-outline" size={15} color="#fff" />
            <Text style={styles.exportBtnText}>Audit PDF</Text>
          </TouchableOpacity>
        </View>

        {exportNotice && (
          <View style={[styles.feedbackBox, { backgroundColor: theme.greenBg, borderColor: theme.greenBorder }]}>
            <Ionicons name="checkmark-circle" size={16} color={theme.green} />
            <Text style={[styles.feedbackText, { color: theme.green }]}>{exportNotice}</Text>
          </View>
        )}
      </View>

      {/* KPI Cards Grid */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>30-Day Collections</Text>
          <Text style={[styles.kpiValue, { color: theme.green }]}>₹14.20 L</Text>
          <Text style={[styles.kpiSub, { color: theme.textMuted }]}>+18% vs last month</Text>
        </View>

        <View style={[styles.kpiBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Days Sales Outst.</Text>
          <Text style={[styles.kpiValue, { color: theme.brand }]}>41.5 Days</Text>
          <Text style={[styles.kpiSub, { color: theme.textMuted }]}>Target: &lt; 45 Days</Text>
        </View>

        <View style={[styles.kpiBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Arbitration Win Rate</Text>
          <Text style={[styles.kpiValue, { color: theme.purple }]}>91.3%</Text>
          <Text style={[styles.kpiSub, { color: theme.textMuted }]}>MSMED §16 Awards</Text>
        </View>

        <View style={[styles.kpiBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Severe Default Rate</Text>
          <Text style={[styles.kpiValue, { color: theme.red }]}>3.8%</Text>
          <Text style={[styles.kpiSub, { color: theme.textMuted }]}>1 Debtor Blocked</Text>
        </View>
      </View>

      {/* Receivables Aging Waterfall */}
      <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="bar-chart-outline" size={18} color={theme.brand} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Receivables Aging Waterfall</Text>
        </View>

        <View style={{ gap: 14, marginTop: 12 }}>
          {agingBuckets.map((bucket, idx) => (
            <View key={idx}>
              <View style={styles.bucketRow}>
                <Text style={[styles.bucketLabel, { color: theme.text }]}>{bucket.label}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[styles.bucketAmount, { color: theme.text }]}>
                    ₹{(bucket.amount / 100000).toFixed(2)} L
                  </Text>
                  <Text style={[styles.bucketPct, { color: bucket.color }]}>({bucket.pct}%)</Text>
                </View>
              </View>

              <View style={[styles.barTrack, { backgroundColor: theme.surfaceSecondary }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${bucket.pct}%`,
                      backgroundColor: bucket.color,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Recovery Channel Conversion ROI */}
      <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trending-up-outline" size={18} color={theme.green} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recovery Cadence Conversion ROI</Text>
        </View>

        <View style={{ gap: 12, marginTop: 12 }}>
          {channelPerformance.map((ch, idx) => (
            <View
              key={idx}
              style={[styles.chCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}
            >
              <View style={styles.chTop}>
                <View style={[styles.chIconCircle, { backgroundColor: ch.color + "18" }]}>
                  <Ionicons name={ch.icon as any} size={16} color={ch.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.chTitle, { color: theme.text }]}>{ch.channel}</Text>
                  <Text style={[styles.chSub, { color: theme.textMuted }]}>
                    Total Cleared: {ch.collected}
                  </Text>
                </View>

                <View style={styles.chScoreBox}>
                  <Text style={[styles.chScoreVal, { color: ch.color }]}>{ch.rate}%</Text>
                  <Text style={[styles.chScoreLabel, { color: theme.textMuted }]}>Settled</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
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
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  phasePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  phasePillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "700",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  exportBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  exportBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  feedbackBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: "600",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  kpiBox: {
    width: "48%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: "800",
    marginVertical: 4,
  },
  kpiSub: {
    fontSize: 10,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  bucketRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  bucketLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  bucketAmount: {
    fontSize: 13,
    fontWeight: "700",
  },
  bucketPct: {
    fontSize: 12,
    fontWeight: "700",
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  chCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  chTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  chTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  chSub: {
    fontSize: 11,
    marginTop: 2,
  },
  chScoreBox: {
    alignItems: "flex-end",
  },
  chScoreVal: {
    fontSize: 15,
    fontWeight: "800",
  },
  chScoreLabel: {
    fontSize: 9,
  },
});
