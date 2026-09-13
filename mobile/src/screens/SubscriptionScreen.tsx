import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

interface PlanTier {
  id: string;
  priceKey: string;
  name: string;
  tagline: string;
  price: number;
  popular?: boolean;
  badge?: string;
  features: string[];
  ctaText: string;
}

const SUBSCRIPTION_PLANS: PlanTier[] = [
  {
    id: "starter",
    priceKey: "starter_subscription",
    name: "Starter Plan",
    tagline: "Essential credit scoring and statutory debt recovery for single-proprietor MSMEs.",
    price: 4999,
    features: [
      "1 User Seat included",
      "50 Business Background Checks / month",
      "Standard Outbound Voice Recovery",
      "Statutory MSME Samadhaan Filing",
      "Basic Trade Credit Risk Radar",
      "Email & In-App Support",
    ],
    ctaText: "Select Starter Plan",
  },
  {
    id: "growth",
    priceKey: "growth_subscription",
    name: "Growth Plan",
    tagline: "Full-scale corporate credit underwriting, deep skip-tracing, and multi-channel recovery.",
    price: 14999,
    popular: true,
    badge: "Recommended for Enterprises",
    features: [
      "5 User Seats included (Feature #17)",
      "250 Background Checks / mo across 18 adapters",
      "Find Someone (OmniTrace 360™) 100 Skip-Traces",
      "CALL All Time (1m, 2m, 5m, 30m, 1h cadences)",
      "Statutory Legal Notices (§43B(h) & GST §16(4))",
      "Dispute Resolution Center fast-track docket",
      "Add Additional Company Name support",
      "Dedicated Account Manager",
    ],
    ctaText: "Subscribe to Growth Plan",
  },
  {
    id: "enterprise",
    priceKey: "enterprise_subscription",
    name: "Enterprise Plan",
    tagline: "Institutional volume, unlimited seats, custom integrations, and dedicated arbitrator desk.",
    price: 39999,
    features: [
      "Unlimited Concurrent User Seats",
      "Unlimited Business Background Verifications",
      "Unlimited OmniTrace 360™ Skip-Tracing",
      "Dedicated Fast-Track Arbitrator Chamber",
      "Direct API & Webhook ERP Integration",
      "White-Glove Legal Recovery Team & Notice Servers",
      "Statutory 20.25% Compound Interest Engine",
      "24/7 SLA Priority Legal Desk",
    ],
    ctaText: "Choose Enterprise Plan",
  },
];

