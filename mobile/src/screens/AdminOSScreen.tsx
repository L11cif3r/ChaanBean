import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

export const AdminOSScreen: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<"pipeline" | "leads" | "customers" | "marketing" | "financials">("pipeline");
  const [leadSourceFilter, setLeadSourceFilter] = useState<string>("all");
  const [leadAdvisorFilter, setLeadAdvisorFilter] = useState<string>("all");

  const stages = [
    { name: "1. Lead", count: 8, val: "₹18.4L" },
    { name: "2. Qualified", count: 5, val: "₹14.2L" },
    { name: "3. Demo", count: 4, val: "₹11.0L" },
    { name: "4. Proposal", count: 3, val: "₹9.5L" },
    { name: "5. Negotiation", count: 2, val: "₹6.8L" },
    { name: "6. Won", count: 12, val: "₹44.0L" },
    { name: "7. Live", count: 10, val: "₹38.5L" },
  ];

  const sourceROI = [
    { source: "youtube", label: "YouTube Video Ads", icon: "logo-youtube", color: "#EF4444", leads: 8, wins: 4, winRate: "50%", spend: "₹42,000", cpl: "₹5,250", cac: "₹10,500", rec: "Scale Budget (+45%)", tag: "scale" },
    { source: "facebook", label: "Facebook Feeds & Reels", icon: "logo-facebook", color: "#1877F2", leads: 9, wins: 3, winRate: "33.3%", spend: "₹48,000", cpl: "₹5,333", cac: "₹16,000", rec: "Maintain Spend (35%)", tag: "maintain" },
    { source: "instagram", label: "Instagram Carousels", icon: "logo-instagram", color: "#EC4899", leads: 7, wins: 2, winRate: "28.6%", spend: "₹35,000", cpl: "₹5,000", cac: "₹17,500", rec: "Reduce Broad Spend", tag: "reduce" },
    { source: "word_of_mouth", label: "Word of Mouth / Peer", icon: "people", color: "#10B981", leads: 3, wins: 2, winRate: "66.7%", spend: "₹0", cpl: "₹0", cac: "₹0", rec: "Organic Peer Loop", tag: "organic" },
    { source: "direct", label: "Direct Web Search", icon: "globe-outline", color: "#F59E0B", leads: 4, wins: 2, winRate: "50%", spend: "₹0", cpl: "₹0", cac: "₹0", rec: "Organic Inbound", tag: "organic" },
  ];

  const advisorsList = [
    { id: "adv-1", name: "Siddharth Verma", role: "Executive Owner & Counsel", phone: "+91 98112 34567", deals: 8, quota: "₹34L" },
    { id: "adv-2", name: "Rajesh Nair", role: "Senior Collections & MSME", phone: "+91 98450 12345", deals: 9, quota: "₹28L" },
    { id: "adv-3", name: "Pooja Deshmukh", role: "Underwriting & Due Diligence", phone: "+91 97123 45678", deals: 11, quota: "₹42L" },
    { id: "adv-4", name: "Sneha Kulkarni", role: "Statutory Disputes Liaison", phone: "+91 99201 98765", deals: 6, quota: "₹19L" },
  ];

  const sampleLeads = [
    { id: "lead-1", name: "Dr. Ananya Sharma", company: "Nexus Bio-Pharma", source: "youtube", status: "Won", assigned: "Pooja Deshmukh", amount: "₹39,999/mo", survey: "GST: Yes · Defaulted" },
    { id: "lead-2", name: "Sunil K. Agarwal", company: "Agarwal Timber Mart", source: "youtube", status: "Demo", assigned: "Siddharth Verma", amount: "₹14,999/mo", survey: "GST: Yes · Delayed" },
    { id: "lead-3", name: "Vikram Malhotra", company: "Malhotra Metal & Alloys", source: "facebook", status: "Negotiation", assigned: "Rajesh Nair", amount: "₹39,999/mo", survey: "GST: Yes · Defaulted" },
    { id: "lead-4", name: "Venkat Rao", company: "Godavari Sugar Mills", source: "word_of_mouth", status: "Won", assigned: "Pooja Deshmukh", amount: "₹39,999/mo", survey: "GST: Yes · Both" },
    { id: "lead-5", name: "Ramesh Patel", company: "Patel Agro Foods", source: "direct", status: "Qualified", assigned: "Sneha Kulkarni", amount: "₹14,999/mo", survey: "GST: Yes · Delayed" },
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
            7-Stage CRM · Leads & Ad Spend ROI · 4 Senior Advisors · Customer Health · MRR Waterfall
          </Text>
        </View>

        {/* Tab Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {[
            { key: "pipeline", label: "CRM Pipeline" },
            { key: "leads", label: "Leads & Ad ROI" },
            { key: "customers", label: "Customer Health" },
            { key: "marketing", label: "Attribution" },
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

        {/* Tab 2: Leads & Ad Spend ROI Intelligence */}
        {activeTab === "leads" && (
          <View style={{ gap: 14 }}>
            {/* Ad Spend vs Wins ROI Radar */}
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Ad Attribution: Leads vs. Wins ROI</Text>
              <Text style={[styles.cardSub, { color: theme.textMuted }]}>
                Real-time channel win rates and budget optimization recommendations
              </Text>

              {sourceROI.map((s, idx) => (
                <View
                  key={idx}
                  style={[styles.sourceRoiCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}
                >
                  <View style={styles.sourceHeader}>
                    <View style={styles.sourceLeft}>
                      <Ionicons name={s.icon as any} size={18} color={s.color} style={{ marginRight: 8 }} />
                      <Text style={[styles.sourceName, { color: theme.text }]}>{s.label}</Text>
                    </View>
                    <View style={[styles.winBadge, { backgroundColor: s.color + "20" }]}>
                      <Text style={[styles.winRateText, { color: s.color }]}>{s.winRate} Win Rate</Text>
                    </View>
                  </View>

                  <View style={styles.sourceMetricsRow}>
                    <View style={styles.sourceMetricCol}>
                      <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Leads</Text>
                      <Text style={[styles.metricNum, { color: theme.text }]}>{s.leads}</Text>
                    </View>
                    <View style={styles.sourceMetricCol}>
                      <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Subscribed</Text>
                      <Text style={[styles.metricNum, { color: theme.green }]}>{s.wins}</Text>
                    </View>
                    <View style={styles.sourceMetricCol}>
                      <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Ad Spend</Text>
                      <Text style={[styles.metricNum, { color: theme.brand }]}>{s.spend}</Text>
                    </View>
                    <View style={styles.sourceMetricCol}>
                      <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Cost / Win</Text>
                      <Text style={[styles.metricNum, { color: theme.textSecondary }]}>{s.cac}</Text>
                    </View>
                  </View>

                  <View style={[styles.recRow, { backgroundColor: theme.card }]}>
                    <Ionicons name="sparkles" size={12} color={theme.brand} style={{ marginRight: 4 }} />
                    <Text style={[styles.recText, { color: theme.text }]}>{s.rec}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Senior Advisors Team */}
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Assigned Executive Advisors</Text>
              {advisorsList.map((adv) => (
                <View
                  key={adv.id}
                  style={[styles.advisorRow, { borderBottomColor: theme.cardBorder }]}
                >
                  <View style={[styles.advAvatar, { backgroundColor: theme.brand + "18" }]}>
                    <Ionicons name="person" size={16} color={theme.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.advName, { color: theme.text }]}>{adv.name}</Text>
                    <Text style={[styles.advRole, { color: theme.textMuted }]}>{adv.role}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.advQuota, { color: theme.green }]}>{adv.deals} Won</Text>
                    <Text style={[styles.advVal, { color: theme.textSecondary }]}>{adv.quota}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Recent Leads Feed */}
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Live Inbound Leads & Surveys</Text>
              {sampleLeads.map((lead) => (
                <View
                  key={lead.id}
                  style={[styles.leadItem, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}
                >
                  <View style={styles.leadTop}>
                    <View>
                      <Text style={[styles.leadName, { color: theme.text }]}>{lead.name}</Text>
                      <Text style={[styles.leadComp, { color: theme.brand }]}>{lead.company}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: theme.greenBg }]}>
                      <Text style={[styles.statusPillText, { color: theme.green }]}>{lead.status}</Text>
                    </View>
                  </View>
                  <Text style={[styles.leadSurvey, { color: theme.textMuted }]}>{lead.survey}</Text>
                  <View style={styles.leadBottom}>
                    <Text style={[styles.leadAdv, { color: theme.textSecondary }]}>Rep: {lead.assigned}</Text>
                    <Text style={[styles.leadAmt, { color: theme.brand }]}>{lead.amount}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tab 3: Customer Health */}
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
  cardSub: {
    fontSize: 11,
    marginBottom: 12,
    marginTop: -8,
  },
  sourceRoiCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  sourceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sourceLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  sourceName: {
    fontSize: 13,
    fontWeight: "800",
  },
  winBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  winRateText: {
    fontSize: 10,
    fontWeight: "800",
  },
  sourceMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sourceMetricCol: {
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 9,
  },
  metricNum: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  recRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
    borderRadius: 6,
  },
  recText: {
    fontSize: 10,
    fontWeight: "600",
  },
  advisorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  advAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  advName: {
    fontSize: 13,
    fontWeight: "800",
  },
  advRole: {
    fontSize: 10,
    marginTop: 2,
  },
  advQuota: {
    fontSize: 11,
    fontWeight: "800",
  },
  advVal: {
    fontSize: 10,
    marginTop: 2,
  },
  leadItem: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  leadTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  leadName: {
    fontSize: 13,
    fontWeight: "800",
  },
  leadComp: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: "800",
  },
  leadSurvey: {
    fontSize: 10,
    marginTop: 4,
  },
  leadBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 6,
  },
  leadAdv: {
    fontSize: 10,
  },
  leadAmt: {
    fontSize: 11,
    fontWeight: "800",
  },
});
