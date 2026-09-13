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

interface DefaultRecord {
  id: string;
  debtorName: string;
  gstin: string;
  amount: number;
  date: string;
  notes: string;
}

export const TrustHubScreen: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { theme } = useTheme();
  const [trustIdSearch, setTrustIdSearch] = useState<string>("TRUST-CB-ACME-001");
  const [activeTab, setActiveTab] = useState<"passport" | "defaults" | "vendors">("passport");
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  // Community defaults state
  const [defaults, setDefaults] = useState<DefaultRecord[]>([
    {
      id: "def-1",
      debtorName: "Metro Supplies Co",
      gstin: "27AAECM4920K1ZG",
      amount: 2850000,
      date: "2026-06-15",
      notes: "Commercial invoice unpaid for 89 days. 4 cheque dishonor notices served.",
    },
    {
      id: "def-2",
      debtorName: "Zenith Packaging Ltd",
      gstin: "24AAECZ8810M1Z8",
      amount: 1120000,
      date: "2026-07-22",
      notes: "Goods delivered in full. Debtor stopped answering calls.",
    },
  ]);

  // Report default form state
  const [repName, setRepName] = useState<string>("");
  const [repGstin, setRepGstin] = useState<string>("");
  const [repAmount, setRepAmount] = useState<string>("");
  const [repNotes, setRepNotes] = useState<string>("");

  const handleAddDefault = () => {
    if (!repName.trim() || !repAmount.trim()) return;
    const newDef: DefaultRecord = {
      id: `def-${Date.now()}`,
      debtorName: repName,
      gstin: repGstin || "27AACCR1928K1Z5",
      amount: parseFloat(repAmount) || 0,
      date: new Date().toISOString().split("T")[0],
      notes: repNotes || "Reported community trade default.",
    };

    setDefaults([newDef, ...defaults]);
    setRepName("");
    setRepGstin("");
    setRepAmount("");
    setRepNotes("");
    setShowReportModal(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {onClose && (
        <View style={[styles.modalBar, { borderBottomColor: theme.cardBorder }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
            <Text style={[styles.backText, { color: theme.text }]}>Back to Command</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={{ flex: 1 }}>
        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.badgeRow}>
            <View style={[styles.trustPill, { backgroundColor: theme.greenBg }]}>
              <Ionicons name="shield-checkmark" size={12} color={theme.green} style={{ marginRight: 4 }} />
              <Text style={[styles.trustPillText, { color: theme.green }]}>TRUST HUB & REGISTRY</Text>
            </View>
            <Text style={[styles.credScore, { color: theme.green }]}>Credibility: 885 / 1000</Text>
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>Digital B2B Trust Passport</Text>
          <Text style={[styles.heroDesc, { color: theme.textSecondary }]}>
            Verified MSME credentials · Digital Trust ID certificates · Community peer default blacklist
          </Text>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="search" size={16} color={theme.brand} style={{ marginRight: 8 }} />
          <TextInput
            value={trustIdSearch}
            onChangeText={setTrustIdSearch}
            placeholder="Search Trust ID (e.g. TRUST-CB-XXXX) or GSTIN"
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.text }]}
          />
        </View>

        {/* Tab Buttons */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            onPress={() => setActiveTab("passport")}
            style={[
              styles.tabBtn,
              {
                backgroundColor: activeTab === "passport" ? theme.brand : theme.card,
                borderColor: activeTab === "passport" ? theme.brand : theme.cardBorder,
              },
            ]}
          >
            <Text style={[styles.tabBtnText, { color: activeTab === "passport" ? "#FFFFFF" : theme.textSecondary }]}>
              My Trust Passport
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("defaults")}
            style={[
              styles.tabBtn,
              {
                backgroundColor: activeTab === "defaults" ? theme.brand : theme.card,
                borderColor: activeTab === "defaults" ? theme.brand : theme.cardBorder,
              },
            ]}
          >
            <Text style={[styles.tabBtnText, { color: activeTab === "defaults" ? "#FFFFFF" : theme.textSecondary }]}>
              Default Blacklist ({defaults.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Passport */}
        {activeTab === "passport" && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.certTitle, { color: theme.text }]}>Acme Traders Pvt Ltd</Text>
                <Text style={[styles.certId, { color: theme.brand }]}>TRUST ID: TRUST-CB-ACME-001</Text>
              </View>
              <View style={[styles.primeBadge, { backgroundColor: theme.greenBg }]}>
                <Ionicons name="ribbon" size={14} color={theme.green} style={{ marginRight: 4 }} />
                <Text style={[styles.primeText, { color: theme.green }]}>TIER 1 PRIME</Text>
              </View>
            </View>

            <View style={[styles.scoreBox, { backgroundColor: theme.surfaceSecondary }]}>
              <Text style={[styles.scoreVal, { color: theme.green }]}>885</Text>
              <Text style={[styles.scoreMax, { color: theme.textMuted }]}>/ 1000 Credibility Score</Text>
            </View>

            <Text style={[styles.subHeading, { color: theme.textSecondary }]}>VERIFIED COMPLIANCE BADGES</Text>
            <View style={styles.badgesWrap}>
              {[
                "GST Active Regular",
                "MSME Small Enterprise",
                "Zero Peer Defaults",
                "Audited GSTR-3B Filings",
                "4-Year Business Age",
                "MCA21 Clean Directorships",
              ].map((badge, idx) => (
                <View
                  key={idx}
                  style={[styles.badgePill, { backgroundColor: theme.greenBg, borderColor: theme.greenBorder }]}
                >
                  <Ionicons name="checkmark" size={12} color={theme.green} style={{ marginRight: 4 }} />
                  <Text style={[styles.badgeText, { color: theme.green }]}>{badge}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tab 2: Community Defaults Blacklist */}
        {activeTab === "defaults" && (
          <View>
            <TouchableOpacity
              onPress={() => setShowReportModal(true)}
              style={[styles.reportBtn, { backgroundColor: theme.red }]}
            >
              <Ionicons name="warning" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.reportBtnText}>Report Unpaid Debtor to Blacklist</Text>
            </TouchableOpacity>

            {defaults.map((def) => (
              <View
                key={def.id}
                style={[styles.defCard, { backgroundColor: theme.card, borderColor: theme.redBorder }]}
              >
                <View style={styles.defHeader}>
                  <View>
                    <Text style={[styles.defName, { color: theme.text }]}>{def.debtorName}</Text>
                    <Text style={[styles.defGstin, { color: theme.textMuted }]}>GSTIN: {def.gstin}</Text>
                  </View>
                  <View style={[styles.defPill, { backgroundColor: theme.redBg }]}>
                    <Text style={[styles.defPillText, { color: theme.red }]}>REPORTED DEFAULT</Text>
                  </View>
                </View>

                <Text style={[styles.defAmount, { color: theme.red }]}>
                  ₹{(def.amount / 100000).toFixed(2)} Lakhs Unsettled
                </Text>
                <Text style={[styles.defNotes, { color: theme.textSecondary }]}>{def.notes}</Text>
                <Text style={[styles.defDate, { color: theme.textMuted }]}>Default Date: {def.date}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Report Default Modal */}
      {showReportModal && (
        <Modal visible={showReportModal} transparent animationType="slide" onRequestClose={() => setShowReportModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Report Trade Default</Text>
                <TouchableOpacity onPress={() => setShowReportModal(false)}>
                  <Ionicons name="close" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Debtor Legal Entity Name</Text>
              <TextInput
                value={repName}
                onChangeText={setRepName}
                placeholder="e.g. Apex Industrial Supplies"
                placeholderTextColor={theme.textMuted}
                style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Debtor GSTIN / PAN</Text>
              <TextInput
                value={repGstin}
                onChangeText={setRepGstin}
                placeholder="15-digit GSTIN or PAN"
                placeholderTextColor={theme.textMuted}
                style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Amount Defaulted (₹)</Text>
              <TextInput
                value={repAmount}
                onChangeText={setRepAmount}
                placeholder="e.g. 1500000"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
                style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Default Notes & Reason</Text>
              <TextInput
                value={repNotes}
                onChangeText={setRepNotes}
                placeholder="Invoices overdue, dishonored cheques, etc."
                placeholderTextColor={theme.textMuted}
                style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              />

              <TouchableOpacity
                onPress={handleAddDefault}
                style={[styles.submitReportBtn, { backgroundColor: theme.red }]}
              >
                <Text style={styles.submitReportBtnText}>Submit Default to Network</Text>
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
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  trustPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  trustPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  credScore: {
    fontSize: 11,
    fontWeight: "800",
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
  searchCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 2,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 8,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  certTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  certId: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  primeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  primeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  scoreBox: {
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  scoreVal: {
    fontSize: 32,
    fontWeight: "900",
  },
  scoreMax: {
    fontSize: 11,
    marginTop: 2,
  },
  subHeading: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  badgesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  reportBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  defCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  defHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  defName: {
    fontSize: 14,
    fontWeight: "800",
  },
  defGstin: {
    fontSize: 10,
    marginTop: 2,
  },
  defPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defPillText: {
    fontSize: 9,
    fontWeight: "800",
  },
  defAmount: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },
  defNotes: {
    fontSize: 11,
    lineHeight: 15,
  },
  defDate: {
    fontSize: 10,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  submitReportBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  submitReportBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
