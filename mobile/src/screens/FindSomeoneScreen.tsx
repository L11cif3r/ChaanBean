import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { OMNITRACE_DATA, OmniTraceReport } from "../services/dataStore";

export const FindSomeoneScreen: React.FC<{ onDialNumber?: (phone: string) => void }> = ({
  onDialNumber,
}) => {
  const { theme } = useTheme();
  const [query, setQuery] = useState<string>("Metro Supplies Co");
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<OmniTraceReport | null>(OMNITRACE_DATA["Metro Supplies Co"]);
  const [activeVectorTab, setActiveVectorTab] = useState<
    "all" | "mobiles" | "emails" | "addresses" | "digital" | "bank" | "bureaus" | "pan"
  >("all");
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);

  const sampleQueries = [
    "Metro Supplies Co",
    "9876543210",
    "AAECM4920K",
    "Nexus Polymers Ltd",
  ];

  const handleSearch = (q: string) => {
    setLoading(true);
    setTimeout(() => {
      const found = OMNITRACE_DATA[q] || OMNITRACE_DATA["Metro Supplies Co"];
      setReport(found);
      setLoading(false);
    }, 400);
  };

  const handleCopy = (text: string, label: string) => {
    setCopiedMsg(`Copied ${label}: ${text}`);
    setTimeout(() => setCopiedMsg(null), 2500);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* OmniTrace Hero Header */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.brand + "40",
          },
        ]}
      >
        <View style={styles.badgeRow}>
          <View style={[styles.highlightBadge, { backgroundColor: theme.brand }]}>
            <Ionicons name="sparkles" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.highlightText}>FEATURE HIGHLIGHT · OMNITRACE 360™</Text>
          </View>
          <Text style={[styles.vectorPill, { color: theme.brand }]}>9 Deep Identity Vectors</Text>
        </View>

        <Text style={[styles.heroTitle, { color: theme.text }]}>
          Debtor Skip-Tracing & Intelligence
        </Text>
        <Text style={[styles.heroDesc, { color: theme.textSecondary }]}>
          Resolve uncontactable debtors across delivery clusters (Swiggy, Amazon, Blinkit, Zomato), multi-bureau ratings, and banking rails.
        </Text>
      </View>

      {/* Search Box */}
      <View style={[styles.searchCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={18} color={theme.brand} style={{ marginRight: 8 }} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search Debtor Name, Phone, PAN, or GSTIN"
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.text }]}
          />
        </View>

        {/* Quick Sample Chips */}
        <View style={styles.samplesRow}>
          <Text style={[styles.samplesLabel, { color: theme.textMuted }]}>Try Quick:</Text>
          {sampleQueries.map((s, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => {
                setQuery(s);
                handleSearch(s);
              }}
              style={[styles.sampleChip, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}
            >
              <Text style={[styles.sampleText, { color: theme.brand }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => handleSearch(query)}
          disabled={loading}
          style={[styles.searchBtn, { backgroundColor: theme.brand }]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="scan" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.searchBtnText}>Run OmniTrace 360™ Skip-Trace</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {copiedMsg && (
        <View style={[styles.copyToast, { backgroundColor: theme.greenBg, borderColor: theme.greenBorder }]}>
          <Ionicons name="checkmark-circle" size={16} color={theme.green} style={{ marginRight: 6 }} />
          <Text style={[styles.copyText, { color: theme.green }]}>{copiedMsg}</Text>
        </View>
      )}

      {/* Vector Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {[
          { key: "all", label: "All 9 Vectors" },
          { key: "mobiles", label: "1. Mobiles (Delivery)" },
          { key: "emails", label: "2. Emails" },
          { key: "addresses", label: "3. Addresses" },
          { key: "digital", label: "4. Digital Age" },
          { key: "bank", label: "5. Bank & Branch" },
          { key: "bureaus", label: "6-8. Bureaus (CIBIL/Exp/CRIF)" },
          { key: "pan", label: "9. PAN Entity" },
        ].map((tab) => {
          const isSel = activeVectorTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveVectorTab(tab.key as any)}
              style={[
                styles.filterTab,
                {
                  backgroundColor: isSel ? theme.brand : theme.card,
                  borderColor: isSel ? theme.brand : theme.cardBorder,
                },
              ]}
            >
              <Text style={[styles.filterTabText, { color: isSel ? "#FFFFFF" : theme.textSecondary }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Report Vectors Display */}
      {report && (
        <View style={{ gap: 14 }}>
          {/* Vector 1: Alternate Mobiles */}
          {(activeVectorTab === "all" || activeVectorTab === "mobiles") && (
            <View style={[styles.vectorCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.vectorHeader}>
                <View style={styles.vectorHeaderLeft}>
                  <Ionicons name="call" size={16} color={theme.brand} style={{ marginRight: 6 }} />
                  <Text style={[styles.vectorTitle, { color: theme.text }]}>
                    Vector 1: Consumer Delivery App Alternate Mobiles
                  </Text>
                </View>
                <Text style={[styles.vectorCount, { color: theme.brand }]}>
                  {report.alternateMobiles.length} Linked Numbers
                </Text>
              </View>

              {report.alternateMobiles.map((m, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.mobileItem,
                    { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.mobileRowTop}>
                      <Text style={[styles.mobileNumber, { color: theme.text }]}>{m.number}</Text>
                      <View style={[styles.confPill, { backgroundColor: theme.greenBg }]}>
                        <Text style={[styles.confText, { color: theme.green }]}>{m.confidence}</Text>
                      </View>
                    </View>
                    <Text style={[styles.mobileSource, { color: theme.brand }]}>{m.source}</Text>
                    <Text style={[styles.mobileMeta, { color: theme.textMuted }]}>
                      {m.carrier} · {m.circle} · {m.lastActive}
                    </Text>
                  </View>

                  <View style={styles.mobileActions}>
                    <TouchableOpacity
                      onPress={() => handleCopy(m.number, "Phone")}
                      style={[styles.actionSquare, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                    >
                      <Ionicons name="copy-outline" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => onDialNumber?.(m.number)}
                      style={[styles.dialSquare, { backgroundColor: theme.brand }]}
                    >
                      <Ionicons name="call" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Vector 2: Alternate Emails */}
          {(activeVectorTab === "all" || activeVectorTab === "emails") && (
            <View style={[styles.vectorCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.vectorHeader}>
                <View style={styles.vectorHeaderLeft}>
                  <Ionicons name="mail" size={16} color={theme.blue} style={{ marginRight: 6 }} />
                  <Text style={[styles.vectorTitle, { color: theme.text }]}>
                    Vector 2: Alternate Email Addresses
                  </Text>
                </View>
              </View>

              {report.alternateEmails.map((e, idx) => (
                <View
                  key={idx}
                  style={[styles.emailItem, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.emailText, { color: theme.text }]}>{e.email}</Text>
                    <Text style={[styles.emailSub, { color: theme.textMuted }]}>{e.source}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleCopy(e.email, "Email")}
                    style={[styles.actionSquare, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                  >
                    <Ionicons name="copy-outline" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Vector 3: Alternate Addresses */}
          {(activeVectorTab === "all" || activeVectorTab === "addresses") && (
            <View style={[styles.vectorCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.vectorHeader}>
                <View style={styles.vectorHeaderLeft}>
                  <Ionicons name="location" size={16} color={theme.purple} style={{ marginRight: 6 }} />
                  <Text style={[styles.vectorTitle, { color: theme.text }]}>
                    Vector 3: All Alternate Physical Addresses
                  </Text>
                </View>
              </View>

              {report.alternateAddresses.map((a, idx) => (
                <View
                  key={idx}
                  style={[styles.addrItem, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}
                >
                  <View style={styles.addrTop}>
                    <Text style={[styles.addrType, { color: theme.brand }]}>{a.type}</Text>
                    <Text style={[styles.addrSource, { color: theme.textMuted }]}>{a.source}</Text>
                  </View>
                  <Text style={[styles.addrText, { color: theme.text }]}>{a.address}</Text>
                  <Text style={[styles.addrCity, { color: theme.textMuted }]}>
                    {a.city}, {a.state} - {a.pincode}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Vector 4: Digital Age & Footprint */}
          {(activeVectorTab === "all" || activeVectorTab === "digital") && (
            <View style={[styles.vectorCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.vectorHeader}>
                <View style={styles.vectorHeaderLeft}>
                  <Ionicons name="globe" size={16} color={theme.green} style={{ marginRight: 6 }} />
                  <Text style={[styles.vectorTitle, { color: theme.text }]}>
                    Vector 4: Digital Age & Footprint
                  </Text>
                </View>
              </View>

              <View style={styles.grid2x2}>
                <View style={[styles.gridCell, { backgroundColor: theme.surfaceSecondary }]}>
                  <Text style={[styles.gridVal, { color: theme.brand }]}>
                    {report.digitalFootprint.tenureYears} Yrs {report.digitalFootprint.tenureMonths} Mos
                  </Text>
                  <Text style={[styles.gridSub, { color: theme.textMuted }]}>Digital Footprint Tenure</Text>
                </View>

                <View style={[styles.gridCell, { backgroundColor: theme.surfaceSecondary }]}>
                  <Text style={[styles.gridVal, { color: theme.green }]}>
                    {report.digitalFootprint.totalOnlineActivityScore}/100
                  </Text>
                  <Text style={[styles.gridSub, { color: theme.textMuted }]}>Online Activity Index</Text>
                </View>

                <View style={[styles.gridCellFull, { backgroundColor: theme.surfaceSecondary }]}>
                  <Text style={[styles.cellHeading, { color: theme.text }]}>Earliest Statutory Filing</Text>
                  <Text style={[styles.cellBody, { color: theme.textSecondary }]}>
                    {report.digitalFootprint.earliestStatutoryFiling}
                  </Text>
                  <Text style={[styles.cellHeading, { color: theme.text, marginTop: 6 }]}>Fintech Adoption</Text>
                  <Text style={[styles.cellBody, { color: theme.textSecondary }]}>
                    {report.digitalFootprint.fintechAdoptionIndex}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Vector 5: Bank & Branch */}
          {(activeVectorTab === "all" || activeVectorTab === "bank") && (
            <View style={[styles.vectorCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.vectorHeader}>
                <View style={styles.vectorHeaderLeft}>
                  <Ionicons name="business" size={16} color={theme.amber} style={{ marginRight: 6 }} />
                  <Text style={[styles.vectorTitle, { color: theme.text }]}>
                    Vector 5: Origin Bank & Physical Branch Street Address
                  </Text>
                </View>
              </View>

              <View style={[styles.bankBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}>
                <Text style={[styles.bankName, { color: theme.text }]}>{report.bankDetails.bankName}</Text>
                <Text style={[styles.bankBranch, { color: theme.brand }]}>{report.bankDetails.branchName}</Text>
                <Text style={[styles.bankAddr, { color: theme.textSecondary }]}>
                  {report.bankDetails.physicalAddress}
                </Text>

                <View style={styles.bankFieldsRow}>
                  <View>
                    <Text style={[styles.bfKey, { color: theme.textMuted }]}>IFSC Code</Text>
                    <Text style={[styles.bfVal, { color: theme.text }]}>{report.bankDetails.ifsc}</Text>
                  </View>
                  <View>
                    <Text style={[styles.bfKey, { color: theme.textMuted }]}>MICR</Text>
                    <Text style={[styles.bfVal, { color: theme.text }]}>{report.bankDetails.micr}</Text>
                  </View>
                  <View>
                    <Text style={[styles.bfKey, { color: theme.textMuted }]}>Masked Account</Text>
                    <Text style={[styles.bfVal, { color: theme.text }]}>{report.bankDetails.accountMasked}</Text>
                  </View>
                </View>

                <View style={styles.bankUtrRow}>
                  <Text style={[styles.bfKey, { color: theme.textMuted }]}>Verified Clearing UTR:</Text>
                  <Text style={[styles.utrVal, { color: theme.blue }]}>{report.bankDetails.lastVerifiedUtr}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Vectors 6, 7, 8: Commercial Bureaus */}
          {(activeVectorTab === "all" || activeVectorTab === "bureaus") && (
            <View style={[styles.vectorCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.vectorHeader}>
                <View style={styles.vectorHeaderLeft}>
                  <Ionicons name="speedometer" size={16} color={theme.red} style={{ marginRight: 6 }} />
                  <Text style={[styles.vectorTitle, { color: theme.text }]}>
                    Vectors 6, 7, 8: Commercial Credit Bureaus
                  </Text>
                </View>
              </View>

              <View style={styles.bureauGrid}>
                {/* CIBIL */}
                <View style={[styles.bureauBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}>
                  <Text style={[styles.bureauName, { color: theme.brand }]}>CIBIL COMMERCIAL</Text>
                  <Text style={[styles.bureauScore, { color: theme.red }]}>{report.cibilReport.score}</Text>
                  <Text style={[styles.bureauSub, { color: theme.textMuted }]}>Rank: {report.cibilReport.commercialRank}/10</Text>
                  <Text style={[styles.bureauSub, { color: theme.red }]}>90+ DPD: {report.cibilReport.dpd90Plus} lines</Text>
                </View>

                {/* Experian */}
                <View style={[styles.bureauBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}>
                  <Text style={[styles.bureauName, { color: theme.blue }]}>EXPERIAN B2B</Text>
                  <Text style={[styles.bureauScore, { color: theme.red }]}>{report.experianReport.score}</Text>
                  <Text style={[styles.bureauSub, { color: theme.textMuted }]}>{report.experianReport.riskCategory}</Text>
                  <Text style={[styles.bureauSub, { color: theme.red }]}>Def Prob: {report.experianReport.defaultProbabilityPct}%</Text>
                </View>

                {/* CRIF */}
                <View style={[styles.bureauBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}>
                  <Text style={[styles.bureauName, { color: theme.purple }]}>CRIF HIGH MARK</Text>
                  <Text style={[styles.bureauScore, { color: theme.red }]}>{report.crifReport.score}</Text>
                  <Text style={[styles.bureauSub, { color: theme.textMuted }]}>Index: {report.crifReport.reliabilityIndex}/100</Text>
                  <Text style={[styles.bureauSub, { color: theme.amber }]}>{report.crifReport.recentInquiriesCount} Inquiries</Text>
                </View>
              </View>
            </View>
          )}

          {/* Vector 9: PAN & Legal Entity */}
          {(activeVectorTab === "all" || activeVectorTab === "pan") && (
            <View style={[styles.vectorCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.vectorHeader}>
                <View style={styles.vectorHeaderLeft}>
                  <Ionicons name="card" size={16} color={theme.green} style={{ marginRight: 6 }} />
                  <Text style={[styles.vectorTitle, { color: theme.text }]}>
                    Vector 9: PAN & Legal Entity Verification
                  </Text>
                </View>
              </View>

              <View style={[styles.panBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}>
                <Text style={[styles.panLegalName, { color: theme.text }]}>{report.panVerification.legalName}</Text>
                <View style={styles.panRow}>
                  <Text style={[styles.panCode, { color: theme.brand }]}>PAN: {report.panVerification.pan}</Text>
                  <View style={[styles.panPill, { backgroundColor: theme.greenBg }]}>
                    <Text style={[styles.panPillText, { color: theme.green }]}>
                      {report.panVerification.aadhaarLinked ? "Aadhaar Linked" : "Unlinked"}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.panStatus, { color: theme.textSecondary }]}>
                  Status: {report.panVerification.status} · {report.panVerification.multiStateGstinCount} Multi-State GSTINs
                </Text>
              </View>
            </View>
          )}
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
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  highlightBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  highlightText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  vectorPill: {
    fontSize: 11,
    fontWeight: "700",
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  heroDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  searchCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    paddingVertical: 8,
  },
  samplesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  samplesLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  sampleChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  sampleText: {
    fontSize: 11,
    fontWeight: "700",
  },
  searchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  copyToast: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  copyText: {
    fontSize: 11,
    fontWeight: "700",
  },
  filterScroll: {
    paddingBottom: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: "700",
  },
  vectorCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  vectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  vectorHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  vectorTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  vectorCount: {
    fontSize: 11,
    fontWeight: "700",
  },
  mobileItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  mobileRowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mobileNumber: {
    fontSize: 14,
    fontWeight: "800",
  },
  confPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  confText: {
    fontSize: 9,
    fontWeight: "800",
  },
  mobileSource: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  mobileMeta: {
    fontSize: 10,
    marginTop: 2,
  },
  mobileActions: {
    flexDirection: "row",
    gap: 6,
  },
  actionSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dialSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  emailItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  emailText: {
    fontSize: 13,
    fontWeight: "700",
  },
  emailSub: {
    fontSize: 10,
    marginTop: 2,
  },
  addrItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  addrTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  addrType: {
    fontSize: 11,
    fontWeight: "700",
  },
  addrSource: {
    fontSize: 10,
  },
  addrText: {
    fontSize: 12,
    fontWeight: "600",
  },
  addrCity: {
    fontSize: 11,
    marginTop: 2,
  },
  grid2x2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridCell: {
    width: "48%",
    borderRadius: 10,
    padding: 10,
  },
  gridVal: {
    fontSize: 15,
    fontWeight: "800",
  },
  gridSub: {
    fontSize: 10,
    marginTop: 2,
  },
  gridCellFull: {
    width: "100%",
    borderRadius: 10,
    padding: 10,
  },
  cellHeading: {
    fontSize: 11,
    fontWeight: "700",
  },
  cellBody: {
    fontSize: 11,
    marginTop: 2,
  },
  bankBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  bankName: {
    fontSize: 14,
    fontWeight: "800",
  },
  bankBranch: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  bankAddr: {
    fontSize: 11,
    marginTop: 2,
  },
  bankFieldsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  bfKey: {
    fontSize: 10,
  },
  bfVal: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  bankUtrRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  utrVal: {
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "700",
  },
  bureauGrid: {
    flexDirection: "row",
    gap: 8,
  },
  bureauBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
  },
  bureauName: {
    fontSize: 9,
    fontWeight: "800",
  },
  bureauScore: {
    fontSize: 20,
    fontWeight: "900",
    marginVertical: 4,
  },
  bureauSub: {
    fontSize: 9,
    textAlign: "center",
    marginTop: 2,
  },
  panBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  panLegalName: {
    fontSize: 13,
    fontWeight: "800",
  },
  panRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  panCode: {
    fontSize: 12,
    fontWeight: "800",
  },
  panPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  panPillText: {
    fontSize: 9,
    fontWeight: "700",
  },
  panStatus: {
    fontSize: 10,
  },
});
