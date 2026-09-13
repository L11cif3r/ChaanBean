import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { CALLER_DIDS, CallerDID, generateStatutoryNoticeGovAck } from "../services/telephonyEngine";

interface UnreachableModalProps {
  visible: boolean;
  buyerName: string;
  phone: string;
  selectedDid: string;
  onClose: () => void;
  onRetryWithDid: (did: CallerDID) => void;
  onDialAlternate: (num: string) => void;
  onDispatchNotice: (channel: string, ack: string) => void;
}

export const UnreachableModal: React.FC<UnreachableModalProps> = ({
  visible,
  buyerName,
  phone,
  selectedDid,
  onClose,
  onRetryWithDid,
  onDialAlternate,
  onDispatchNotice,
}) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<"dids" | "channels" | "alternates">("dids");
  const [actionDoneMsg, setActionDoneMsg] = useState<string | null>(null);

  const alternateNumbers = [
    { source: "Swiggy Delivery Cluster", number: "+91 98205 11984", time: "Active 3h ago" },
    { source: "Amazon Delivery Address Book", number: "+91 97690 44211", time: "Active 2d ago" },
    { source: "Blinkit Fast Delivery (Warehouse)", number: "+91 99201 88344", time: "Active Today" },
    { source: "WhatsApp Business Direct", number: "+91 98210 66522", time: "Online Now" },
  ];

  const handleChannelDispatch = (channel: string) => {
    const { ackId, portal } = generateStatutoryNoticeGovAck(channel, "METRO4920K");
    setActionDoneMsg(`Dispatched via ${channel}! Ack Ref: ${ackId} (${portal})`);
    onDispatchNotice(channel, ackId);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconCircle, { backgroundColor: theme.redBg }]}>
                <Ionicons name="alert-circle" size={24} color={theme.red} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.text }]}>Call Unreachable Diagnosed</Text>
                <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                  {buyerName} ({phone}) · SIP 486 / Q.850 Cause 17
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Diagnostic Alert Box */}
          <View style={[styles.diagBox, { backgroundColor: theme.redBg, borderColor: theme.redBorder }]}>
            <Text style={[styles.diagTitle, { color: theme.red }]}>
              Reason: Call Screening / Carrier Busy Detected
            </Text>
            <Text style={[styles.diagDesc, { color: theme.textSecondary }]}>
              The debtor device appears to have filtered the call or engaged auto-rejection. Switch outbound calling number (DID) or dispatch statutory legal notice channels.
            </Text>
          </View>

          {actionDoneMsg && (
            <View style={[styles.successBox, { backgroundColor: theme.greenBg, borderColor: theme.greenBorder }]}>
              <Ionicons name="checkmark-circle" size={16} color={theme.green} style={{ marginRight: 6 }} />
              <Text style={[styles.successText, { color: theme.green }]}>{actionDoneMsg}</Text>
            </View>
          )}

          {/* Action Tabs */}
          <View style={[styles.tabBar, { borderColor: theme.cardBorder }]}>
            <TouchableOpacity
              onPress={() => setActiveTab("dids")}
              style={[
                styles.tabBtn,
                activeTab === "dids" && { borderBottomColor: theme.brand, borderBottomWidth: 2 },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === "dids" ? theme.brand : theme.textMuted },
                ]}
              >
                1. Switch DID
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("channels")}
              style={[
                styles.tabBtn,
                activeTab === "channels" && { borderBottomColor: theme.brand, borderBottomWidth: 2 },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === "channels" ? theme.brand : theme.textMuted },
                ]}
              >
                2. Legal Notices
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("alternates")}
              style={[
                styles.tabBtn,
                activeTab === "alternates" && { borderBottomColor: theme.brand, borderBottomWidth: 2 },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === "alternates" ? theme.brand : theme.textMuted },
                ]}
              >
                3. Alternate Mobiles
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          <ScrollView style={styles.scrollArea}>
            {activeTab === "dids" && (
              <View style={styles.tabContent}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  Select Alternate Enterprise Outbound DID
                </Text>
                {CALLER_DIDS.map((did) => {
                  const isCurrent = did.number === selectedDid;
                  return (
                    <TouchableOpacity
                      key={did.id}
                      onPress={() => onRetryWithDid(did)}
                      style={[
                        styles.itemCard,
                        {
                          backgroundColor: theme.card,
                          borderColor: isCurrent ? theme.brand : theme.cardBorder,
                        },
                      ]}
                    >
                      <View style={styles.itemRow}>
                        <View>
                          <Text style={[styles.itemTitle, { color: theme.text }]}>
                            {did.city} · {did.number}
                          </Text>
                          <Text style={[styles.itemSub, { color: theme.textMuted }]}>
                            {did.label}
                          </Text>
                        </View>
                        <View style={styles.itemRight}>
                          <View
                            style={[
                              styles.ratePill,
                              { backgroundColor: theme.greenBg, borderColor: theme.greenBorder },
                            ]}
                          >
                            <Text style={[styles.rateText, { color: theme.green }]}>
                              {did.successRate}
                            </Text>
                          </View>
                          <Ionicons name="call" size={16} color={theme.brand} style={{ marginLeft: 8 }} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {activeTab === "channels" && (
              <View style={styles.tabContent}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  Statutory 1-Click Multi-Channel Escalation
                </Text>

                <TouchableOpacity
                  onPress={() => handleChannelDispatch("WhatsApp Formal Notice")}
                  style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                >
                  <View style={styles.itemRow}>
                    <View style={styles.channelIconRow}>
                      <Ionicons name="logo-whatsapp" size={22} color="#25D366" style={{ marginRight: 10 }} />
                      <View>
                        <Text style={[styles.itemTitle, { color: theme.text }]}>WhatsApp Statutory Notice</Text>
                        <Text style={[styles.itemSub, { color: theme.textMuted }]}>
                          Sends formatted notice with instant UPI/Bank payment link
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="send" size={16} color={theme.brand} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleChannelDispatch("Income Tax §43B(h) Notice")}
                  style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                >
                  <View style={styles.itemRow}>
                    <View style={styles.channelIconRow}>
                      <Ionicons name="document-text" size={22} color={theme.amber} style={{ marginRight: 10 }} />
                      <View>
                        <Text style={[styles.itemTitle, { color: theme.text }]}>Income Tax §43B(h) Notice</Text>
                        <Text style={[styles.itemSub, { color: theme.textMuted }]}>
                          Reports pending expense disallowance to ITD repository
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="send" size={16} color={theme.brand} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleChannelDispatch("GST §16(4) DRC-01A Notice")}
                  style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                >
                  <View style={styles.itemRow}>
                    <View style={styles.channelIconRow}>
                      <Ionicons name="shield-checkmark" size={22} color={theme.purple} style={{ marginRight: 10 }} />
                      <View>
                        <Text style={[styles.itemTitle, { color: theme.text }]}>GST §16(4) DRC-01A Pre-Notice</Text>
                        <Text style={[styles.itemSub, { color: theme.textMuted }]}>
                          Generates Government Ack # for buyer ITC invalidation
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="send" size={16} color={theme.brand} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleChannelDispatch("DLT Priority SMS")}
                  style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                >
                  <View style={styles.itemRow}>
                    <View style={styles.channelIconRow}>
                      <Ionicons name="chatbubble-ellipses" size={22} color={theme.blue} style={{ marginRight: 10 }} />
                      <View>
                        <Text style={[styles.itemTitle, { color: theme.text }]}>Priority TRAI DLT SMS</Text>
                        <Text style={[styles.itemSub, { color: theme.textMuted }]}>
                          High-priority telecom alert bypassing promotional DND
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="send" size={16} color={theme.brand} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "alternates" && (
              <View style={styles.tabContent}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  Skip-Traced Numbers (OmniTrace 360™ Clusters)
                </Text>
                {alternateNumbers.map((alt, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => onDialAlternate(alt.number)}
                    style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                  >
                    <View style={styles.itemRow}>
                      <View>
                        <Text style={[styles.itemTitle, { color: theme.text }]}>{alt.number}</Text>
                        <Text style={[styles.itemSub, { color: theme.brand }]}>{alt.source}</Text>
                        <Text style={[styles.itemMeta, { color: theme.textMuted }]}>{alt.time}</Text>
                      </View>
                      <View style={[styles.dialBtn, { backgroundColor: theme.brand }]}>
                        <Ionicons name="call" size={16} color="#FFFFFF" />
                        <Text style={styles.dialBtnText}>Dial Now</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer Close */}
          <TouchableOpacity
            onPress={onClose}
            style={[styles.dismissBtn, { backgroundColor: theme.surfaceSecondary }]}
          >
            <Text style={[styles.dismissText, { color: theme.text }]}>Dismiss Diagnosis</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  diagBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  diagTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  diagDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  successText: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
  },
  scrollArea: {
    maxHeight: 320,
  },
  tabContent: {
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  itemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  channelIconRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  itemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  itemMeta: {
    fontSize: 10,
    marginTop: 2,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  rateText: {
    fontSize: 10,
    fontWeight: "700",
  },
  dialBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  dialBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  dismissBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  dismissText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
