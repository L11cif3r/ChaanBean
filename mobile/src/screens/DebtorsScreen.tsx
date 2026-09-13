import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { INITIAL_BUYERS, BuyerDebtor } from "../services/dataStore";
import { RiskBadge } from "../components/RiskBadge";

interface DebtorsScreenProps {
  initialBuyerId?: string;
  onClose?: () => void;
}

export const DebtorsScreen: React.FC<DebtorsScreenProps> = ({ initialBuyerId, onClose }) => {
  const { theme } = useTheme();
  const [search, setSearch] = useState<string>("");
  const [filterFlag, setFilterFlag] = useState<"all" | "green" | "amber" | "red">("all");
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerDebtor | null>(
    initialBuyerId ? INITIAL_BUYERS.find((b) => b.id === initialBuyerId) || null : null
  );

  const filtered = INITIAL_BUYERS.filter((b) => {
    const matchSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.pan.toLowerCase().includes(search.toLowerCase()) ||
      b.gstin.toLowerCase().includes(search.toLowerCase());
    const matchFlag = filterFlag === "all" || b.flag === filterFlag;
    return matchSearch && matchFlag;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Bar if modal */}
      {onClose && (
        <View style={[styles.modalBar, { borderBottomColor: theme.cardBorder }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
            <Text style={[styles.backText, { color: theme.text }]}>Back to Command</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Header */}
      <View style={styles.headerArea}>
        <Text style={[styles.pageTitle, { color: theme.text }]}>Debtors & Credit Risk Portfolio</Text>
        <Text style={[styles.pageSub, { color: theme.textMuted }]}>
          Counterparty underwriting · Green/Amber/Red risk badges · Recommended exposure limits
        </Text>
      </View>

      {/* Search and Filters */}
      <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Ionicons name="search" size={16} color={theme.brand} style={{ marginRight: 8 }} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search debtor name, PAN, or GSTIN..."
          placeholderTextColor={theme.textMuted}
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      <View style={styles.filterRow}>
        {(["all", "green", "amber", "red"] as const).map((flag) => {
          const isSel = filterFlag === flag;
          return (
            <TouchableOpacity
              key={flag}
              onPress={() => setFilterFlag(flag)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isSel ? theme.brand : theme.card,
                  borderColor: isSel ? theme.brand : theme.cardBorder,
                },
              ]}
            >
              <Text style={[styles.filterChipText, { color: isSel ? "#FFFFFF" : theme.textSecondary }]}>
                {flag.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Debtors List */}
      <ScrollView style={styles.listArea}>
        {filtered.map((b) => (
          <TouchableOpacity
            key={b.id}
            onPress={() => setSelectedBuyer(b)}
            style={[styles.buyerRowCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <View style={styles.buyerRowTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: theme.text }]}>{b.name}</Text>
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  PAN: {b.pan} · GSTIN: {b.gstin}
                </Text>
              </View>
              <RiskBadge flag={b.flag} score={b.compositeScore} size="sm" />
            </View>

            <View style={styles.divider} />

            <View style={styles.statsRow}>
              <View>
                <Text style={[styles.statKey, { color: theme.textMuted }]}>Outstanding</Text>
                <Text style={[styles.statVal, { color: b.flag === "red" ? theme.red : theme.text }]}>
                  ₹{(b.outstandingAmount / 100000).toFixed(2)} Lakhs
                </Text>
              </View>

              <View>
                <Text style={[styles.statKey, { color: theme.textMuted }]}>Credit Limit</Text>
                <Text style={[styles.statVal, { color: theme.brand }]}>
                  ₹{(b.creditLimit / 100000).toFixed(2)} Lakhs
                </Text>
              </View>

              <View>
                <Text style={[styles.statKey, { color: theme.textMuted }]}>Tenor</Text>
                <Text style={[styles.statVal, { color: theme.text }]}>{b.tenorDays} Days</Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} style={{ alignSelf: "center" }} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Detailed Buyer Dossier Modal */}
      {selectedBuyer && (
        <Modal visible={!!selectedBuyer} transparent animationType="slide" onRequestClose={() => setSelectedBuyer(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.dossierSheet, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              {/* Dossier Header */}
              <View style={styles.dossierHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dossierTitle, { color: theme.text }]}>{selectedBuyer.name}</Text>
                  <Text style={[styles.dossierSub, { color: theme.textMuted }]}>
                    Contact: {selectedBuyer.contactPerson} · {selectedBuyer.phone}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedBuyer(null)}>
                  <Ionicons name="close" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.dossierScroll}>
                {/* Risk Score and Badge */}
                <View style={[styles.riskSummaryBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <View style={styles.riskSummaryRow}>
                    <View>
                      <Text style={[styles.boxLabel, { color: theme.textMuted }]}>COMPOSITE RISK FLAG</Text>
                      <View style={{ marginTop: 4 }}>
                        <RiskBadge flag={selectedBuyer.flag} score={selectedBuyer.compositeScore} />
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[styles.boxLabel, { color: theme.textMuted }]}>APPROVED CREDIT TENOR</Text>
                      <Text style={[styles.tenorBig, { color: theme.brand }]}>
                        {selectedBuyer.flag === "red" ? "Blocked (0 Days)" : `${selectedBuyer.tenorDays} Days Tenor`}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 4 Radar Signals Breakdown */}
                <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                  DETERMINISTIC UNDERWRITING SIGNALS
                </Text>

                <View style={[styles.signalsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <View style={styles.signalRow}>
                    <Text style={[styles.sigLabel, { color: theme.text }]}>GSTN Turnover Consistency</Text>
                    <Text style={[styles.sigVal, { color: theme.green }]}>
                      {selectedBuyer.signals.turnoverConsistency}% On-Time
                    </Text>
                  </View>

                  <View style={styles.signalRow}>
                    <Text style={[styles.sigLabel, { color: theme.text }]}>Debt-to-Equity Ratio</Text>
                    <Text
                      style={[
                        styles.sigVal,
                        { color: selectedBuyer.signals.debtToEquity > 2.5 ? theme.red : theme.text },
                      ]}
                    >
                      {selectedBuyer.signals.debtToEquity}x Leverage
                    </Text>
                  </View>

                  <View style={styles.signalRow}>
                    <Text style={[styles.sigLabel, { color: theme.text }]}>Section 138 NI Act Cases</Text>
                    <Text
                      style={[
                        styles.sigVal,
                        { color: selectedBuyer.signals.litigationCount > 0 ? theme.red : theme.green },
                      ]}
                    >
                      {selectedBuyer.signals.litigationCount} Active Suits
                    </Text>
                  </View>

                  <View style={[styles.signalRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.sigLabel, { color: theme.text }]}>Public Compliance Score</Text>
                    <Text style={[styles.sigVal, { color: theme.brand }]}>
                      {selectedBuyer.signals.complianceScore}/100
                    </Text>
                  </View>
                </View>

                {/* Recommendation Audit Trail */}
                <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                  CREDIT EXPOSURE RECOMMENDATION
                </Text>
                <View
                  style={[
                    styles.recBox,
                    {
                      backgroundColor:
                        selectedBuyer.flag === "red"
                          ? theme.redBg
                          : selectedBuyer.flag === "amber"
                          ? theme.amberBg
                          : theme.greenBg,
                      borderColor:
                        selectedBuyer.flag === "red"
                          ? theme.redBorder
                          : selectedBuyer.flag === "amber"
                          ? theme.amberBorder
                          : theme.greenBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.recTitle,
                      {
                        color:
                          selectedBuyer.flag === "red"
                            ? theme.red
                            : selectedBuyer.flag === "amber"
                            ? theme.amber
                            : theme.green,
                      },
                    ]}
                  >
                    Recommended Credit Exposure: ₹{(selectedBuyer.creditLimit / 100000).toFixed(2)} Lakhs
                  </Text>
                  <Text style={[styles.recBody, { color: theme.text }]}>
                    {selectedBuyer.signals.recommendation}
                  </Text>
                </View>

                {/* Company Address */}
                <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>REGISTERED LOCATION</Text>
                <View style={[styles.addrBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <Ionicons name="location" size={16} color={theme.brand} style={{ marginRight: 6 }} />
                  <Text style={[styles.addrText, { color: theme.textSecondary }]}>{selectedBuyer.address}</Text>
                </View>
              </ScrollView>

              <TouchableOpacity
                onPress={() => setSelectedBuyer(null)}
                style={[styles.closeDossierBtn, { backgroundColor: theme.brand }]}
              >
                <Text style={styles.closeDossierText}>Done Reviewing Dossier</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  modalBar: {
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  closeBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },
  headerArea: {
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  pageSub: {
    fontSize: 11,
    marginTop: 2,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 2,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 8,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  listArea: {
    flex: 1,
  },
  buyerRowCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  buyerRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  name: {
    fontSize: 15,
    fontWeight: "800",
  },
  meta: {
    fontSize: 10,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(100,116,139,0.2)",
    marginVertical: 10,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statKey: {
    fontSize: 10,
  },
  statVal: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  dossierSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
    maxHeight: "88%",
  },
  dossierHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  dossierTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  dossierSub: {
    fontSize: 11,
    marginTop: 2,
  },
  dossierScroll: {
    maxHeight: 440,
  },
  riskSummaryBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  riskSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  boxLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  tenorBig: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 6,
  },
  signalsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  signalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(100,116,139,0.15)",
  },
  sigLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  sigVal: {
    fontSize: 12,
    fontWeight: "800",
  },
  recBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  recTitle: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },
  recBody: {
    fontSize: 11,
    lineHeight: 16,
  },
  addrBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  addrText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  closeDossierBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  closeDossierText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