interface SubscriptionScreenProps {
  onSuccessSubscribe?: () => void;
  onCustomerLoginSuccess?: (email: string) => void;
  onClose?: () => void;
}

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({
  onSuccessSubscribe,
  onCustomerLoginSuccess,
  onClose,
}) => {
  const { theme } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(SUBSCRIPTION_PLANS[1]);
  const [userSeatsAddon, setUserSeatsAddon] = useState<number>(0);
  const [companiesAddon, setCompaniesAddon] = useState<number>(0);

  const [gatewayOpen, setGatewayOpen] = useState<boolean>(false);
  const [paymentTab, setPaymentTab] = useState<"upi" | "card" | "netbanking" | "neft">("upi");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [txnRef, setTxnRef] = useState<string>("");

  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [modalEmail, setModalEmail] = useState<string>("trade.ops@acmetraders.in");
  const [modalPassword, setModalPassword] = useState<string>("ChaanBeanPass2026!");
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const seatAddonCost = userSeatsAddon * 999;
  const companyAddonCost = companiesAddon * 1500;
  const subtotal = selectedPlan.price + seatAddonCost + companyAddonCost;
  const gstAmount = Math.round(subtotal * 0.18);
  const totalAmount = subtotal + gstAmount;

  const handleOpenGateway = () => {
    setGatewayOpen(true);
    setPaymentSuccess(false);
  };

  const handleExecutePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setPaymentSuccess(true);
      setTxnRef(`TXN-CB-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`);
      setTimeout(() => {
        setGatewayOpen(false);
        if (onSuccessSubscribe) {
          onSuccessSubscribe();
        }
      }, 1600);
    }, 1400);
  };

  const handleCustomerLogin = () => {
    setModalLoading(true);
    setModalError(null);
    setTimeout(() => {
      setModalLoading(false);
      if (modalEmail.trim().length > 3) {
        setLoginModalOpen(false);
        if (onCustomerLoginSuccess) {
          onCustomerLoginSuccess(modalEmail);
        }
      } else {
        setModalError("Invalid credentials. Please verify your registered enterprise email.");
      }
    }, 900);
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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <View style={[styles.statusBadge, { backgroundColor: theme.brand + "18" }]}>
                <Ionicons name="shield-checkmark" size={12} color={theme.brand} style={{ marginRight: 4 }} />
                <Text style={[styles.statusBadgeText, { color: theme.brand }]}>
                  MANDATORY SUBSCRIPTION GATEWAY
                </Text>
              </View>
              <Text style={[styles.heroTitle, { color: theme.text }]}>
                Choose Your Enterprise Tier
              </Text>
              <Text style={[styles.heroSub, { color: theme.textSecondary }]}>
                Institutional credit underwriting, 18 statutory adapters, and high-frequency legal recovery.
              </Text>
            </View>
          </View>

          <View style={[styles.existingCustBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.existingTitle, { color: theme.text }]}>Already a Customer?</Text>
              <Text style={[styles.existingDesc, { color: theme.textMuted }]}>
                Sign in with your registered enterprise credentials to access live dashboard directly.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setLoginModalOpen(true)}
              style={[styles.loginBtn, { backgroundColor: theme.brand }]}
            >
              <Ionicons name="log-in-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.loginBtnText}>Customer Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          SUBSCRIPTION TIERS (MONTHLY)
        </Text>

        {SUBSCRIPTION_PLANS.map((plan) => {
          const isSelected = selectedPlan.id === plan.id;
          return (
            <TouchableOpacity
              key={plan.id}
              activeOpacity={0.9}
              onPress={() => setSelectedPlan(plan)}
              style={[
                styles.planCard,
                {
                  backgroundColor: theme.card,
                  borderColor: isSelected ? theme.brand : theme.cardBorder,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
            >
              {plan.badge && (
                <View style={[styles.popularTag, { backgroundColor: theme.brand }]}>
                  <Text style={styles.popularTagText}>{plan.badge.toUpperCase()}</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <View>
                  <Text style={[styles.planName, { color: theme.text }]}>{plan.name}</Text>
                  <Text style={[styles.planTagline, { color: theme.textMuted }]}>{plan.tagline}</Text>
                </View>
                <View style={styles.priceCol}>
                  <Text style={[styles.priceNum, { color: theme.brand }]}>
                    ₹{plan.price.toLocaleString("en-IN")}
                  </Text>
                  <Text style={[styles.pricePeriod, { color: theme.textMuted }]}>/ month + 18% GST</Text>
                </View>
              </View>

              <View style={styles.featuresList}>
                {plan.features.map((f, idx) => (
                  <View key={idx} style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={15} color={theme.green} style={{ marginRight: 8 }} />
                    <Text style={[styles.featureText, { color: theme.text }]}>{f}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => {
                  setSelectedPlan(plan);
                  handleOpenGateway();
                }}
                style={[
                  styles.ctaButton,
                  {
                    backgroundColor: isSelected ? theme.brand : theme.surfaceSecondary,
                    borderColor: isSelected ? theme.brand : theme.cardBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.ctaButtonText,
                    { color: isSelected ? "#FFFFFF" : theme.text },
                  ]}
                >
                  {plan.ctaText}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={isSelected ? "#FFFFFF" : theme.text}
                  style={{ marginLeft: 6 }}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        <View style={[styles.addonCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.addonTitle, { color: theme.text }]}>Optional Seat & Entity Add-Ons</Text>
          <Text style={[styles.addonSub, { color: theme.textMuted }]}>
            Expand concurrent operators or add trade subsidiaries without upgrading your tier.
          </Text>

          <View style={[styles.addonRow, { borderBottomColor: theme.cardBorder }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.addonItemName, { color: theme.text }]}>User Access (Per Seat Add-On)</Text>
              <Text style={[styles.addonPriceTag, { color: theme.brand }]}>₹999 / user / month</Text>
            </View>
            <View style={styles.counterRow}>
              <TouchableOpacity
                onPress={() => setUserSeatsAddon(Math.max(0, userSeatsAddon - 1))}
                style={[styles.counterBtn, { backgroundColor: theme.surfaceSecondary }]}
              >
                <Ionicons name="remove" size={16} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.counterVal, { color: theme.text }]}>{userSeatsAddon}</Text>
              <TouchableOpacity
                onPress={() => setUserSeatsAddon(userSeatsAddon + 1)}
                style={[styles.counterBtn, { backgroundColor: theme.surfaceSecondary }]}
              >
                <Ionicons name="add" size={16} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.addonRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.addonItemName, { color: theme.text }]}>Add Additional Company Name</Text>
              <Text style={[styles.addonPriceTag, { color: theme.brand }]}>₹1,500 / entity / month</Text>
            </View>
            <View style={styles.counterRow}>
              <TouchableOpacity
                onPress={() => setCompaniesAddon(Math.max(0, companiesAddon - 1))}
                style={[styles.counterBtn, { backgroundColor: theme.surfaceSecondary }]}
              >
                <Ionicons name="remove" size={16} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.counterVal, { color: theme.text }]}>{companiesAddon}</Text>
              <TouchableOpacity
                onPress={() => setCompaniesAddon(companiesAddon + 1)}
                style={[styles.counterBtn, { backgroundColor: theme.surfaceSecondary }]}
              >
                <Ionicons name="add" size={16} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.summaryTitle, { color: theme.text }]}>Billing Summary</Text>

          <View style={styles.sumRow}>
            <Text style={[styles.sumLabel, { color: theme.textSecondary }]}>{selectedPlan.name}</Text>
            <Text style={[styles.sumVal, { color: theme.text }]}>₹{selectedPlan.price.toLocaleString("en-IN")}</Text>
          </View>

          {userSeatsAddon > 0 && (
            <View style={styles.sumRow}>
              <Text style={[styles.sumLabel, { color: theme.textSecondary }]}>
                {userSeatsAddon} Additional Seat(s)
              </Text>
              <Text style={[styles.sumVal, { color: theme.text }]}>₹{seatAddonCost.toLocaleString("en-IN")}</Text>
            </View>
          )}

          {companiesAddon > 0 && (
            <View style={styles.sumRow}>
              <Text style={[styles.sumLabel, { color: theme.textSecondary }]}>
                {companiesAddon} Additional Company Name(s)
              </Text>
              <Text style={[styles.sumVal, { color: theme.text }]}>₹{companyAddonCost.toLocaleString("en-IN")}</Text>
            </View>
          )}

          <View style={styles.sumRow}>
            <Text style={[styles.sumLabel, { color: theme.textSecondary }]}>Statutory GST (18%)</Text>
            <Text style={[styles.sumVal, { color: theme.text }]}>₹{gstAmount.toLocaleString("en-IN")}</Text>
          </View>

          <View style={[styles.sumTotalRow, { borderTopColor: theme.cardBorder }]}>
            <Text style={[styles.sumTotalLabel, { color: theme.text }]}>Total Due Today</Text>
            <Text style={[styles.sumTotalVal, { color: theme.brand }]}>₹{totalAmount.toLocaleString("en-IN")}</Text>
          </View>

          <TouchableOpacity
            onPress={handleOpenGateway}
            style={[styles.proceedBtn, { backgroundColor: theme.brand }]}
          >
            <Ionicons name="lock-closed" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.proceedBtnText}>Proceed to Secure Payment Gateway</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={gatewayOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.gatewaySheet, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.sheetTop}>
              <View>
                <Text style={[styles.sheetTitle, { color: theme.text }]}>ChaanBean PayGateway</Text>
                <Text style={[styles.sheetSub, { color: theme.textMuted }]}>
                  Order Amount: ₹{totalAmount.toLocaleString("en-IN")} (incl. 18% GST)
                </Text>
              </View>
              <TouchableOpacity onPress={() => setGatewayOpen(false)} style={styles.closeSheetBtn}>
                <Ionicons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.methodTabs}>
              {[
                { key: "upi", label: "UPI Instant", icon: "qr-code-outline" },
                { key: "card", label: "Cards", icon: "card-outline" },
                { key: "netbanking", label: "NetBanking", icon: "business-outline" },
                { key: "neft", label: "RTGS/NEFT", icon: "receipt-outline" },
              ].map((m) => (
                <TouchableOpacity
                  key={m.key}
                  onPress={() => setPaymentTab(m.key as any)}
                  style={[
                    styles.methodChip,
                    {
                      backgroundColor: paymentTab === m.key ? theme.brand : theme.surfaceSecondary,
                      borderColor: paymentTab === m.key ? theme.brand : theme.cardBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name={m.icon as any}
                    size={14}
                    color={paymentTab === m.key ? "#FFFFFF" : theme.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.methodText,
                      { color: paymentTab === m.key ? "#FFFFFF" : theme.text },
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {paymentSuccess ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={56} color={theme.green} />
                <Text style={[styles.successTitle, { color: theme.green }]}>Payment Confirmed!</Text>
                <Text style={[styles.successTxn, { color: theme.text }]}>{txnRef}</Text>
                <Text style={[styles.successDesc, { color: theme.textMuted }]}>
                  Activating your {selectedPlan.name} enterprise subscription... Redirecting to Command Desk.
                </Text>
              </View>
            ) : (
              <View style={styles.gatewayBody}>
                {paymentTab === "upi" && (
                  <View style={[styles.upiBox, { backgroundColor: theme.surfaceSecondary }]}>
                    <Ionicons name="qr-code" size={72} color={theme.brand} />
                    <Text style={[styles.upiIdText, { color: theme.text }]}>chaanbean.merchant@icici</Text>
                    <Text style={[styles.upiHint, { color: theme.textMuted }]}>
                      Scan with any UPI app (PhonePe, GooglePay, Paytm, CRED) or enter your VPA:
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.card, borderColor: theme.cardBorder, color: theme.text }]}
                      placeholder="username@okaxis / mobile@upi"
                      placeholderTextColor={theme.textMuted}
                      defaultValue="acme.ops@okhdfcbank"
                    />
                  </View>
                )}

                {paymentTab === "card" && (
                  <View style={{ gap: 10 }}>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.card, borderColor: theme.cardBorder, color: theme.text }]}
                      placeholder="Card Number (XXXX XXXX XXXX XXXX)"
                      placeholderTextColor={theme.textMuted}
                      defaultValue="4532 8192 0019 4912"
                    />
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TextInput
                        style={[styles.input, { flex: 1, backgroundColor: theme.card, borderColor: theme.cardBorder, color: theme.text }]}
                        placeholder="MM/YY"
                        placeholderTextColor={theme.textMuted}
                        defaultValue="08/29"
                      />
                      <TextInput
                        style={[styles.input, { flex: 1, backgroundColor: theme.card, borderColor: theme.cardBorder, color: theme.text }]}
                        placeholder="CVV"
                        placeholderTextColor={theme.textMuted}
                        defaultValue="892"
                        secureTextEntry
                      />
                    </View>
                  </View>
                )}

                {paymentTab === "netbanking" && (
                  <View style={{ gap: 8 }}>
                    {["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank"].map((b, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[styles.bankItem, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder }]}
                      >
                        <Ionicons name="business" size={16} color={theme.brand} style={{ marginRight: 8 }} />
                        <Text style={[styles.bankName, { color: theme.text }]}>{b}</Text>
                        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} style={{ marginLeft: "auto" }} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {paymentTab === "neft" && (
                  <View style={[styles.neftBox, { backgroundColor: theme.surfaceSecondary }]}>
                    <Text style={[styles.neftTitle, { color: theme.text }]}>Virtual Corporate Escrow Account</Text>
                    <Text style={[styles.neftRow, { color: theme.textSecondary }]}>Account: CHAANBEAN ENTERPRISE TECH</Text>
                    <Text style={[styles.neftRow, { color: theme.textSecondary }]}>A/C Number: 924020019283019</Text>
                    <Text style={[styles.neftRow, { color: theme.textSecondary }]}>IFSC: ICIC0000004 (Nariman Point, Mumbai)</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleExecutePayment}
                  disabled={isProcessing}
                  style={[styles.payNowBtn, { backgroundColor: theme.brand }]}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.payNowText}>
                        Authorize Payment · ₹{totalAmount.toLocaleString("en-IN")}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={loginModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.loginSheet, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.sheetTop}>
              <View>
                <Text style={[styles.sheetTitle, { color: theme.text }]}>Enterprise Customer Sign-In</Text>
                <Text style={[styles.sheetSub, { color: theme.textMuted }]}>
                  Access your active subscription & counterparties
                </Text>
              </View>
              <TouchableOpacity onPress={() => setLoginModalOpen(false)} style={styles.closeSheetBtn}>
                <Ionicons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            {modalError && (
              <View style={[styles.errorBox, { backgroundColor: theme.redBg, borderColor: theme.redBorder }]}>
                <Ionicons name="alert-circle" size={16} color={theme.red} style={{ marginRight: 6 }} />
                <Text style={[styles.errorText, { color: theme.red }]}>{modalError}</Text>
              </View>
            )}

            <View style={{ gap: 12, marginVertical: 14 }}>
              <View>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Registered Work Email</Text>
                <TextInput
                  value={modalEmail}
                  onChangeText={setModalEmail}
                  style={[styles.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder, color: theme.text }]}
                  placeholder="name@company.com"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Password</Text>
                <TextInput
                  value={modalPassword}
                  onChangeText={setModalPassword}
                  secureTextEntry
                  style={[styles.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.cardBorder, color: theme.text }]}
                  placeholder="••••••••••••"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleCustomerLogin}
              disabled={modalLoading}
              style={[styles.payNowBtn, { backgroundColor: theme.brand }]}
            >
              {modalLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="log-in" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.payNowText}>Sign In to Dashboard</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  heroTop: {
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  existingCustBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  existingTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  existingDesc: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
    paddingRight: 8,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  planCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    position: "relative",
  },
  popularTag: {
    position: "absolute",
    top: -10,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  popularTagText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  planName: {
    fontSize: 16,
    fontWeight: "800",
  },
  planTagline: {
    fontSize: 11,
    marginTop: 2,
    maxWidth: 190,
    lineHeight: 15,
  },
  priceCol: {
    alignItems: "flex-end",
  },
  priceNum: {
    fontSize: 18,
    fontWeight: "900",
  },
  pricePeriod: {
    fontSize: 9,
    marginTop: 2,
  },
  featuresList: {
    gap: 6,
    marginBottom: 14,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureText: {
    fontSize: 12,
    fontWeight: "500",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  ctaButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  addonCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  addonTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  addonSub: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 12,
  },
  addonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  addonItemName: {
    fontSize: 12,
    fontWeight: "700",
  },
  addonPriceTag: {
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  counterVal: {
    fontSize: 13,
    fontWeight: "800",
    minWidth: 16,
    textAlign: "center",
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },
  sumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sumLabel: {
    fontSize: 12,
  },
  sumVal: {
    fontSize: 12,
    fontWeight: "700",
  },
  sumTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 6,
    marginBottom: 14,
  },
  sumTotalLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  sumTotalVal: {
    fontSize: 18,
    fontWeight: "900",
  },
  proceedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
  proceedBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  gatewaySheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: "85%",
  },
  loginSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  sheetTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  sheetSub: {
    fontSize: 11,
    marginTop: 2,
  },
  closeSheetBtn: {
    padding: 4,
  },
  methodTabs: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 16,
  },
  methodChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  methodText: {
    fontSize: 10,
    fontWeight: "700",
  },
  gatewayBody: {
    gap: 14,
  },
  upiBox: {
    borderRadius: 14,
    alignItems: "center",
    padding: 16,
    gap: 8,
  },
  upiIdText: {
    fontSize: 12,
    fontWeight: "800",
  },
  upiHint: {
    fontSize: 10,
    textAlign: "center",
    lineHeight: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    width: "100%",
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  bankItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  bankName: {
    fontSize: 12,
    fontWeight: "700",
  },
  neftBox: {
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  neftTitle: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4,
  },
  neftRow: {
    fontSize: 11,
  },
  payNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 6,
  },
  payNowText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  successBox: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 10,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  successTxn: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  successDesc: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
});
