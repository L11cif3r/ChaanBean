import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import {
  INITIAL_INVOICES,
  INITIAL_PTPS,
  INITIAL_RECONCILIATIONS,
  InvoiceItem,
  PromiseToPay,
  ReconciliationItem,
} from "../services/dataStore";

interface CollectionsScreenProps {
  onClose?: () => void;
}

export const CollectionsScreen: React.FC<CollectionsScreenProps> = ({ onClose }) => {
  const { theme } = useTheme();
  const [invoices, setInvoices] = useState<InvoiceItem[]>(INITIAL_INVOICES);
  const [ptps, setPtps] = useState<PromiseToPay[]>(INITIAL_PTPS);
  const [reconciliations, setReconciliations] = useState<ReconciliationItem[]>(
    INITIAL_RECONCILIATIONS
  );
  const [activeTab, setActiveTab] = useState<"invoices" | "ptp" | "reconcile">("invoices");

  // Interactive Modals
  const [showPtpModal, setShowPtpModal] = useState(false);
  const [newPtpBuyer, setNewPtpBuyer] = useState("Sunrise Distributors");
  const [newPtpAmount, setNewPtpAmount] = useState("250000");
  const [newPtpDate, setNewPtpDate] = useState("2026-09-30");
  const [newPtpMode, setNewPtpMode] = useState("NEFT / RTGS");
  const [newPtpNotes, setNewPtpNotes] = useState("");

  const [selectedUpiInvoice, setSelectedUpiInvoice] = useState<InvoiceItem | null>(null);
  const [noticeSentBanner, setNoticeSentBanner] = useState<string | null>(null);

  // Totals
  const totalOutstanding = invoices.reduce((acc, inv) => acc + inv.amount - inv.paidAmount, 0);
  const totalReconciled = reconciliations.reduce((acc, r) => acc + r.amountPaid, 0);

  const handleSendReminder = (inv: InvoiceItem, channel: "whatsapp" | "sms") => {
    setNoticeSentBanner(`Dispatched ${channel.toUpperCase()} payment notice for ${inv.invoiceNo} to ${inv.buyerName}`);
    setTimeout(() => setNoticeSentBanner(null), 3500);
  };

  const handleAddPtp = () => {
    if (!newPtpAmount) return;
    const item: PromiseToPay = {
      id: `ptp-${Date.now()}`,
      buyerName: newPtpBuyer,
      amount: parseFloat(newPtpAmount),
      promisedDate: newPtpDate,
      paymentMode: newPtpMode,
      status: "PENDING",
      notes: newPtpNotes || "Committed payment date logged by collector.",
    };
    setPtps([item, ...ptps]);
    setShowPtpModal(false);
    setNewPtpNotes("");
  };

  const handleReconcileItem = (id: string) => {
    setReconciliations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, verified: true } : r))
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Banner */}
      <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.badgeRow}>
          <View style={[styles.phasePill, { backgroundColor: theme.blueBg, borderColor: theme.blueBorder }]}>
            <Text style={[styles.phasePillText, { color: theme.blue }]}>PHASE 4: SMART COLLECTIONS</Text>
          </View>
          <View style={styles.liveIndicator}>
            <View style={[styles.pulsingDot, { backgroundColor: theme.brand }]} />
            <Text style={[styles.liveText, { color: theme.brand }]}>AUTO DISPATCH READY</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Payment Collections Desk</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Dynamic UPI & Virtual Account payment links, automated multi-channel notices, and PTP commitments.
        </Text>

        {noticeSentBanner && (
          <View style={[styles.feedbackBox, { backgroundColor: theme.greenBg, borderColor: theme.greenBorder }]}>
            <Ionicons name="checkmark-circle" size={16} color={theme.green} />
            <Text style={[styles.feedbackText, { color: theme.green }]}>{noticeSentBanner}</Text>
          </View>
        )}
      </View>

      {/* KPI Cards Grid */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Outstanding Ledger</Text>
          <Text style={[styles.kpiValue, { color: theme.red }]}>
            ₹{(totalOutstanding / 100000).toFixed(2)} L
          </Text>
          <Text style={[styles.kpiSub, { color: theme.textMuted }]}>{invoices.length} Unsettled Invoices</Text>
        </View>

        <View style={[styles.kpiBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Collected & Cleared</Text>
          <Text style={[styles.kpiValue, { color: theme.green }]}>
            ₹{(totalReconciled / 100000).toFixed(2)} L
          </Text>
          <Text style={[styles.kpiSub, { color: theme.textMuted }]}>Via Virtual Escrow</Text>
        </View>

        <View style={[styles.kpiBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Active Commitments</Text>
          <Text style={[styles.kpiValue, { color: theme.amber }]}>
            {ptps.filter((p) => p.status === "PENDING").length} PTPs
          </Text>
          <Text style={[styles.kpiSub, { color: theme.textMuted }]}>Under Follow-up</Text>
        </View>

        <View style={[styles.kpiBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Virtual Accounts</Text>
          <Text style={[styles.kpiValue, { color: theme.brand }]}>4 Active</Text>
          <Text style={[styles.kpiSub, { color: theme.textMuted }]}>ICICI Escrow Integration</Text>
        </View>
      </View>

      {/* Segmented Switcher */}
      <View style={[styles.tabSelector, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}>
        <TouchableOpacity
          onPress={() => setActiveTab("invoices")}
          style={[
            styles.tabItem,
            activeTab === "invoices" && { backgroundColor: theme.card, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 3 },
          ]}
        >
          <Ionicons
            name="receipt-outline"
            size={16}
            color={activeTab === "invoices" ? theme.brand : theme.textMuted}
          />
          <Text
            style={[
              styles.tabItemText,
              { color: activeTab === "invoices" ? theme.text : theme.textMuted },
            ]}
          >
            Invoices ({invoices.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("ptp")}
          style={[
            styles.tabItem,
            activeTab === "ptp" && { backgroundColor: theme.card, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 3 },
          ]}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={activeTab === "ptp" ? theme.amber : theme.textMuted}
          />
          <Text
            style={[
              styles.tabItemText,
              { color: activeTab === "ptp" ? theme.text : theme.textMuted },
            ]}
          >
            PTP Tracker ({ptps.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("reconcile")}
          style={[
            styles.tabItem,
            activeTab === "reconcile" && { backgroundColor: theme.card, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 3 },
          ]}
        >
          <Ionicons
            name="checkbox-outline"
            size={16}
            color={activeTab === "reconcile" ? theme.green : theme.textMuted}
          />
          <Text
            style={[
              styles.tabItemText,
              { color: activeTab === "reconcile" ? theme.text : theme.textMuted },
            ]}
          >
            Reconcile ({reconciliations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab 1: Invoices Ledger */}
      {activeTab === "invoices" && (
        <View style={{ gap: 12, marginBottom: 30 }}>
          {invoices.map((inv) => {
            const isOverdue = inv.daysOverdue > 0;
            return (
              <View
                key={inv.id}
                style={[
                  styles.invoiceCard,
                  { backgroundColor: theme.card, borderColor: isOverdue ? theme.redBorder : theme.cardBorder },
                ]}
              >
                <View style={styles.invTopRow}>
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={[styles.invoiceNo, { color: theme.brand }]}>{inv.invoiceNo}</Text>
                      <View
                        style={[
                          styles.overdueBadge,
                          {
                            backgroundColor: isOverdue ? theme.redBg : theme.greenBg,
                            borderColor: isOverdue ? theme.redBorder : theme.greenBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.overdueBadgeText,
                            { color: isOverdue ? theme.red : theme.green },
                          ]}
                        >
                          {isOverdue ? `${inv.daysOverdue}D OVERDUE` : "CURRENT"}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.buyerName, { color: theme.text }]}>{inv.buyerName}</Text>
                    <Text style={[styles.buyerPan, { color: theme.textMuted }]}>
                      PAN: {inv.buyerPan} · VA: {inv.virtualAccNo}
                    </Text>
                  </View>

                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.invAmount, { color: theme.text }]}>
                      ₹{(inv.amount / 100000).toFixed(2)} L
                    </Text>
                    <Text style={[styles.dueDateText, { color: theme.textMuted }]}>
                      Due: {inv.dueDate}
                    </Text>
                  </View>
                </View>

                {/* Dispatch & Link Actions */}
                <View style={styles.invActionsRow}>
                  <TouchableOpacity
                    onPress={() => handleSendReminder(inv, "whatsapp")}
                    style={[styles.invActionBtn, { backgroundColor: "#25D366" + "18", borderColor: "#25D366" + "40" }]}
                  >
                    <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
                    <Text style={[styles.invActionBtnText, { color: "#25D366" }]}>WhatsApp</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleSendReminder(inv, "sms")}
                    style={[styles.invActionBtn, { backgroundColor: theme.blueBg, borderColor: theme.blueBorder }]}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={15} color={theme.blue} />
                    <Text style={[styles.invActionBtnText, { color: theme.blue }]}>SMS Notice</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setSelectedUpiInvoice(inv)}
                    style={[styles.invActionBtn, { backgroundColor: theme.brandBg, borderColor: theme.brandBorder }]}
                  >
                    <Ionicons name="qr-code-outline" size={15} color={theme.brand} />
                    <Text style={[styles.invActionBtnText, { color: theme.brand }]}>UPI QR Pay</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Tab 2: Promise to Pay Tracker */}
      {activeTab === "ptp" && (
        <View style={{ gap: 12, marginBottom: 30 }}>
          <TouchableOpacity
            onPress={() => setShowPtpModal(true)}
            style={[styles.addPtpBtn, { backgroundColor: theme.brand }]}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.addPtpBtnText}>Log New Promise to Pay (PTP)</Text>
          </TouchableOpacity>

          {ptps.map((p) => {
            const isKept = p.status === "KEPT";
            const isBroken = p.status === "BROKEN";
            const statusColor = isKept ? theme.green : isBroken ? theme.red : theme.amber;
            const statusBg = isKept ? theme.greenBg : isBroken ? theme.redBg : theme.amberBg;

            return (
              <View
                key={p.id}
                style={[styles.ptpCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              >
                <View style={styles.ptpTop}>
                  <View>
                    <Text style={[styles.ptpBuyer, { color: theme.text }]}>{p.buyerName}</Text>
                    <Text style={[styles.ptpDate, { color: theme.textMuted }]}>
                      Promised Date: {p.promisedDate} · via {p.paymentMode}
                    </Text>
                  </View>

                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.ptpAmount, { color: theme.text }]}>
                      ₹{(p.amount / 100000).toFixed(2)} L
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                      <Text style={[styles.statusPillText, { color: statusColor }]}>{p.status}</Text>
                    </View>
                  </View>
                </View>

                <Text style={[styles.ptpNotes, { color: theme.textSecondary }]}>{p.notes}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Tab 3: Payment Reconciliations */}
      {activeTab === "reconcile" && (
        <View style={{ gap: 12, marginBottom: 30 }}>
          {reconciliations.map((rec) => (
            <View
              key={rec.id}
              style={[styles.recCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <View style={styles.recTop}>
                <View>
                  <Text style={[styles.recBuyer, { color: theme.text }]}>{rec.buyerName}</Text>
                  <Text style={[styles.recSub, { color: theme.textMuted }]}>
                    Inv: {rec.invoiceNo} · Ref: {rec.refNo}
                  </Text>
                  <Text style={[styles.recDate, { color: theme.textMuted }]}>
                    Date: {rec.date} ({rec.mode})
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.recAmount, { color: theme.green }]}>
                    ₹{(rec.amountPaid / 100000).toFixed(2)} L
                  </Text>

                  {rec.verified ? (
                    <View style={styles.verifiedRow}>
                      <Ionicons name="checkmark-circle" size={14} color={theme.green} />
                      <Text style={[styles.verifiedText, { color: theme.green }]}>Reconciled</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleReconcileItem(rec.id)}
                      style={[styles.reconcileBtn, { backgroundColor: theme.greenBg, borderColor: theme.greenBorder }]}
                    >
                      <Text style={[styles.reconcileBtnText, { color: theme.green }]}>Match & Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Modal: New PTP */}
      <Modal visible={showPtpModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Log Promise to Pay</Text>
              <TouchableOpacity onPress={() => setShowPtpModal(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Debtor Name</Text>
            <TextInput
              value={newPtpBuyer}
              onChangeText={setNewPtpBuyer}
              style={[styles.input, { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.cardBorder }]}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Promised Amount (₹)</Text>
            <TextInput
              value={newPtpAmount}
              onChangeText={setNewPtpAmount}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.cardBorder }]}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Promised Date (YYYY-MM-DD)</Text>
            <TextInput
              value={newPtpDate}
              onChangeText={setNewPtpDate}
              style={[styles.input, { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.cardBorder }]}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Payment Channel</Text>
            <TextInput
              value={newPtpMode}
              onChangeText={setNewPtpMode}
              style={[styles.input, { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.cardBorder }]}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Collector Call Notes</Text>
            <TextInput
              value={newPtpNotes}
              onChangeText={setNewPtpNotes}
              placeholder="E.g. Debtor confirmed part settlement via NEFT."
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.cardBorder, height: 60 }]}
              multiline
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setShowPtpModal(false)}
                style={[styles.cancelBtn, { borderColor: theme.cardBorder }]}
              >
                <Text style={[styles.cancelBtnText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddPtp}
                style={[styles.submitBtn, { backgroundColor: theme.brand }]}
              >
                <Text style={styles.submitBtnText}>Save PTP Record</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: UPI QR Pay */}
      <Modal visible={!!selectedUpiInvoice} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Dynamic UPI QR Payment</Text>
              <TouchableOpacity onPress={() => setSelectedUpiInvoice(null)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedUpiInvoice && (
              <View style={{ alignItems: "center", paddingVertical: 16 }}>
                <View style={styles.qrPlaceholder}>
                  <Ionicons name="qr-code" size={140} color="#111" />
                </View>
                <Text style={[styles.qrAmount, { color: theme.text }]}>
                  ₹{selectedUpiInvoice.amount.toLocaleString("en-IN")}
                </Text>
                <Text style={[styles.qrSub, { color: theme.textMuted }]}>
                  Invoice {selectedUpiInvoice.invoiceNo} · {selectedUpiInvoice.buyerName}
                </Text>

                <View style={[styles.vaBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}>
                  <Text style={[styles.vaLabel, { color: theme.textMuted }]}>Virtual Escrow Account</Text>
                  <Text style={[styles.vaValue, { color: theme.brand }]}>
                    {selectedUpiInvoice.virtualAccNo}
                  </Text>
                  <Text style={[styles.vaBank, { color: theme.textSecondary }]}>
                    IFSC: ICIC0000104 · ICICI Bank Corporate
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setSelectedUpiInvoice(null)}
                  style={[styles.closeQrBtn, { backgroundColor: theme.brand }]}
                >
                  <Text style={styles.closeQrBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
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
  invoiceCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  invTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  invoiceNo: {
    fontSize: 13,
    fontWeight: "800",
  },
  overdueBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  overdueBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  buyerName: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  buyerPan: {
    fontSize: 11,
    marginTop: 2,
  },
  invAmount: {
    fontSize: 16,
    fontWeight: "800",
  },
  dueDateText: {
    fontSize: 11,
    marginTop: 2,
  },
  invActionsRow: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#ffffff10",
    paddingTop: 10,
  },
  invActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  invActionBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  addPtpBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addPtpBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  ptpCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  ptpTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  ptpBuyer: {
    fontSize: 14,
    fontWeight: "700",
  },
  ptpDate: {
    fontSize: 11,
    marginTop: 2,
  },
  ptpAmount: {
    fontSize: 15,
    fontWeight: "800",
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: "800",
  },
  ptpNotes: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: "italic",
  },
  recCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  recTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  recBuyer: {
    fontSize: 14,
    fontWeight: "700",
  },
  recSub: {
    fontSize: 11,
    marginTop: 2,
  },
  recDate: {
    fontSize: 10,
    marginTop: 2,
  },
  recAmount: {
    fontSize: 15,
    fontWeight: "800",
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "700",
  },
  reconcileBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
  },
  reconcileBtnText: {
    fontSize: 10,
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
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
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
  qrPlaceholder: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  qrAmount: {
    fontSize: 22,
    fontWeight: "900",
  },
  qrSub: {
    fontSize: 12,
    marginTop: 2,
  },
  vaBox: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 14,
    alignItems: "center",
  },
  vaLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  vaValue: {
    fontSize: 15,
    fontWeight: "800",
    marginVertical: 2,
  },
  vaBank: {
    fontSize: 11,
  },
  closeQrBtn: {
    width: "100%",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  closeQrBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});
