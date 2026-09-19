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
import {
  INITIAL_MONITORED_ACCOUNTS,
  INITIAL_RISK_ALERTS,
  MonitoredAccount,
  RiskAlert,
} from "../services/dataStore";
import { RiskBadge } from "../components/RiskBadge";

interface MonitoringScreenProps {
  onClose?: () => void;
  onSelectBuyer?: (buyerId: string) => void;
}

export const MonitoringScreen: React.FC<MonitoringScreenProps> = ({
  onClose,
  onSelectBuyer,
}) => {
  const { theme } = useTheme();
  const [accounts, setAccounts] = useState<MonitoredAccount[]>(
    INITIAL_MONITORED_ACCOUNTS
  );
  const [alerts, setAlerts] = useState<RiskAlert[]>(INITIAL_RISK_ALERTS);
  const [activeTab, setActiveTab] = useState<"accounts" | "alerts">("accounts");
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Totals calculation
  const totalExposure = accounts.reduce((acc, a) => acc + a.currentExposure, 0);
  const totalOverdue = accounts.reduce((acc, a) => acc + a.overdueAmount, 0);
  const totalLimit = accounts.reduce((acc, a) => acc + a.creditLimit, 0);
  const utilizationPct = totalLimit > 0 ? Math.round((totalExposure / totalLimit) * 100) : 0;
  const accountsOnHold = accounts.filter((a) => a.status === "ON_HOLD").length;

  const handleToggleHold = (accountId: string) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === accountId) {
          const newStatus = acc.status === "ACTIVE" ? "ON_HOLD" : "ACTIVE";
          return {
            ...acc,
            status: newStatus,
          };
        }
        return acc;
      })
    );
  };

  const handleUpdateAlertStatus = (alertId: string, newStatus: "acknowledged" | "resolved") => {
    setAlerts((prev) =>
      prev.map((alt) => (alt.id === alertId ? { ...alt, status: newStatus } : alt))
    );
  };

  const handleExportCSV = () => {
    setExportFeedback("Exporting credit monitoring audit CSV...");
    setTimeout(() => {
      setExportFeedback("Audit report saved to local device downloads (CSV format).");
      setTimeout(() => setExportFeedback(null), 3500);
    }, 800);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Banner */}
      <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.badgeRow}>
          <View style={[styles.phasePill, { backgroundColor: theme.amberBg, borderColor: theme.amberBorder }]}>
            <Text style={[styles.phasePillText, { color: theme.amber }]}>PHASE 3: CONTINUOUS RADAR</Text>
          </View>
          <View style={styles.liveIndicator}>
            <View style={[styles.pulsingDot, { backgroundColor: theme.green }]} />
            <Text style={[styles.liveText, { color: theme.green }]}>LIVE EWS ACTIVE</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Post-Credit Security Radar</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Real-time exposure tracking, early default warnings (EWS), and automated credit limit holds.
        </Text>

        <View style={styles.headerBtnRow}>
          <TouchableOpacity
            onPress={handleExportCSV}
            style={[styles.exportBtn, { backgroundColor: theme.brand }]}
          >
            <Ionicons name="download-outline" size={16} color="#fff" />
            <Text style={styles.exportBtnText}>Export Audit (CSV)</Text>
          </TouchableOpacity>
        </View>

        {exportFeedback && (
          <View style={[styles.feedbackBox, { backgroundColor: theme.greenBg, borderColor: theme.greenBorder }]}>
            <Ionicons name="checkmark-circle" size={16} color={theme.green} />
            <Text style={[styles.feedbackText, { color: theme.green }]}>{exportFeedback}</Text>
          </View>
        )}
      </View>

      {/* KPI Cards Grid */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Total Exposure</Text>
          <Text style={[styles.kpiValue, { color: theme.brand }]}>
            ₹{(totalExposure / 100000).toFixed(2)} L
          </Text>
          <Text style={[styles.kpiSub, { color: theme.textMuted }]}>Across 4 accounts</Text>
        </View>

        <View style={[styles.kpiBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Overdue Receivables</Text>
          <Text style={[styles.kpiValue, { color: theme.red }]}>
            ₹{(totalOverdue / 100000).toFixed(2)} L
          </Text>
          <Text style={[styles.kpiSub, { color: theme.textMuted }]}>
            {Math.round((totalOverdue / totalExposure) * 100)}% of exposure
          </Text>
        </View>

        <View style={[styles.kpiBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Portfolio Utilization</Text>
            <Text style={[styles.kpiPillText, { color: theme.amber }]}>{utilizationPct}%</Text>
          </View>
          <Text style={[styles.kpiValue, { color: theme.text }]}>{utilizationPct}%</Text>
          <View style={[styles.progBarTrack, { backgroundColor: theme.surfaceSecondary }]}>
            <View
              style={[
                styles.progBarFill,
                {
                  width: `${Math.min(utilizationPct, 100)}%`,
                  backgroundColor: utilizationPct > 80 ? theme.red : theme.amber,
                },
              ]}
            />
          </View>
        </View>

        <View style={[styles.kpiBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Credit Holds</Text>
          <Text style={[styles.kpiValue, { color: theme.red }]}>{accountsOnHold}</Text>
          <Text style={[styles.kpiSub, { color: theme.red }]}>Further billing blocked</Text>
        </View>
      </View>

      {/* Segmented Switcher */}
      <View style={[styles.tabSelector, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}>
        <TouchableOpacity
          onPress={() => setActiveTab("accounts")}
          style={[
            styles.tabItem,
            activeTab === "accounts" && { backgroundColor: theme.card, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 3 },
          ]}
        >
          <Ionicons
            name="layers-outline"
            size={16}
            color={activeTab === "accounts" ? theme.brand : theme.textMuted}
          />
          <Text
            style={[
              styles.tabItemText,
              { color: activeTab === "accounts" ? theme.text : theme.textMuted },
            ]}
          >
            Accounts ({accounts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("alerts")}
          style={[
            styles.tabItem,
            activeTab === "alerts" && { backgroundColor: theme.card, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 3 },
          ]}
        >
          <Ionicons
            name="warning-outline"
            size={16}
            color={activeTab === "alerts" ? theme.red : theme.textMuted}
          />
          <Text
            style={[
              styles.tabItemText,
              { color: activeTab === "alerts" ? theme.text : theme.textMuted },
            ]}
          >
            Risk Alerts ({alerts.filter((a) => a.status === "open").length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab 1: Monitored Counterparties */}
      {activeTab === "accounts" && (
        <View style={{ gap: 12, marginBottom: 30 }}>
          {accounts.map((acc) => {
            const isHold = acc.status === "ON_HOLD";
            return (
              <View
                key={acc.id}
                style={[
                  styles.accountCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: isHold ? theme.redBorder : theme.cardBorder,
                  },
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={[styles.accountName, { color: theme.text }]}>{acc.buyerName}</Text>
                      <RiskBadge flag={acc.riskFlag} size="sm" />
                    </View>
                    <Text style={[styles.accountSub, { color: theme.textMuted }]}>
                      Checked: {acc.lastChecked}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.holdStatusPill,
                      {
                        backgroundColor: isHold ? theme.redBg : theme.greenBg,
                        borderColor: isHold ? theme.redBorder : theme.greenBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isHold ? "lock-closed" : "checkmark-circle"}
                      size={12}
                      color={isHold ? theme.red : theme.green}
                    />
                    <Text
                      style={[
                        styles.holdStatusText,
                        { color: isHold ? theme.red : theme.green },
                      ]}
                    >
                      {isHold ? "CREDIT HOLD" : "ACTIVE"}
                    </Text>
                  </View>
                </View>

                {/* Metrics row */}
                <View style={styles.accMetricsRow}>
                  <View style={styles.accMetricItem}>
                    <Text style={[styles.accMetricLabel, { color: theme.textMuted }]}>Limit</Text>
                    <Text style={[styles.accMetricVal, { color: theme.text }]}>
                      ₹{(acc.creditLimit / 100000).toFixed(1)}L
                    </Text>
                  </View>
                  <View style={styles.accMetricItem}>
                    <Text style={[styles.accMetricLabel, { color: theme.textMuted }]}>Exposure</Text>
                    <Text style={[styles.accMetricVal, { color: theme.brand }]}>
                      ₹{(acc.currentExposure / 100000).toFixed(2)}L
                    </Text>
                  </View>
                  <View style={styles.accMetricItem}>
                    <Text style={[styles.accMetricLabel, { color: theme.textMuted }]}>Overdue</Text>
                    <Text
                      style={[
                        styles.accMetricVal,
                        { color: acc.overdueAmount > 0 ? theme.red : theme.green },
                      ]}
                    >
                      ₹{(acc.overdueAmount / 100000).toFixed(2)}L
                    </Text>
                  </View>
                </View>

                {/* Utilization meter */}
                <View style={{ marginTop: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={[styles.utilText, { color: theme.textMuted }]}>Utilization</Text>
                    <Text style={[styles.utilText, { color: acc.utilizationPct > 80 ? theme.red : theme.textSecondary }]}>
                      {acc.utilizationPct}%
                    </Text>
                  </View>
                  <View style={[styles.progBarTrack, { backgroundColor: theme.surfaceSecondary }]}>
                    <View
                      style={[
                        styles.progBarFill,
                        {
                          width: `${Math.min(acc.utilizationPct, 100)}%`,
                          backgroundColor:
                            acc.utilizationPct > 80
                              ? theme.red
                              : acc.utilizationPct > 40
                              ? theme.amber
                              : theme.green,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Hold Action Button */}
                <View style={styles.actionBtnRow}>
                  <TouchableOpacity
                    onPress={() => handleToggleHold(acc.id)}
                    style={[
                      styles.toggleHoldBtn,
                      {
                        backgroundColor: isHold ? theme.greenBg : theme.redBg,
                        borderColor: isHold ? theme.greenBorder : theme.redBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isHold ? "key-outline" : "lock-closed-outline"}
                      size={15}
                      color={isHold ? theme.green : theme.red}
                    />
                    <Text
                      style={[
                        styles.toggleHoldBtnText,
                        { color: isHold ? theme.green : theme.red },
                      ]}
                    >
                      {isHold ? "Revoke Hold & Unblock" : "Enforce Credit Hold"}
                    </Text>
                  </TouchableOpacity>

                  {onSelectBuyer && (
                    <TouchableOpacity
                      onPress={() => onSelectBuyer(acc.buyerId)}
                      style={[styles.profileBtn, { borderColor: theme.cardBorder }]}
                    >
                      <Text style={[styles.profileBtnText, { color: theme.textSecondary }]}>
                        Underwriting →
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Tab 2: Early Warning Signals (EWS) Alerts */}
      {activeTab === "alerts" && (
        <View style={{ gap: 12, marginBottom: 30 }}>
          {alerts.map((alt) => {
            const isCrit = alt.severity === "critical";
            const isHigh = alt.severity === "high";
            const sevColor = isCrit ? theme.red : isHigh ? theme.amber : theme.blue;
            const sevBg = isCrit ? theme.redBg : isHigh ? theme.amberBg : theme.blueBg;
            const sevBorder = isCrit ? theme.redBorder : isHigh ? theme.amberBorder : theme.blueBorder;

            return (
              <View
                key={alt.id}
                style={[
                  styles.alertCard,
                  { backgroundColor: theme.card, borderColor: sevBorder },
                ]}
              >
                <View style={styles.alertTopRow}>
                  <View style={[styles.sevBadge, { backgroundColor: sevBg, borderColor: sevBorder }]}>
                    <Text style={[styles.sevText, { color: sevColor }]}>
                      {alt.severity.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.alertDate, { color: theme.textMuted }]}>{alt.createdAt}</Text>
                </View>

                <Text style={[styles.alertTitle, { color: theme.text }]}>{alt.title}</Text>
                <Text style={[styles.alertDesc, { color: theme.textSecondary }]}>{alt.description}</Text>

                <View style={styles.alertFooter}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="business-outline" size={14} color={theme.textMuted} />
                    <Text style={[styles.buyerTag, { color: theme.textMuted }]}>{alt.buyerName}</Text>
                  </View>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {alt.status === "open" && (
                      <TouchableOpacity
                        onPress={() => handleUpdateAlertStatus(alt.id, "acknowledged")}
                        style={[styles.smallActionBtn, { borderColor: theme.cardBorder }]}
                      >
                        <Text style={[styles.smallActionText, { color: theme.textSecondary }]}>
                          Acknowledge
                        </Text>
                      </TouchableOpacity>
                    )}
                    {alt.status !== "resolved" ? (
                      <TouchableOpacity
                        onPress={() => handleUpdateAlertStatus(alt.id, "resolved")}
                        style={[styles.smallActionBtn, { backgroundColor: theme.greenBg, borderColor: theme.greenBorder }]}
                      >
                        <Text style={[styles.smallActionText, { color: theme.green }]}>
                          Resolve
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="checkmark-circle" size={14} color={theme.green} />
                        <Text style={[styles.resolvedText, { color: theme.green }]}>Resolved</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

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
    gap: 6,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  headerBtnRow: {
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
  kpiPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  progBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 4,
  },
  progBarFill: {
    height: 6,
    borderRadius: 3,
  },
  tabSelector: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabItemText: {
    fontSize: 12,
    fontWeight: "700",
  },
  accountCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  accountName: {
    fontSize: 15,
    fontWeight: "700",
  },
  accountSub: {
    fontSize: 11,
    marginTop: 2,
  },
  holdStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  holdStatusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  accMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#ffffff10",
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff10",
  },
  accMetricItem: {
    alignItems: "center",
  },
  accMetricLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  accMetricVal: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  utilText: {
    fontSize: 10,
    fontWeight: "600",
  },
  actionBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  toggleHoldBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleHoldBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  profileBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
  alertCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  alertTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  sevBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  sevText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  alertDate: {
    fontSize: 10,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  alertDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  alertFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#ffffff10",
  },
  buyerTag: {
    fontSize: 11,
    fontWeight: "600",
  },
  smallActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  smallActionText: {
    fontSize: 11,
    fontWeight: "700",
  },
  resolvedText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
