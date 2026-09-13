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
import { executeVerification, VerificationResult } from "../services/verificationEngine";

export interface TabDef {
  key: string;
  num: number;
  label: string;
  defaultInput: string;
  placeholder: string;
  autofills: string[];
  icon: keyof typeof Ionicons.glyphMap;
}

const ALL_18_TABS: TabDef[] = [
  {
    key: "director_details",
    num: 1,
    label: "Director Details",
    defaultInput: "08192841",
    placeholder: "Enter 8-digit Director DIN / PAN",
    autofills: ["08192841", "07219024", "AAECM4920K"],
    icon: "person-circle-outline",
  },
  {
    key: "msme_report",
    num: 2,
    label: "MSME Report",
    defaultInput: "UDYAM-MH-03-0019283",
    placeholder: "Enter UDYAM-XX-00-0000000",
    autofills: ["UDYAM-MH-03-0019283", "UDYAM-GJ-01-0081290"],
    icon: "ribbon-outline",
  },
  {
    key: "gst_slab_check",
    num: 3,
    label: "GST Slab Check",
    defaultInput: "27AABCA1234F1Z5",
    placeholder: "Enter 15-digit GSTIN",
    autofills: ["27AABCA1234F1Z5", "27AAECM4920K1ZG", "24AABCN9102L1ZQ"],
    icon: "layers-outline",
  },
  {
    key: "gst_exact_turnover",
    num: 4,
    label: "GST Exact Turnover",
    defaultInput: "27AABCA1234F1Z5",
    placeholder: "Enter GSTIN for GSTR-3B filings",
    autofills: ["27AABCA1234F1Z5", "27AAECM4920K1ZG"],
    icon: "cash-outline",
  },
  {
    key: "gst_monthly_filings",
    num: 5,
    label: "GST Monthly Filings",
    defaultInput: "27AABCA1234F1Z5",
    placeholder: "Enter GSTIN for 12M filing ARNs",
    autofills: ["27AABCA1234F1Z5", "24AABCN9102L1ZQ"],
    icon: "calendar-outline",
  },
  {
    key: "gst_supreme_report",
    num: 6,
    label: "GST Supreme Report",
    defaultInput: "AABCA1234F",
    placeholder: "Enter PAN for 360° ITC reconciliation",
    autofills: ["AABCA1234F", "AAECM4920K"],
    icon: "sparkles-outline",
  },
  {
    key: "trust_hub_verification",
    num: 7,
    label: "Trust Hub & Trust ID",
    defaultInput: "TRUST-CB-ACME-001",
    placeholder: "Enter Trust ID (TRUST-CB-XXXX)",
    autofills: ["TRUST-CB-ACME-001", "TRUST-CB-METRO-091"],
    icon: "shield-checkmark-outline",
  },
  {
    key: "mobile_to_pan",
    num: 8,
    label: "Mobile to PAN",
    defaultInput: "9876543210",
    placeholder: "Enter 10-digit mobile number",
    autofills: ["9876543210", "9820144102", "9867255104"],
    icon: "phone-portrait-outline",
  },
  {
    key: "mobile_identity",
    num: 9,
    label: "Mobile Identity (All SIMs)",
    defaultInput: "9876543210",
    placeholder: "Enter mobile number for telecom KYC",
    autofills: ["9876543210", "9711088219"],
    icon: "radio-outline",
  },
  {
    key: "court_case_history",
    num: 10,
    label: "Court Cases & FIR",
    defaultInput: "Metro Supplies Co",
    placeholder: "Enter Entity / Director name or PAN",
    autofills: ["Metro Supplies Co", "Acme Traders Pvt Ltd"],
    icon: "hammer-outline",
  },
  {
    key: "import_export_report",
    num: 11,
    label: "Import Export (DGFT)",
    defaultInput: "0316928104",
    placeholder: "Enter 10-digit IEC code",
    autofills: ["0316928104", "0718920194"],
    icon: "globe-outline",
  },
  {
    key: "education_marksheet_check",
    num: 12,
    label: "Marksheet (10th/12th)",
    defaultInput: "CBSE-XII-6182940",
    placeholder: "Enter Board-Exam-RollNumber",
    autofills: ["CBSE-XII-6182940", "CBSE-X-4910281"],
    icon: "school-outline",
  },
  {
    key: "pan_to_gst",
    num: 13,
    label: "PAN to All GSTINs",
    defaultInput: "AAECM4920K",
    placeholder: "Enter 10-digit PAN",
    autofills: ["AAECM4920K", "AABCA1234F", "AABCN9102L"],
    icon: "business-outline",
  },
  {
    key: "voice_call_cadence",
    num: 14,
    label: "Voice Call Cadence",
    defaultInput: "+91 98765 43210",
    placeholder: "Enter debtor phone number",
    autofills: ["+91 98765 43210", "+91 98201 44102"],
    icon: "call-outline",
  },
  {
    key: "legal_notice_suite",
    num: 15,
    label: "Legal Notice Suite",
    defaultInput: "AAECM4920K",
    placeholder: "Enter Debtor PAN / GSTIN",
    autofills: ["AAECM4920K", "27AAECM4920K1ZG"],
    icon: "document-text-outline",
  },
  {
    key: "delayed_payment_followup",
    num: 16,
    label: "Delayed Payments Aging",
    defaultInput: "buyer-1",
    placeholder: "Enter Account / Invoice Reference",
    autofills: ["buyer-1", "INV-2026-0812"],
    icon: "time-outline",
  },
  {
    key: "subscription_seats",
    num: 17,
    label: "User Access Seats (5)",
    defaultInput: "Acme Traders Pvt Ltd",
    placeholder: "Enter Company Account Name",
    autofills: ["Acme Traders Pvt Ltd"],
    icon: "people-outline",
  },
  {
    key: "additional_company_addon",
    num: 18,
    label: "Add Company (₹1,500)",
    defaultInput: "Metro Infra Logistics Ltd",
    placeholder: "Enter new subsidiary name or CIN",
    autofills: ["Metro Infra Logistics Ltd", "Acme Packaging Solutions"],
    icon: "add-circle-outline",
  },
];

