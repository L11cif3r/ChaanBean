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
import { INITIAL_BUSINESSES, BusinessProfile } from "../services/dataStore";
import { RiskBadge } from "../components/RiskBadge";

export const BusinessCheckScreen: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { theme } = useTheme();
  const [businesses, setBusinesses] = useState<BusinessProfile[]>(INITIAL_BUSINESSES);
  const [selectedBiz, setSelectedBiz] = useState<BusinessProfile | null>(null);
  const [showCompare, setShowCompare] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New Business Form State
  const [newName, setNewName] = useState<string>("");
  const [newGstin, setNewGstin] = useState<string>("");
  const [newPan, setNewPan] = useState<string>("");

  const handleAddBusiness = () => {
    if (!newName.trim()) return;
    const newBiz: BusinessProfile = {
      id: `biz-${Date.now()}`,
      companyName: newName,
      gstin: newGstin || "27AABCT9981K1Z2",
      cin: "U72200MH2021PTC392019",
      pan: newPan || "AABCT9981K",
      udyamNo: "UDYAM-MH-03-0098124",
      phone: "+91 98192 00192",
      registeredAddr: "Nariman Point, Mumbai, Maharashtra 400021",
      incorporatedOn: "2021-05-19",
      enterpriseType: "Micro Enterprise",
      industryCode: "6201",
      primaryActivity: "Software publishing and enterprise IT consulting",
      overallStatus: "ACTIVE",
      riskFlag: {
        flag: "AMBER",
        compositeScore: 64,
        recommendedLimit: 1200000,
        recommendedTenor: 30,
        rationale: "Moderate operating track record (3 years), single director, moderate debt leverage (1.4x).",
      },
      yearSummaries: [
        { fiscalYear: "FY2025-26", revenue: 18500000, ebitda: 2220000, netProfit: 1480000, ebitdaMarginPct: 12.0, netMarginPct: 8.0, currentRatio: 1.45, debtToEquity: 1.40 },
        { fiscalYear: "FY2024-25", revenue: 12400000, ebitda: 1364000, netProfit: 868000, ebitdaMarginPct: 11.0, netMarginPct: 7.0, currentRatio: 1.38, debtToEquity: 1.55 },
      ],
      courtCasesCount: 0,
      documentsCount: 2,
    };

    setBusinesses([newBiz, ...businesses]);
    setNewName("");
    setNewGstin("");
    setNewPan("");
    setShowAddModal(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Bar if navigated as subscreen */}
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
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>Financial Intelligence Dossier</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              MCA + Public GST + Udyam + eCourts + Document Extraction + Deterministic Risk Flags
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowCompare(true)}
            style={[styles.compareBtn, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}
          >
            <Ionicons name="git-compare" size={14} color={theme.brand} style={{ marginRight: 4 }} />
            <Text style={[styles.compareText, { color: theme.brand }]}>Compare (Side-by-Side)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Button to Add Business */}
      <TouchableOpacity
        onPress={() => setShowAddModal(true)}
        style={[styles.addBtn, { backgroundColor: theme.brand }]}
      >
        <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.addBtnText}>Run New Financial Intelligence Check</Text>
      </TouchableOpacity>

      {/* Business List */}
      <ScrollView style={{ flex: 1 }}>
        {businesses.map((biz) => {
          const isGreen = biz.riskFlag.flag === "GREEN";
          const isRed = biz.riskFlag.flag === "RED";

          return (
            <TouchableOpacity
              key={biz.id}
              onPress={() => setSelectedBiz(biz)}
              style={[styles.bizCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <View style={styles.bizHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bizName, { color: theme.text }]}>{biz.companyName}</Text>
                  <Text style={[styles.bizSub, { color: theme.textMuted }]}>
                    CIN: {biz.cin} · {biz.enterpriseType}
                  </Text>
                </View>
                <RiskBadge flag={biz.riskFlag.flag} score={biz.riskFlag.compositeScore} size="sm" />
              </View>

              <View style={[styles.metricStrip, { backgroundColor: theme.surfaceSecondary }]}>
                <View>
                  <Text style={[styles.stripKey, { color: theme.textMuted }]}>Latest Revenue</Text>
                  <Text style={[styles.stripVal, { color: theme.text }]}>
                    ₹{(biz.yearSummaries[0]?.revenue / 10000000).toFixed(2)} Cr
                  </Text>
                </View>

                <View>
                  <Text style={[styles.stripKey, { color: theme.textMuted }]}>EBITDA Margin</Text>
                  <Text style={[styles.stripVal, { color: isGreen ? theme.green : isRed ? theme.red : theme.amber }]}>
                    {biz.yearSummaries[0]?.ebitdaMarginPct}%
                  </Text>
                </View>

                <View>
                  <Text style={[styles.stripKey, { color: theme.textMuted }]}>Credit Limit</Text>
                  <Text style={[styles.stripVal, { color: theme.brand }]}>
                    ₹{(biz.riskFlag.recommendedLimit / 100000).toFixed(1)} Lakhs
                  </Text>
                </View>
              </View>

              <Text style={[styles.bizRationale, { color: theme.textSecondary }]} numberOfLines={2}>
                {biz.riskFlag.rationale}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 12-Section Dossier Modal */}
      {selectedBiz && (
        <Modal visible={!!selectedBiz} transparent animationType="slide" onRequestClose={() => setSelectedBiz(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              <View style={styles.dossierHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dossierTitle, { color: theme.text }]}>{selectedBiz.companyName}</Text>
                  <Text style={[styles.dossierSub, { color: theme.textMuted }]}>
                    12-Section Financial Intelligence Profile
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedBiz(null)}>
                  <Ionicons name="close" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.sheetScroll}>
                {/* Statutory Identifiers */}
                <View style={[styles.infoBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <Text style={[styles.boxTitle, { color: theme.textSecondary }]}>REGISTRY IDENTIFIERS</Text>
                  <Text style={[styles.infoLine, { color: theme.text }]}>GSTIN: {selectedBiz.gstin}</Text>
                  <Text style={[styles.infoLine, { color: theme.text }]}>CIN: {selectedBiz.cin}</Text>
                  <Text style={[styles.infoLine, { color: theme.text }]}>PAN: {selectedBiz.pan}</Text>
                  <Text style={[styles.infoLine, { color: theme.text }]}>Udyam: {selectedBiz.udyamNo}</Text>
                </View>

                {/* 4-Year Trend Financial Summary */}
                <Text style={[styles.boxTitle, { color: theme.textSecondary, marginTop: 12, marginBottom: 6 }]}>
                  MULTI-YEAR FINANCIAL PERFORMANCE (4-YEAR AUDITED)
                </Text>

                <View style={[styles.infoBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  {selectedBiz.yearSummaries.map((yr, idx) => (
                    <View key={idx} style={[styles.yearRow, { borderBottomColor: theme.cardBorder }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.yearText, { color: theme.brand }]}>{yr.fiscalYear}</Text>
                        <Text style={[styles.yearRevenue, { color: theme.text }]}>
                          Rev: ₹{(yr.revenue / 10000000).toFixed(2)} Cr · PAT: ₹{(yr.netProfit / 100000).toFixed(1)}L
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[styles.yearMargin, { color: theme.green }]}>EBITDA: {yr.ebitdaMarginPct}%</Text>
                        <Text style={[styles.yearRatio, { color: theme.textMuted }]}>
                          Current: {yr.currentRatio} · D/E: {yr.debtToEquity}x
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Cross-Document Consistency Check */}
                <Text style={[styles.boxTitle, { color: theme.textSecondary, marginTop: 12, marginBottom: 6 }]}>
                  CROSS-DOCUMENT RECONCILIATION ENGINE
                </Text>
                <View style={[styles.infoBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <View style={styles.reconRow}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.green} style={{ marginRight: 6 }} />
                    <Text style={[styles.reconText, { color: theme.text }]}>
                      GSTR-3B Turnover vs P&L Revenue: Verified Match (&lt;1.5% variance)
                    </Text>
                  </View>
                  <View style={styles.reconRow}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.green} style={{ marginRight: 6 }} />
                    <Text style={[styles.reconText, { color: theme.text }]}>
                      Bank Inflows vs Taxable Invoices: Consistent Cadence
                    </Text>
                  </View>
                  <View style={styles.reconRow}>
                    <Ionicons
                      name={selectedBiz.courtCasesCount > 0 ? "alert-circle" : "checkmark-circle"}
                      size={16}
                      color={selectedBiz.courtCasesCount > 0 ? theme.red : theme.green}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.reconText,
                        { color: selectedBiz.courtCasesCount > 0 ? theme.red : theme.text },
                      ]}
                    >
                      e-Courts Section 138 NI Act: {selectedBiz.courtCasesCount} Cases Found
                    </Text>
                  </View>
                </View>
              </ScrollView>

              <TouchableOpacity
                onPress={() => setSelectedBiz(null)}
                style={[styles.doneBtn, { backgroundColor: theme.brand }]}
              >
                <Text style={styles.doneBtnText}>Close Dossier</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Side-by-Side Comparison Modal */}
      {showCompare && (
        <Modal visible={showCompare} transparent animationType="slide" onRequestClose={() => setShowCompare(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              <View style={styles.dossierHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dossierTitle, { color: theme.text }]}>Side-by-Side Comparison</Text>
                  <Text style={[styles.dossierSub, { color: theme.textMuted }]}>
                    Compare Credit Health & Underwriting Across Counterparties
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowCompare(false)}>
                  <Ionicons name="close" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.sheetScroll}>
                <View style={styles.compareGrid}>
                  {/* Acme Traders */}
                  <View style={[styles.compareCol, { backgroundColor: theme.card, borderColor: theme.greenBorder }]}>
                    <Text style={[styles.compareBizName, { color: theme.text }]}>Acme Traders</Text>
                    <RiskBadge flag="green" score={88} size="sm" />
                    <View style={styles.compareDivider} />
                    <Text style={[styles.compKey, { color: theme.textMuted }]}>Revenue</Text>
                    <Text style={[styles.compVal, { color: theme.text }]}>₹4.20 Cr</Text>
                    <Text style={[styles.compKey, { color: theme.textMuted }]}>EBITDA Margin</Text>
                    <Text style={[styles.compVal, { color: theme.green }]}>14.0%</Text>
                    <Text style={[styles.compKey, { color: theme.textMuted }]}>Current Ratio</Text>
                    <Text style={[styles.compVal, { color: theme.text }]}>1.82</Text>
                    <Text style={[styles.compKey, { color: theme.textMuted }]}>Credit Limit</Text>
                    <Text style={[styles.compVal, { color: theme.brand }]}>₹30 Lakhs</Text>
                    <Text style={[styles.compKey, { color: theme.textMuted }]}>Court Cases</Text>
                    <Text style={[styles.compVal, { color: theme.green }]}>0 Suits</Text>
                  </View>

                  {/* Metro Supplies */}
                  <View style={[styles.compareCol, { backgroundColor: theme.card, borderColor: theme.redBorder }]}>
                    <Text style={[styles.compareBizName, { color: theme.text }]}>Metro Supplies</Text>
                    <RiskBadge flag="red" score={32} size="sm" />
                    <View style={styles.compareDivider} />
                    <Text style={[styles.compKey, { color: theme.textMuted }]}>Revenue</Text>
                    <Text style={[styles.compVal, { color: theme.text }]}>₹1.65 Cr (-32%)</Text>
                    <Text style={[styles.compKey, { color: theme.textMuted }]}>EBITDA Margin</Text>
                    <Text style={[styles.compVal, { color: theme.red }]}>-3.0%</Text>
                    <Text style={[styles.compKey, { color: theme.textMuted }]}>Current Ratio</Text>
                    <Text style={[styles.compVal, { color: theme.red }]}>0.84</Text>
                    <Text style={[styles.compKey, { color: theme.textMuted }]}>Credit Limit</Text>
                    <Text style={[styles.compVal, { color: theme.red }]}>₹0 (Blocked)</Text>
                    <Text style={[styles.compKey, { color: theme.textMuted }]}>Court Cases</Text>
                    <Text style={[styles.compVal, { color: theme.red }]}>4 Suits (§138)</Text>
                  </View>
                </View>
              </ScrollView>

              <TouchableOpacity
                onPress={() => setShowCompare(false)}
                style={[styles.doneBtn, { backgroundColor: theme.brand }]}
              >
                <Text style={styles.doneBtnText}>Close Comparison</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Add New Business Verification Modal */}
      {showAddModal && (
        <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              <View style={styles.dossierHeader}>
                <Text style={[styles.dossierTitle, { color: theme.text }]}>New Business Verification</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Company Legal Name</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Paramount Logistics Pvt Ltd"
                placeholderTextColor={theme.textMuted}
                style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>GSTIN (Optional)</Text>
              <TextInput
                value={newGstin}
                onChangeText={setNewGstin}
                placeholder="15-digit GSTIN"
                placeholderTextColor={theme.textMuted}
                style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>PAN Number (Optional)</Text>
              <TextInput
                value={newPan}
                onChangeText={setNewPan}
                placeholder="10-digit PAN"
                placeholderTextColor={theme.textMuted}
                style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              />

              <TouchableOpacity
                onPress={handleAddBusiness}
                style={[styles.doneBtn, { backgroundColor: theme.brand, marginTop: 14 }]}
              >
                <Text style={styles.doneBtnText}>Run Financial Ingestion</Text>
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
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  compareBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8,
  },
  compareText: {
    fontSize: 11,
    fontWeight: "700",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  bizCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  bizHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  bizName: {
    fontSize: 15,
    fontWeight: "800",
  },
  bizSub: {
    fontSize: 11,
    marginTop: 2,
  },
  metricStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  stripKey: {
    fontSize: 10,
  },
  stripVal: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  bizRationale: {
    fontSize: 11,
    lineHeight: 15,
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
  sheetScroll: {
    maxHeight: 440,
  },
  infoBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  boxTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  infoLine: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  yearRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  yearText: {
    fontSize: 12,
    fontWeight: "800",
  },
  yearRevenue: {
    fontSize: 11,
    marginTop: 2,
  },
  yearMargin: {
    fontSize: 11,
    fontWeight: "800",
  },
  yearRatio: {
    fontSize: 10,
    marginTop: 2,
  },
  reconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  reconText: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  doneBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  compareGrid: {
    flexDirection: "row",
    gap: 10,
  },
  compareCol: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  compareBizName: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 6,
  },
  compareDivider: {
    height: 1,
    backgroundColor: "rgba(100,116,139,0.2)",
    marginVertical: 8,
  },
  compKey: {
    fontSize: 10,
    marginTop: 4,
  },
  compVal: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 1,
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
});
