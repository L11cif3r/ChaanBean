import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import {
  INITIAL_LEGAL_ADVISORS,
  INITIAL_EVIDENCE_PACKS,
  LegalAdvisorItem,
  LegalEvidencePackItem,
} from "../services/dataStore";

interface LegalAdvisorsScreenProps {
  onClose?: () => void;
}

export const LegalAdvisorsScreen: React.FC<LegalAdvisorsScreenProps> = ({ onClose }) => {
  const { theme } = useTheme();
  const [advisors, setAdvisors] = useState<LegalAdvisorItem[]>(INITIAL_LEGAL_ADVISORS);
  const [evidencePacks, setEvidencePacks] = useState<LegalEvidencePackItem[]>(
    INITIAL_EVIDENCE_PACKS
  );
  const [activeTab, setActiveTab] = useState<"advisors" | "matching" | "evidence">(
    "advisors"
  );

  // Counsel matching state
  const [selectedCaseForMatch, setSelectedCaseForMatch] = useState("ARB-MSME-2026-0042 (Metro Supplies Co)");
  const [matchedAdvisor, setMatchedAdvisor] = useState<LegalAdvisorItem | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);

  // Evidence pack modal
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [packDebtor, setPackDebtor] = useState("Metro Supplies Co");
  const [packTitle, setPackTitle] = useState("Section 138 NI Act & MSMED Statutory Evidence File");
  const [packSuccessBanner, setPackSuccessBanner] = useState<string | null>(null);

  const handleRunMatch = () => {
    // Deterministic match simulation
    if (selectedCaseForMatch.includes("Metro")) {
      setMatchedAdvisor(advisors[0]); // Adv. Rajesh Nair
      setMatchScore(98.4);
    } else {
      setMatchedAdvisor(advisors[1]); // Adv. Ananya Deshmukh
      setMatchScore(94.2);
    }
  };

  const handleCreateEvidencePack = () => {
    const freshHash = "e8a901f" + Math.random().toString(16).substring(2, 10) + "3f4a9b2c159828e678b87a8f94602fba";
    const newPack: LegalEvidencePackItem = {
      id: `ev-pack-${Date.now()}`,
      caseNumber: selectedCaseForMatch.split(" ")[0],
      debtorName: packDebtor,
      title: packTitle,
      hashSeal: freshHash,
      documentsCount: 4,
      status: "CERTIFIED",
      generatedAt: "Just now",
    };
    setEvidencePacks([newPack, ...evidencePacks]);
    setShowEvidenceModal(false);
    setPackSuccessBanner(`Digital Evidence Pack certified with SHA-256 seal for ${packDebtor}.`);
    setTimeout(() => setPackSuccessBanner(null), 4000);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Banner */}
      <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.badgeRow}>
          <View style={[styles.phasePill, { backgroundColor: theme.purpleBg, borderColor: theme.purpleBorder }]}>
            <Text style={[styles.phasePillText, { color: theme.purple }]}>PHASE 5: LEGAL RECOVERY</Text>
          </View>
          <View style={styles.liveIndicator}>
            <View style={[styles.pulsingDot, { backgroundColor: theme.green }]} />
            <Text style={[styles.liveText, { color: theme.green }]}>BAR COUNCIL VERIFIED</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Empanelled Legal Network</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Verified commercial recovery advocates across high courts, algorithmic counsel matching, and certified evidence bundles.
        </Text>

        {packSuccessBanner && (
          <View style={[styles.feedbackBox, { backgroundColor: theme.greenBg, borderColor: theme.greenBorder }]}>
            <Ionicons name="checkmark-circle" size={16} color={theme.green} />
            <Text style={[styles.feedbackText, { color: theme.green }]}>{packSuccessBanner}</Text>
          </View>
        )}
      </View>

      {/* KPI Cards Grid */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Empanelled Counsel</Text>
          <Text style={[styles.kpiValue, { color: theme.purple }]}>3 Advocates</Text>
          <Text style={[styles.kpiSub, { color: theme.textMuted }]}>State Bar Verified</Text>
        </View>

        <View style={[styles.kpiBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Recovery Win Rate</Text>
          <Text style={[styles.kpiValue, { color: theme.green }]}>91.3%</Text>
          <Text style={[styles.kpiSub, { color: theme.textMuted }]}>Arbitration & Sec 138</Text>
        </View>

        <View style={[styles.kpiBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Avg Resolution</Text>
          <Text style={[styles.kpiValue, { color: theme.brand }]}>42 Days</Text>
          <Text style={[styles.kpiSub, { color: theme.textMuted }]}>Fast-Track Council</Text>
        </View>

        <View style={[styles.kpiBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Escrow Protection</Text>
          <Text style={[styles.kpiValue, { color: theme.text }]}>₹75,000</Text>
          <Text style={[styles.kpiSub, { color: theme.textMuted }]}>Milestone Fee Escrow</Text>
        </View>
      </View>

      {/* Segmented Switcher */}
      <View style={[styles.tabSelector, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}>
        <TouchableOpacity
          onPress={() => setActiveTab("advisors")}
          style={[
            styles.tabItem,
            activeTab === "advisors" && { backgroundColor: theme.card, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 3 },
          ]}
        >
          <Ionicons
            name="people-outline"
            size={16}
            color={activeTab === "advisors" ? theme.purple : theme.textMuted}
          />
          <Text
            style={[
              styles.tabItemText,
              { color: activeTab === "advisors" ? theme.text : theme.textMuted },
            ]}
          >
            Advocates ({advisors.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("matching")}
          style={[
            styles.tabItem,
            activeTab === "matching" && { backgroundColor: theme.card, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 3 },
          ]}
        >
          <Ionicons
            name="git-compare-outline"
            size={16}
            color={activeTab === "matching" ? theme.brand : theme.textMuted}
          />
          <Text
            style={[
              styles.tabItemText,
              { color: activeTab === "matching" ? theme.text : theme.textMuted },
            ]}
          >
            AI Matching
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("evidence")}
          style={[
            styles.tabItem,
            activeTab === "evidence" && { backgroundColor: theme.card, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 3 },
          ]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={16}
            color={activeTab === "evidence" ? theme.green : theme.textMuted}
          />
          <Text
            style={[
              styles.tabItemText,
              { color: activeTab === "evidence" ? theme.text : theme.textMuted },
            ]}
          >
            Evidence ({evidencePacks.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab 1: Empanelled Advocates */}
      {activeTab === "advisors" && (
        <View style={{ gap: 12, marginBottom: 30 }}>
          {advisors.map((adv) => (
            <View
              key={adv.id}
              style={[styles.advCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <View style={styles.advTop}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.advName, { color: theme.text }]}>{adv.name}</Text>
                    <View style={[styles.verifiedPill, { backgroundColor: theme.greenBg, borderColor: theme.greenBorder }]}>
                      <Ionicons name="checkmark-circle" size={12} color={theme.green} />
                      <Text style={[styles.verifiedPillText, { color: theme.green }]}>VERIFIED</Text>
                    </View>
                  </View>
                  <Text style={[styles.firmName, { color: theme.brand }]}>{adv.firmName}</Text>
                  <Text style={[styles.barNo, { color: theme.textMuted }]}>
                    Bar Reg: {adv.barCouncilNo} · {adv.jurisdiction}
                  </Text>
                </View>

                <View style={styles.scoreBox}>
                  <Text style={[styles.scoreVal, { color: theme.green }]}>{adv.successRate}%</Text>
                  <Text style={[styles.scoreLabel, { color: theme.textMuted }]}>Success Rate</Text>
                </View>
              </View>

              <View style={[styles.specBox, { backgroundColor: theme.surfaceSecondary }]}>
                <Ionicons name="ribbon-outline" size={14} color={theme.purple} />
                <Text style={[styles.specText, { color: theme.textSecondary }]}>
                  {adv.specialization}
                </Text>
              </View>

              {/* Direct Actions */}
              <View style={styles.advActionsRow}>
                <TouchableOpacity
                  style={[styles.advActionBtn, { backgroundColor: theme.brandBg, borderColor: theme.brandBorder }]}
                >
                  <Ionicons name="call-outline" size={14} color={theme.brand} />
                  <Text style={[styles.advActionBtnText, { color: theme.brand }]}>Call Chambers</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.advActionBtn, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}
                >
                  <Ionicons name="mail-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.advActionBtnText, { color: theme.textSecondary }]}>Brief Counsel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Tab 2: AI Counsel Matching Engine */}
      {activeTab === "matching" && (
        <View style={{ gap: 14, marginBottom: 30 }}>
          <View style={[styles.matchingCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.boxTitle, { color: theme.text }]}>Algorithmic Counsel Assignment</Text>
            <Text style={[styles.boxDesc, { color: theme.textSecondary }]}>
              Evaluates statutory claim jurisdiction, debtor dispute nature (Sec 138 vs MSMED §16 vs IBC), and advocate court historical win records.
            </Text>

            <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>
              Select Defaulting Case File
            </Text>
            <View style={[styles.caseSelector, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}>
              <Text style={[styles.caseSelectorText, { color: theme.text }]}>
                {selectedCaseForMatch}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleRunMatch}
              style={[styles.matchBtn, { backgroundColor: theme.brand }]}
            >
              <Ionicons name="sparkles" size={16} color="#fff" />
              <Text style={styles.matchBtnText}>Calculate Optimal Counsel Match</Text>
            </TouchableOpacity>

            {matchedAdvisor && (
              <View style={[styles.matchResultBox, { backgroundColor: theme.greenBg, borderColor: theme.greenBorder }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={[styles.matchResultTitle, { color: theme.green }]}>
                    RECOMMENDED LEAD COUNSEL
                  </Text>
                  <View style={[styles.matchScorePill, { backgroundColor: theme.green }]}>
                    <Text style={styles.matchScorePillText}>{matchScore}% FIT</Text>
                  </View>
                </View>

                <Text style={[styles.matchAdvName, { color: theme.text, marginTop: 6 }]}>
                  {matchedAdvisor.name}
                </Text>
                <Text style={[styles.matchFirm, { color: theme.brand }]}>{matchedAdvisor.firmName}</Text>
                <Text style={[styles.matchReason, { color: theme.textSecondary, marginTop: 4 }]}>
                  Specialist in {matchedAdvisor.specialization} within {matchedAdvisor.jurisdiction}. Maintains {matchedAdvisor.successRate}% verified award conversion rate.
                </Text>

                <TouchableOpacity
                  style={[styles.assignBtn, { backgroundColor: theme.green }]}
                >
                  <Text style={styles.assignBtnText}>Assign Advocate to Case #ARB-0042</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Tab 3: Section 65B Certified Evidence Packs */}
      {activeTab === "evidence" && (
        <View style={{ gap: 12, marginBottom: 30 }}>
          <TouchableOpacity
            onPress={() => setShowEvidenceModal(true)}
            style={[styles.generatePackBtn, { backgroundColor: theme.green }]}
          >
            <Ionicons name="document-lock-outline" size={18} color="#fff" />
            <Text style={styles.generatePackBtnText}>Compile Certified Evidence Bundle</Text>
          </TouchableOpacity>

          {evidencePacks.map((pack) => (
            <View
              key={pack.id}
              style={[styles.packCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <View style={styles.packTop}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.packCase, { color: theme.brand }]}>{pack.caseNumber}</Text>
                    <View style={[styles.certPill, { backgroundColor: theme.greenBg, borderColor: theme.greenBorder }]}>
                      <Text style={[styles.certPillText, { color: theme.green }]}>{pack.status}</Text>
                    </View>
                  </View>
                  <Text style={[styles.packTitle, { color: theme.text }]}>{pack.title}</Text>
                  <Text style={[styles.packDebtor, { color: theme.textMuted }]}>
                    Target Debtor: {pack.debtorName} · {pack.documentsCount} Bundled Exhibits
                  </Text>
                </View>
              </View>

              {/* SHA-256 Seal Box */}
              <View style={[styles.hashBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <Ionicons name="shield-checkmark" size={13} color={theme.green} />
                  <Text style={[styles.hashLabel, { color: theme.green }]}>SHA-256 DIGITAL HASH SEAL</Text>
                </View>
                <Text style={[styles.hashText, { color: theme.textMuted }]} numberOfLines={1}>
                  {pack.hashSeal}
                </Text>
              </View>

              <View style={styles.packFooter}>
                <Text style={[styles.packTime, { color: theme.textMuted }]}>Sealed: {pack.generatedAt}</Text>
                <TouchableOpacity style={styles.downloadLink}>
                  <Ionicons name="cloud-download-outline" size={14} color={theme.brand} />
                  <Text style={[styles.downloadLinkText, { color: theme.brand }]}>Export Bundle</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Modal: Compile Evidence Pack */}
      <Modal visible={showEvidenceModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Generate Evidence Pack</Text>
              <TouchableOpacity onPress={() => setShowEvidenceModal(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Target Counterparty</Text>
            <TextInput
              value={packDebtor}
              onChangeText={setPackDebtor}
              style={[styles.input, { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.cardBorder }]}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Bundle Title / Court Registry</Text>
            <TextInput
              value={packTitle}
              onChangeText={setPackTitle}
              style={[styles.input, { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.cardBorder }]}
            />

            <View style={[styles.includedExhibits, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}>
              <Text style={[styles.exhibitsTitle, { color: theme.text }]}>Included Exhibits & Seals:</Text>
              <Text style={[styles.exhibitItem, { color: theme.textMuted }]}>✓ Certified Invoices & GST Returns</Text>
              <Text style={[styles.exhibitItem, { color: theme.textMuted }]}>✓ Speed Post & WhatsApp Proof of Service</Text>
              <Text style={[styles.exhibitItem, { color: theme.textMuted }]}>✓ MSMED Act §16 Penal Interest Certificate (20.25%)</Text>
              <Text style={[styles.exhibitItem, { color: theme.textMuted }]}>✓ Section 65B Indian Evidence Act Electronic Seal</Text>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setShowEvidenceModal(false)}
                style={[styles.cancelBtn, { borderColor: theme.cardBorder }]}
              >
                <Text style={[styles.cancelBtnText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateEvidencePack}
                style={[styles.submitBtn, { backgroundColor: theme.green }]}
              >
                <Text style={styles.submitBtnText}>Sign & Seal Bundle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  advCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  advTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  advName: {
    fontSize: 15,
    fontWeight: "700",
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  verifiedPillText: {
    fontSize: 9,
    fontWeight: "800",
  },
  firmName: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  barNo: {
    fontSize: 11,
    marginTop: 2,
  },
  scoreBox: {
    alignItems: "center",
  },
  scoreVal: {
    fontSize: 17,
    fontWeight: "800",
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: "600",
  },
  specBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  specText: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  advActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  advActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  advActionBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  matchingCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  boxTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  boxDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  caseSelector: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  caseSelectorText: {
    fontSize: 13,
    fontWeight: "600",
  },
  matchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  matchBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  matchResultBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 14,
  },
  matchResultTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  matchScorePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  matchScorePillText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  matchAdvName: {
    fontSize: 16,
    fontWeight: "800",
  },
  matchFirm: {
    fontSize: 12,
    fontWeight: "600",
  },
  matchReason: {
    fontSize: 12,
    lineHeight: 16,
  },
  assignBtn: {
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  assignBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  generatePackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  generatePackBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  packCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  packTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  packCase: {
    fontSize: 12,
    fontWeight: "800",
  },
  certPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  certPillText: {
    fontSize: 9,
    fontWeight: "800",
  },
  packTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 3,
  },
  packDebtor: {
    fontSize: 11,
    marginTop: 2,
  },
  hashBox: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 8,
  },
  hashLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  hashText: {
    fontSize: 10,
    fontFamily: "monospace",
  },
  packFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
  },
  packTime: {
    fontSize: 10,
  },
  downloadLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  downloadLinkText: {
    fontSize: 11,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 10,
  },
  includedExhibits: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    gap: 4,
  },
  exhibitsTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  exhibitItem: {
    fontSize: 11,
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  submitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
