import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

export const AdminOSScreen: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<"pipeline" | "customers" | "marketing" | "financials">("pipeline");

  const stages = [
    { name: "1. Lead", count: 8, val: "₹18.4L" },
    { name: "2. Qualified", count: 5, val: "₹14.2L" },
    { name: "3. Demo", count: 4, val: "₹11.0L" },
    { name: "4. Proposal", count: 3, val: "₹9.5L" },
    { name: "5. Negotiation", count: 2, val: "₹6.8L" },
    { name: "6. Won", count: 12, val: "₹44.0L" },
    { name: "7. Live", count: 10, val: "₹38.5L" },
  ];

  const funnels = [
    { name: "Organic Search (LegAn / MSME Recovery)", leads: 142, deals: 18, share: "34%" },
    { name: "Trust Hub Referrals", leads: 98, deals: 14, share: "26%" },
    { name: "WhatsApp Inbound Inquiries", leads: 84, deals: 11, share: "20%" },
    { name: "Industry Associations & Partners", leads: 46, deals: 7, share: "12%" },
    { name: "Paid Acquisition (B2B Fintech)", leads: 32, deals: 4, share: "8%" },
  ];

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
            <View style={[styles.adminPill, { backgroundColor: theme.brand + "20" }]}>
              <Ionicons name="settings" size={12} color={theme.brand} style={{ marginRight: 4 }} />
              <Text style={[styles.adminPillText, { color: theme.brand }]}>OWNER / ADMIN OS</Text>
            </View>
            <Text style={[styles.arrTag, { color: theme.green }]}>ARR: ₹48.2 Lakhs</Text>
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>Executive Operations OS</Text>
          <Text style={[styles.heroDesc, { color: theme.textSecondary }]}>
            7-Stage CRM Pipeline · Customer Health Scores · Marketing Attribution · MRR Waterfall
          </Text>
        </View>

        {/* Tab Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {[
            { key: "pipeline", label: "CRM Pipeline (7-Stage)" },
            { key: "customers", label: "Customer Health" },
            { key: "marketing", label: "Attribution (7 Funnels)" },
            { key: "financials", label: "MRR Waterfall" },
          ].map((t) => {
            const isSel = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setActiveTab(t.key as any)}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isSel ? theme.brand : theme.card,
                    borderColor: isSel ? theme.brand : theme.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.tabChipText, { color: isSel ? "#FFFFFF" : theme.textSecondary }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tab 1: 7-Stage CRM Pipeline */}
        {activeTab === "pipeline" && (
          <View style={{ gap: 10 }}>
            {stages.map((st, idx) => (
              <View
                key={idx}
                style={[styles.stageCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              >
                <View style={styles.stageHeader}>
                  <Text style={[styles.stageName, { color: theme.text }]}>{st.name}</Text>
                  <Text style={[styles.stageVal, { color: theme.brand }]}>{st.val}</Text>
                </View>
                <View style={styles.stageProgressRow}>
                  <View style={[styles.stageBarWrap, { backgroundColor: theme.surfaceSecondary }]}>
                    <View style={[styles.stageBar, { width: `${(st.count / 14) * 100}%`, backgroundColor: theme.brand }]} />
                  </View>
                  <Text style={[styles.stageCountText, { color: theme.textMuted }]}>{st.count} Deals</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Tab 2: Customer Health */}
        {activeTab === "customers" && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Customer Engagement Ledger</Text>
            <View style={[styles.customerItem, { backgroundColor: theme.surfaceSecondary }]}>
              <View style={styles.custTop}>
                <Text style={[styles.custName, { color: theme.text }]}>Acme Traders Pvt Ltd</Text>
                <View style={[styles.healthPill, { backgroundColor: theme.greenBg }]}>
                  <Text style={[styles.healthText, { color: theme.green }]}>Healthy</Text>
                </View>
              </View>
              <Text style={[styles.custPlan, { color: theme.brand }]}>Plan: Growth (₹15,000 / mo)</Text>
              <Text style={[styles.custWallet, { color: theme.textSecondary }]}>Wallet Balance: ₹98,250</Text>
              <Text style={[styles.custUsage, { color: theme.textMuted }]}>
                128 Verification Checks Run · 14 Outbound Recovery Calls
              </Text>
            </View>

            <View style={[styles.customerItem, { backgroundColor: theme.surfaceSecondary, marginTop: 10 }]}>
              <View style={styles.custTop}>
                <Text style={[styles.custName, { color: theme.text }]}>Kavita Enterprises</Text>
                <View style={[styles.healthPill, { backgroundColor: theme.greenBg }]}>
                  <Text style={[styles.healthText, { color: theme.green }]}>Healthy</Text>
                </View>
              </View>
              <Text style={[styles.custPlan, { color: theme.brand }]}>Plan: Enterprise (₹35,000 / mo)</Text>
              <Text style={[styles.custWallet, { color: theme.textSecondary }]}>Wallet Balance: ₹240,000</Text>
              <Text style={[styles.custUsage, { color: theme.textMuted }]}>
                310 Verification Checks Run · 42 Outbound Recovery Calls
              </Text>
            </View>
          </View>
        )}

        {/* Tab 3: Marketing Attribution */}
        {activeTab === "marketing" && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Acquisition Channels Attribution</Text>
            {funnels.map((f, idx) => (
              <View
                key={idx}
                style={[styles.funnelItem, { borderBottomColor: theme.cardBorder }]}
              >
                <View style={styles.funnelTop}>
                  <Text style={[styles.funnelName, { color: theme.text }]}>{f.name}</Text>
                  <Text style={[styles.funnelShare, { color: theme.brand }]}>{f.share}</Text>
                </View>
                <Text style={[styles.funnelStats, { color: theme.textMuted }]}>
                  {f.leads} Inbound Leads ➔ {f.deals} Converted Enterprise Subscriptions
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Tab 4: MRR Waterfall */}
        {activeTab === "financials" && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>MRR Waterfall & ARR Forecast</Text>

            <View style={styles.mrrGrid}>
              <View style={[styles.mrrCell, { backgroundColor: theme.surfaceSecondary }]}>
                <Text style={[styles.mrrLabel, { color: theme.textMuted }]}>New MRR</Text>
                <Text style={[styles.mrrVal, { color: theme.green }]}>+ ₹75,000</Text>
              </View>
              <View style={[styles.mrrCell, { backgroundColor: theme.surfaceSecondary }]}>
                <Text style={[styles.mrrLabel, { color: theme.textMuted }]}>Expansion MRR</Text>
                <Text style={[styles.mrrVal, { color: theme.brand }]}>+ ₹30,000</Text>
              </View>
              <View style={[styles.mrrCell, { backgroundColor: theme.surfaceSecondary }]}>
                <Text style={[styles.mrrLabel, { color: theme.textMuted }]}>Churned MRR</Text>
                <Text style={[styles.mrrVal, { color: theme.red }]}>- ₹15,000</Text>
              </View>
              <View style={[styles.mrrCell, { backgroundColor: theme.surfaceSecondary }]}>
                <Text style={[styles.mrrLabel, { color: theme.textMuted }]}>Net Monthly MRR</Text>
                <Text style={[styles.mrrVal, { color: theme.text }]}>₹4,01,666</Text>
              </View>
            </View>

            <View style={[styles.arrBox, { backgroundColor: theme.greenBg, borderColor: theme.greenBorder }]}>
              <Text style={[styles.arrLabel, { color: theme.green }]}>Annualized Run Rate (ARR):</Text>
              <Text style={[styles.arrVal, { color: theme.green }]}>₹48,20,000</Text>
              <Text style={[styles.arrSub, { color: theme.textSecondary }]}>
                Projected 12M Growth: +42% with Trust Hub Viral Referrals
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  adminPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adminPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  arrTag: {
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
  tabScroll: {
    gap: 8,
    paddingBottom: 14,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  stageCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  stageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  stageName: {
    fontSize: 13,
    fontWeight: "800",
  },
  stageVal: {
    fontSize: 12,
    fontWeight: "800",
  },
  stageProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stageBarWrap: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  stageBar: {
    height: 6,
    borderRadius: 3,
  },
  stageCountText: {
    fontSize: 10,
    fontWeight: "600",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
  },
  customerItem: {
    borderRadius: 12,
    padding: 12,
  },
  custTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  custName: {
    fontSize: 14,
    fontWeight: "800",
  },
  healthPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  healthText: {
    fontSize: 9,
    fontWeight: "800",
  },
  custPlan: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  custWallet: {
    fontSize: 11,
    marginTop: 2,
  },
  custUsage: {
    fontSize: 10,
    marginTop: 4,
  },
  funnelItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  funnelTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  funnelName: {
    fontSize: 12,
    fontWeight: "700",
  },
  funnelShare: {
    fontSize: 11,
    fontWeight: "800",
  },
  funnelStats: {
    fontSize: 10,
    marginTop: 2,
  },
  mrrGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  mrrCell: {
    width: "48%",
    borderRadius: 10,
    padding: 10,
  },
  mrrLabel: {
    fontSize: 10,
  },
  mrrVal: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },
  arrBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  arrLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  arrVal: {
    fontSize: 24,
    fontWeight: "900",
    marginVertical: 4,
  },
  arrSub: {
    fontSize: 10,
  },
});
