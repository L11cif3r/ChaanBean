import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { INITIAL_BUYERS, BuyerDebtor } from "../services/dataStore";
import {
  CALLER_DIDS,
  CallerDID,
  simulateRecoveryCall,
  CallSimulationResult,
  generateStatutoryNoticeGovAck,
} from "../services/telephonyEngine";
import { UnreachableModal } from "../components/UnreachableModal";

export const RecoveryScreen: React.FC = () => {
  const { theme } = useTheme();
  const [buyers, setBuyers] = useState<BuyerDebtor[]>(INITIAL_BUYERS);
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerDebtor>(INITIAL_BUYERS[0]);
  const [selectedDid, setSelectedDid] = useState<CallerDID>(CALLER_DIDS[0]);
  const [emergency24x7, setEmergency24x7] = useState<boolean>(true);
  const [calling, setCalling] = useState<boolean>(false);
  const [callStatusText, setCallStatusText] = useState<string | null>(null);
  const [lastCallResult, setLastCallResult] = useState<CallSimulationResult | null>(null);
  const [unreachableModalVisible, setUnreachableModalVisible] = useState<boolean>(false);
  const [noticeSuccessMsg, setNoticeSuccessMsg] = useState<string | null>(null);

  const handleTriggerCall = (buyer: BuyerDebtor, overrideDid?: CallerDID) => {
    setSelectedBuyer(buyer);
    const didToUse = overrideDid || selectedDid;
    setCalling(true);
    setCallStatusText(`Dialing via Asterisk 20 / ${didToUse.city} DID (${didToUse.number})...`);

    setTimeout(() => {
      setCallStatusText("Ringing debtor handset (180 Ringing received)...");
    }, 600);

    setTimeout(() => {
      const result = simulateRecoveryCall(buyer.name, buyer.phone, didToUse.number);
      setLastCallResult(result);
      setCalling(false);
      setCallStatusText(null);

      if (result.outcome === "BUSY_CALL_SCREENED") {
        setUnreachableModalVisible(true);
      }
    }, 1300);
  };

  const handleDispatchStatutoryNotice = (buyer: BuyerDebtor, noticeType: string) => {
    const { ackId, portal, hash } = generateStatutoryNoticeGovAck(noticeType, buyer.pan);
    setNoticeSuccessMsg(
      `Dispatched ${noticeType} for ${buyer.name}!\nOfficial Gov Ack Ref: ${ackId}\nDelivered to: ${portal}\nCryptographic Seal: ${hash}`
    );
    setTimeout(() => setNoticeSuccessMsg(null), 7000);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Hero Header */}
      <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <View style={styles.tagRow}>
              <View style={[styles.teleTag, { backgroundColor: theme.redBg }]}>
                <Ionicons name="radio" size={12} color={theme.red} style={{ marginRight: 4 }} />
                <Text style={[styles.teleTagText, { color: theme.red }]}>TELE-RECOVERY DESK</Text>
              </View>
              <Text style={[styles.codecPill, { color: theme.brand }]}>16kHz PCM Synthesis</Text>
            </View>
            <Text style={[styles.heroTitle, { color: theme.text }]}>Automated Voice & Legal Recovery</Text>
          </View>
        </View>

        {/* CALL All Time Emergency Override Switch */}
        <View style={[styles.overrideRow, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.overrideTitle, { color: theme.text }]}>CALL All Time (24/7 Override)</Text>
            <Text style={[styles.overrideSub, { color: theme.textMuted }]}>
              High-frequency recovery cadence (1m, 2m, 5m, 30m, 1h) bypassing standard TRAI limits for critical defaults
            </Text>
          </View>
          <Switch
            value={emergency24x7}
            onValueChange={setEmergency24x7}
            trackColor={{ false: "#334155", true: theme.brand }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Notice Success Banner */}
      {noticeSuccessMsg && (
        <View style={[styles.noticeBanner, { backgroundColor: theme.greenBg, borderColor: theme.greenBorder }]}>
          <Ionicons name="checkmark-done-circle" size={20} color={theme.green} style={{ marginRight: 8 }} />
          <Text style={[styles.noticeBannerText, { color: theme.green }]}>{noticeSuccessMsg}</Text>
        </View>
      )}

      {/* Live Calling Status Indicator */}
      {calling && (
        <View style={[styles.callingBox, { backgroundColor: theme.brand + "18", borderColor: theme.brand }]}>
          <ActivityIndicator color={theme.brand} size="small" style={{ marginRight: 10 }} />
          <Text style={[styles.callingText, { color: theme.brand }]}>{callStatusText}</Text>
        </View>
      )}

      {/* Selected Caller DID Selector */}
      <View style={[styles.didCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ACTIVE OUTBOUND CALLER DID</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.didScroll}>
          {CALLER_DIDS.map((did) => {
            const isSel = did.id === selectedDid.id;
            return (
              <TouchableOpacity
                key={did.id}
                onPress={() => setSelectedDid(did)}
                style={[
                  styles.didChip,
                  {
                    backgroundColor: isSel ? theme.brand : theme.surfaceSecondary,
                    borderColor: isSel ? theme.brand : theme.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.didCity, { color: isSel ? "#FFFFFF" : theme.text }]}>
                  {did.city} · {did.number}
                </Text>
                <Text style={[styles.didRate, { color: isSel ? "rgba(255,255,255,0.85)" : theme.green }]}>
                  {did.successRate}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Overdue Accounts Recovery Workbench */}
      <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>
        OVERDUE DEBTORS · RECOVERY WORKBENCH
      </Text>

      {buyers.map((buyer) => {
        const isRed = buyer.flag === "red";
        const isAmber = buyer.flag === "amber";

        return (
          <View
            key={buyer.id}
            style={[
              styles.buyerCard,
              {
                backgroundColor: theme.card,
                borderColor: isRed ? theme.redBorder : isAmber ? theme.amberBorder : theme.cardBorder,
              },
            ]}
          >
            <View style={styles.buyerHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={[styles.buyerName, { color: theme.text }]}>{buyer.name}</Text>
                  <View
                    style={[
                      styles.levelPill,
                      {
                        backgroundColor: isRed ? theme.redBg : theme.amberBg,
                        borderColor: isRed ? theme.redBorder : theme.amberBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.levelText, { color: isRed ? theme.red : theme.amber }]}>
                      {buyer.currentLevel} ESCALATION
                    </Text>
                  </View>
                </View>
                <Text style={[styles.buyerContact, { color: theme.textMuted }]}>
                  {buyer.contactPerson} · {buyer.phone}
                </Text>
              </View>

              <View style={styles.buyerAmountCol}>
                <Text style={[styles.amountVal, { color: isRed ? theme.red : theme.amber }]}>
                  ₹{(buyer.outstandingAmount / 100000).toFixed(2)} Lakhs
                </Text>
                <Text style={[styles.overdueDays, { color: theme.textMuted }]}>
                  {buyer.daysOverdue} Days Overdue
                </Text>
              </View>
            </View>

            {/* Quick Recovery Action Buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                onPress={() => handleTriggerCall(buyer)}
                disabled={calling}
                style={[styles.callBtn, { backgroundColor: isRed ? theme.red : theme.brand }]}
              >
                <Ionicons name="call" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.callBtnText}>Trigger Voice Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDispatchStatutoryNotice(buyer, "Section 138 NI Act")}
                style={[styles.noticeBtn, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}
              >
                <Ionicons name="document-text" size={14} color={theme.amber} style={{ marginRight: 6 }} />
                <Text style={[styles.noticeBtnText, { color: theme.text }]}>§138 Notice</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDispatchStatutoryNotice(buyer, "GST §16(4) DRC-01A")}
                style={[styles.noticeBtn, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}
              >
                <Ionicons name="shield-checkmark" size={14} color={theme.purple} style={{ marginRight: 6 }} />
                <Text style={[styles.noticeBtnText, { color: theme.text }]}>GST DRC-01A</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* Unreachable Diagnosis Modal */}
      <UnreachableModal
        visible={unreachableModalVisible}
        buyerName={selectedBuyer.name}
        phone={selectedBuyer.phone}
        selectedDid={selectedDid.number}
        onClose={() => setUnreachableModalVisible(false)}
        onRetryWithDid={(did) => {
          setSelectedDid(did);
          setUnreachableModalVisible(false);
          handleTriggerCall(selectedBuyer, did);
        }}
        onDialAlternate={(num) => {
          setUnreachableModalVisible(false);
          const altBuyer = { ...selectedBuyer, phone: num };
          handleTriggerCall(altBuyer);
        }}
        onDispatchNotice={(channel, ack) => {
          setUnreachableModalVisible(false);
          setNoticeSuccessMsg(`Statutory ${channel} dispatched with Ack #${ack}`);
          setTimeout(() => setNoticeSuccessMsg(null), 6000);
        }}
      />

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
  heroTop: {
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  teleTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  teleTagText: {
    fontSize: 10,
    fontWeight: "800",
  },
  codecPill: {
    fontSize: 11,
    fontWeight: "700",
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  overrideRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  overrideTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  overrideSub: {
    fontSize: 10,
    lineHeight: 14,
  },
  noticeBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  noticeBannerText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
    flex: 1,
  },
  callingBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  callingText: {
    fontSize: 12,
    fontWeight: "700",
  },
  didCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  didScroll: {
    gap: 8,
  },
  didChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  didCity: {
    fontSize: 12,
    fontWeight: "700",
  },
  didRate: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  buyerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  buyerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buyerName: {
    fontSize: 15,
    fontWeight: "800",
  },
  levelPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  levelText: {
    fontSize: 9,
    fontWeight: "800",
  },
  buyerContact: {
    fontSize: 11,
    marginTop: 2,
  },
  buyerAmountCol: {
    alignItems: "flex-end",
  },
  amountVal: {
    fontSize: 15,
    fontWeight: "800",
  },
  overdueDays: {
    fontSize: 10,
    marginTop: 2,
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
  },
  callBtn: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  callBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  noticeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  noticeBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
