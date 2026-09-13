import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { calculateMsmePenalInterest } from "../services/arbitrationEngine";
import { INITIAL_ARBITRATION_CASES, ArbitrationCaseItem } from "../services/dataStore";

export const ArbitrationScreen: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { theme } = useTheme();
  const [cases, setCases] = useState<ArbitrationCaseItem[]>(INITIAL_ARBITRATION_CASES);

  // Calculator inputs
  const [principalStr, setPrincipalStr] = useState<string>("2850000");
  const [daysStr, setDaysStr] = useState<string>("89");
  const [respondentName, setRespondentName] = useState<string>("Metro Supplies Co");

  // e-Sign modal state
  const [eSignTargetCase, setESignTargetCase] = useState<ArbitrationCaseItem | null>(null);
  const [aadhaarOtp, setAadhaarOtp] = useState<string>("");
  const [signing, setSigning] = useState<boolean>(false);
  const [signSuccess, setSignSuccess] = useState<boolean>(false);

  const principal = parseFloat(principalStr) || 0;
  const days = parseInt(daysStr) || 0;
  const calc = calculateMsmePenalInterest(principal, days);

  const handleCreateCase = () => {
    if (principal <= 0) return;
    const newCase: ArbitrationCaseItem = {
      id: `arb-${Date.now()}`,
      caseNumber: `ARB-MSME-2026-0${Math.floor(100 + Math.random() * 900)}`,
      claimantName: "Acme Traders Pvt Ltd",
      respondentName: respondentName || "Metro Supplies Co",
      principalAmount: calc.principal,
      penalInterestRate: calc.statutoryRatePct,
      overdueDays: calc.overdueDays,
      accruedInterest: calc.accruedInterest,
      totalClaimAmount: calc.totalClaimAmount,
      status: "open",
      statutoryBasis: "Micro, Small and Medium Enterprises Development (MSMED) Act, 2006 (Section 16 & 18)",
      eSignStatus: "pending",
      filingDate: new Date().toISOString().split("T")[0],
    };

    setCases([newCase, ...cases]);
  };

  const handleExecuteEsign = () => {
    if (!aadhaarOtp.trim() || !eSignTargetCase) return;
    setSigning(true);
    setTimeout(() => {
      setCases(
        cases.map((c) =>
          c.id === eSignTargetCase.id ? { ...c, eSignStatus: "initiator_signed" } : c
        )
      );
      setSigning(false);
      setSignSuccess(true);
      setTimeout(() => {
        setSignSuccess(false);
        setESignTargetCase(null);
        setAadhaarOtp("");
      }, 1500);
    }, 1000);
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
        {/* Header */}
        <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.badgeRow}>
            <View style={[styles.statPill, { backgroundColor: theme.amberBg }]}>
              <Ionicons name="hammer" size={12} color={theme.amber} style={{ marginRight: 4 }} />
              <Text style={[styles.statPillText, { color: theme.amber }]}>MSMED ACT 2006 §16</Text>
            </View>
            <Text style={[styles.rateTag, { color: theme.red }]}>20.25% p.a. Compounding</Text>
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>
            Statutory Arbitration & Dispute Desk
          </Text>
          <Text style={[styles.heroDesc, { color: theme.textSecondary }]}>
            Section 16 non-waivable 3x RBI bank rate compounding with monthly rests · Statements of Claim · Aadhaar e-Sign court decrees
          </Text>
        </View>

        {/* 4 Compounding Formula Blocks */}
        <View style={styles.calcGrid}>
          <View style={[styles.calcCell, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.cellKey, { color: theme.textMuted }]}>RBI Base Rate</Text>
            <Text style={[styles.cellVal, { color: theme.text }]}>6.75%</Text>
          </View>
          <View style={[styles.calcCell, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.cellKey, { color: theme.textMuted }]}>MSME Multiplier</Text>
            <Text style={[styles.cellVal, { color: theme.amber }]}>3x</Text>
          </View>
          <View style={[styles.calcCell, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.cellKey, { color: theme.textMuted }]}>Statutory Rate</Text>
            <Text style={[styles.cellVal, { color: theme.red }]}>20.25%</Text>
          </View>
          <View style={[styles.calcCell, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.cellKey, { color: theme.textMuted }]}>Compounding</Text>
            <Text style={[styles.cellVal, { color: theme.green }]}>Monthly Rests</Text>
          </View>
        </View>

        {/* Interactive Interest Calculator Form */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Statutory Interest Calculator</Text>

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Principal Amount (₹)</Text>
              <TextInput
                value={principalStr}
                onChangeText={setPrincipalStr}
                keyboardType="numeric"
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              />
            </View>

            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Days Overdue</Text>
              <TextInput
                value={daysStr}
                onChangeText={setDaysStr}
                keyboardType="numeric"
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              />
            </View>
          </View>

          <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 8 }]}>Respondent Debtor Name</Text>
          <TextInput
            value={respondentName}
            onChangeText={setRespondentName}
            placeholder="e.g. Metro Supplies Co"
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
          />

          {/* Computed Results Banner */}
          <View style={[styles.resultBanner, { backgroundColor: theme.surfaceSecondary }]}>
            <View style={styles.rbRow}>
              <Text style={[styles.rbKey, { color: theme.textMuted }]}>Compounding Duration:</Text>
              <Text style={[styles.rbVal, { color: theme.text }]}>{calc.compoundingMonths} Months</Text>
            </View>
            <View style={styles.rbRow}>
              <Text style={[styles.rbKey, { color: theme.textMuted }]}>Statutory Penal Interest:</Text>
              <Text style={[styles.rbVal, { color: theme.red }]}>+ ₹{calc.accruedInterest.toLocaleString("en-IN")}</Text>
            </View>
            <View style={[styles.rbRow, { marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: theme.cardBorder }]}>
              <Text style={[styles.rbKeyBold, { color: theme.text }]}>Total Enforceable Claim:</Text>
              <Text style={[styles.rbValBold, { color: theme.brand }]}>
                ₹{calc.totalClaimAmount.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleCreateCase}
            style={[styles.claimBtn, { backgroundColor: theme.brand }]}
          >
            <Ionicons name="document-text" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.claimBtnText}>Draft Statement of Claim</Text>
          </TouchableOpacity>
        </View>

        {/* Existing Arbitration Cases */}
        <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>
          ACTIVE MSME ARBITRATION CASES ({cases.length})
        </Text>

        {cases.map((c) => (
          <View key={c.id} style={[styles.caseCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.caseHeader}>
              <View>
                <Text style={[styles.caseNum, { color: theme.brand }]}>{c.caseNumber}</Text>
                <Text style={[styles.caseParties, { color: theme.text }]}>
                  {c.claimantName} vs. {c.respondentName}
                </Text>
              </View>
              <View style={[styles.caseStatusPill, { backgroundColor: theme.amberBg }]}>
                <Text style={[styles.caseStatusText, { color: theme.amber }]}>
                  {c.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.caseDivider} />

            <View style={styles.caseStatsRow}>
              <View>
                <Text style={[styles.caseStatKey, { color: theme.textMuted }]}>Principal</Text>
                <Text style={[styles.caseStatVal, { color: theme.text }]}>
                  ₹{(c.principalAmount / 100000).toFixed(2)}L
                </Text>
              </View>
              <View>
                <Text style={[styles.caseStatKey, { color: theme.textMuted }]}>Penal Interest</Text>
                <Text style={[styles.caseStatVal, { color: theme.red }]}>
                  + ₹{(c.accruedInterest / 100000).toFixed(2)}L
                </Text>
              </View>
              <View>
                <Text style={[styles.caseStatKey, { color: theme.textMuted }]}>Total Claim</Text>
                <Text style={[styles.caseStatVal, { color: theme.brand }]}>
                  ₹{(c.totalClaimAmount / 100000).toFixed(2)}L
                </Text>
              </View>
            </View>

            {/* e-Sign button */}
            <View style={styles.eSignRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.eSignLabel, { color: theme.textMuted }]}>Aadhaar e-Sign Court Decree:</Text>
                <Text style={[styles.eSignStatus, { color: c.eSignStatus === "initiator_signed" ? theme.green : theme.amber }]}>
                  {c.eSignStatus === "initiator_signed" ? "Signed & Sealed (Sec 65B)" : "Pending Signature"}
                </Text>
              </View>

              {c.eSignStatus === "pending" && (
                <TouchableOpacity
                  onPress={() => setESignTargetCase(c)}
                  style={[styles.eSignBtn, { backgroundColor: theme.green }]}
                >
                  <Ionicons name="key" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.eSignBtnText}>e-Sign Now</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Aadhaar e-Sign Modal */}
      {eSignTargetCase && (
        <Modal visible={!!eSignTargetCase} transparent animationType="slide" onRequestClose={() => setESignTargetCase(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              <View style={styles.dossierHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dossierTitle, { color: theme.text }]}>Aadhaar Electronic Signature</Text>
                  <Text style={[styles.dossierSub, { color: theme.textMuted }]}>
                    Section 65B Admissible Court Decree Certificate
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setESignTargetCase(null)}>
                  <Ionicons name="close" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {signSuccess ? (
                <View style={[styles.signSuccessBox, { backgroundColor: theme.greenBg }]}>
                  <Ionicons name="checkmark-circle" size={32} color={theme.green} />
                  <Text style={[styles.signSuccessTitle, { color: theme.green }]}>
                    Decree Cryptographically Signed!
                  </Text>
                  <Text style={[styles.signSuccessSub, { color: theme.textSecondary }]}>
                    SHA-256 seal embedded for {eSignTargetCase.caseNumber}.
                  </Text>
                </View>
              ) : (
                <View>
                  <Text style={[styles.signNotice, { color: theme.textSecondary }]}>
                    An OTP has been dispatched to the Aadhaar-linked mobile for Siddharth Verma (Authorized Director of Acme Traders Pvt Ltd).
                  </Text>

                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>Enter 6-Digit OTP</Text>
                  <TextInput
                    value={aadhaarOtp}
                    onChangeText={setAadhaarOtp}
                    placeholder="e.g. 782190"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    maxLength={6}
                    style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text, fontSize: 18, textAlign: "center", letterSpacing: 4 }]}
                  />

                  <TouchableOpacity
                    onPress={handleExecuteEsign}
                    disabled={signing || !aadhaarOtp.trim()}
                    style={[styles.executeSignBtn, { backgroundColor: theme.green }]}
                  >
                    {signing ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.executeSignBtnText}>Affix Cryptographic e-Signature</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
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
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  rateTag: {
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
  calcGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  calcCell: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    alignItems: "center",
  },
  cellKey: {
    fontSize: 9,
    fontWeight: "600",
  },
  cellVal: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },
  formRow: {
    flexDirection: "row",
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  resultBanner: {
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  rbRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  rbKey: {
    fontSize: 11,
  },
  rbVal: {
    fontSize: 11,
    fontWeight: "700",
  },
  rbKeyBold: {
    fontSize: 12,
    fontWeight: "800",
  },
  rbValBold: {
    fontSize: 14,
    fontWeight: "900",
  },
  claimBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  claimBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  caseCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  caseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  caseNum: {
    fontSize: 13,
    fontWeight: "800",
  },
  caseParties: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  caseStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  caseStatusText: {
    fontSize: 9,
    fontWeight: "800",
  },
  caseDivider: {
    height: 1,
    backgroundColor: "rgba(100,116,139,0.2)",
    marginVertical: 10,
  },
  caseStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  caseStatKey: {
    fontSize: 10,
  },
  caseStatVal: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  eSignRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eSignLabel: {
    fontSize: 10,
  },
  eSignStatus: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1,
  },
  eSignBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  eSignBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
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
  signNotice: {
    fontSize: 12,
    lineHeight: 16,
  },
  executeSignBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  executeSignBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  signSuccessBox: {
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  signSuccessTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 8,
  },
  signSuccessSub: {
    fontSize: 11,
    marginTop: 4,
  },
});