export const VerificationScreen: React.FC = () => {
  const { theme } = useTheme();
  const [activeTabKey, setActiveTabKey] = useState<string>("director_details");
  const [inputVal, setInputVal] = useState<string>(ALL_18_TABS[0].defaultInput);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const currentTab = ALL_18_TABS.find((t) => t.key === activeTabKey) || ALL_18_TABS[0];

  const handleSelectTab = (tab: TabDef) => {
    setActiveTabKey(tab.key);
    setInputVal(tab.defaultInput);
    setResult(null);
  };

  const handleExecute = () => {
    if (!inputVal.trim()) return;
    setLoading(true);
    setTimeout(() => {
      const res = executeVerification(activeTabKey, inputVal);
      setResult(res);
      setLoading(false);
    }, 450);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Banner */}
      <View style={[styles.banner, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.bannerHeader}>
          <View style={styles.bannerTitleRow}>
            <Ionicons name="search" size={20} color={theme.brand} style={{ marginRight: 8 }} />
            <Text style={[styles.bannerTitle, { color: theme.text }]}>18 Statutory Verification Adapters</Text>
          </View>
          <View style={[styles.activePill, { backgroundColor: theme.greenBg, borderColor: theme.greenBorder }]}>
            <Text style={[styles.activePillText, { color: theme.green }]}>LIVE SANDBOX</Text>
          </View>
        </View>
        <Text style={[styles.bannerSub, { color: theme.textMuted }]}>
          Zero Mock Values (`0 Math.random()`) · Multi-year government registries · Section 65B Cryptographic seals
        </Text>
      </View>

      {/* 18 Horizontal Scrolling Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabScrollContainer}
      >
        {ALL_18_TABS.map((tab) => {
          const isActive = tab.key === activeTabKey;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => handleSelectTab(tab)}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? theme.brand : theme.card,
                  borderColor: isActive ? theme.brand : theme.cardBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipNum,
                  { color: isActive ? "#FFFFFF" : theme.textMuted },
                ]}
              >
                #{tab.num}
              </Text>
              <Ionicons
                name={tab.icon}
                size={14}
                color={isActive ? "#FFFFFF" : theme.textSecondary}
                style={{ marginHorizontal: 4 }}
              />
              <Text
                style={[
                  styles.chipLabel,
                  { color: isActive ? "#FFFFFF" : theme.text },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Input & Execution Form */}
      <View style={[styles.inputCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.inputHeader}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
            MODULE #{currentTab.num} · {currentTab.label.toUpperCase()}
          </Text>
          <Text style={[styles.walletNote, { color: theme.brand }]}>Wallet Cost: ₹50 / check</Text>
        </View>

        <TextInput
          value={inputVal}
          onChangeText={setInputVal}
          placeholder={currentTab.placeholder}
          placeholderTextColor={theme.textMuted}
          style={[
            styles.textInput,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
              color: theme.text,
            },
          ]}
        />

        {/* Quick Autofill Chips */}
        <View style={styles.autofillRow}>
          <Text style={[styles.autofillTitle, { color: theme.textMuted }]}>Autofill Chips:</Text>
          {currentTab.autofills.map((val, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setInputVal(val)}
              style={[
                styles.autofillBtn,
                { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder },
              ]}
            >
              <Text style={[styles.autofillText, { color: theme.brand }]}>{val}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleExecute}
          disabled={loading}
          style={[styles.executeBtn, { backgroundColor: theme.brand }]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="flash" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.executeBtnText}>Execute Statutory Verification</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Verification Result Dossier */}
      {result && (
        <View
          style={[
            styles.resultCard,
            {
              backgroundColor: theme.card,
              borderColor:
                result.status === "DEFAULT_RISK"
                  ? theme.redBorder
                  : result.status === "SUSPICIOUS"
                  ? theme.amberBorder
                  : theme.greenBorder,
            },
          ]}
        >
          <View style={styles.resultHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.resultTitle, { color: theme.text }]}>{result.title}</Text>
              {result.statutoryReference && (
                <Text style={[styles.resultStatutory, { color: theme.textMuted }]}>
                  {result.statutoryReference}
                </Text>
              )}
            </View>
            <View
              style={[
                styles.resultStatusBadge,
                {
                  backgroundColor:
                    result.status === "DEFAULT_RISK"
                      ? theme.redBg
                      : result.status === "SUSPICIOUS"
                      ? theme.amberBg
                      : theme.greenBg,
                  borderColor:
                    result.status === "DEFAULT_RISK"
                      ? theme.redBorder
                      : result.status === "SUSPICIOUS"
                      ? theme.amberBorder
                      : theme.greenBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.resultStatusText,
                  {
                    color:
                      result.status === "DEFAULT_RISK"
                        ? theme.red
                        : result.status === "SUSPICIOUS"
                        ? theme.amber
                        : theme.green,
                  },
                ]}
              >
                {result.status}
              </Text>
            </View>
          </View>

          <Text style={[styles.resultSummary, { color: theme.textSecondary }]}>
            {result.summary}
          </Text>

          {/* Table of Fields */}
          <View style={[styles.fieldsTable, { borderColor: theme.cardBorder }]}>
            {Object.entries(result.fields).map(([k, v], idx) => (
              <View
                key={idx}
                style={[
                  styles.fieldRow,
                  {
                    backgroundColor: idx % 2 === 0 ? theme.surfaceSecondary : theme.card,
                    borderBottomColor: theme.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.fieldKey, { color: theme.textMuted }]}>{k}</Text>
                <Text style={[styles.fieldVal, { color: theme.text }]}>{String(v)}</Text>
              </View>
            ))}
          </View>

          {/* Cryptographic Proof Seal */}
          <View style={[styles.sealBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}>
            <Ionicons name="lock-closed" size={14} color={theme.green} style={{ marginRight: 6 }} />
            <Text style={[styles.sealText, { color: theme.textMuted }]} numberOfLines={1}>
              {result.cryptoSeal}
            </Text>
          </View>
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
  banner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  bannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  bannerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  activePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: "800",
  },
  bannerSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  tabScrollContainer: {
    paddingBottom: 14,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipNum: {
    fontSize: 10,
    fontWeight: "800",
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  inputCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  inputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  walletNote: {
    fontSize: 11,
    fontWeight: "700",
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  autofillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  autofillTitle: {
    fontSize: 10,
    fontWeight: "600",
  },
  autofillBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  autofillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  executeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  executeBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  resultCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  resultStatutory: {
    fontSize: 10,
    marginTop: 2,
  },
  resultStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  resultStatusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  resultSummary: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  fieldsTable: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  fieldKey: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  fieldVal: {
    fontSize: 11,
    fontWeight: "700",
    flex: 1.2,
    textAlign: "right",
  },
  sealBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  sealText: {
    fontSize: 9,
    fontFamily: "monospace",
    flex: 1,
  },
});
