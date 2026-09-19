import React, { useState } from "react";
import { View, StyleSheet, SafeAreaView, StatusBar, Platform } from "react-native";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import { HeaderBar } from "./src/components/HeaderBar";
import { BottomTabBar, TabKey } from "./src/components/BottomTabBar";
import { HomeScreen } from "./src/screens/HomeScreen";
import { VerificationScreen } from "./src/screens/VerificationScreen";
import { FindSomeoneScreen } from "./src/screens/FindSomeoneScreen";
import { RecoveryScreen } from "./src/screens/RecoveryScreen";
import { HubScreen } from "./src/screens/HubScreen";
import { DebtorsScreen } from "./src/screens/DebtorsScreen";
import { BusinessCheckScreen } from "./src/screens/BusinessCheckScreen";
import { ArbitrationScreen } from "./src/screens/ArbitrationScreen";
import { TrustHubScreen } from "./src/screens/TrustHubScreen";
import { AdminOSScreen } from "./src/screens/AdminOSScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { SubscriptionScreen } from "./src/screens/SubscriptionScreen";
import { MonitoringScreen } from "./src/screens/MonitoringScreen";
import { CollectionsScreen } from "./src/screens/CollectionsScreen";
import { LegalAdvisorsScreen } from "./src/screens/LegalAdvisorsScreen";
import { ReportsScreen } from "./src/screens/ReportsScreen";

function MainApp() {
  const { theme, isDark } = useTheme();
  const [currentTab, setCurrentTab] = useState<TabKey>("home");
  const [activeSubscreen, setActiveSubscreen] = useState<string | null>(null);
  const [targetBuyerId, setTargetBuyerId] = useState<string | undefined>(undefined);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(true);
  const [loggedInCustomer, setLoggedInCustomer] = useState<string | null>("trade.ops@acmetraders.in");

  const handleSelectTab = (tab: TabKey) => {
    setActiveSubscreen(null);
    setCurrentTab(tab);
  };

  const handleOpenHubSubscreen = (screenId: string) => {
    setActiveSubscreen(screenId);
  };

  const handleSelectBuyerFromHome = (buyerId: string) => {
    setTargetBuyerId(buyerId);
    setActiveSubscreen("debtors");
  };

  // Header Title & Subtitle based on active view
  let headerTitle = "ChaanBean";
  let headerSub = "MSME Credit & Recovery";

  if (activeSubscreen === "subscription") {
    headerTitle = "Subscription Gateway";
    headerSub = "3-Step Enterprise Onboarding";
  } else if (activeSubscreen === "monitoring") {
    headerTitle = "Continuous Radar";
    headerSub = "Post-Credit Security & EWS Signals";
  } else if (activeSubscreen === "collections") {
    headerTitle = "Collections Desk";
    headerSub = "Virtual Accounts & Invoicing Desk";
  } else if (activeSubscreen === "legal") {
    headerTitle = "Empanelled Counsel";
    headerSub = "High Court Recovery & Evidence Packs";
  } else if (activeSubscreen === "reports") {
    headerTitle = "Executive Audit";
    headerSub = "Debtor Aging & Recovery Velocity";
  } else if (activeSubscreen === "debtors") {
    headerTitle = "Debtors Portfolio";
    headerSub = "Green / Amber / Red Underwriting";
  } else if (activeSubscreen === "business-check") {
    headerTitle = "Financial Intelligence";
    headerSub = "12-Section Financial Dossier";
  } else if (activeSubscreen === "arbitration") {
    headerTitle = "Arbitration Center";
    headerSub = "MSMED Act §16 (20.25% p.a.)";
  } else if (activeSubscreen === "trust-hub") {
    headerTitle = "Trust Hub Registry";
    headerSub = "Digital Trust ID & Blacklist";
  } else if (activeSubscreen === "admin-os") {
    headerTitle = "Executive OS";
    headerSub = "7-Stage CRM & Ad ROI Intelligence";
  } else if (activeSubscreen === "settings") {
    headerTitle = "Platform Settings";
    headerSub = "Configuration & Gateway Health";
  } else if (currentTab === "verify") {
    headerTitle = "Background Check";
    headerSub = "18 Dedicated Statutory Adapters";
  } else if (currentTab === "trace") {
    headerTitle = "OmniTrace 360™";
    headerSub = "9-Vector Debtor Skip-Tracing";
  } else if (currentTab === "recovery") {
    headerTitle = "Tele-Recovery Desk";
    headerSub = "Asterisk PBX & Statutory Notices";
  } else if (currentTab === "more") {
    headerTitle = "Platform Hub";
    headerSub = "Specialized Enterprise Modules";
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.headerBg }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.headerBg}
      />

      <HeaderBar
        title={headerTitle}
        subtitle={headerSub}
        showBack={!!activeSubscreen}
        onBack={() => {
          setActiveSubscreen(null);
          setTargetBuyerId(undefined);
        }}
      />

      <View style={[styles.body, { backgroundColor: theme.background }]}>
        {/* Render Subscreen if active */}
        {activeSubscreen === "subscription" && (
          <SubscriptionScreen
            onClose={() => setActiveSubscreen(null)}
            onSuccessSubscribe={() => {
              setIsSubscribed(true);
              setActiveSubscreen(null);
            }}
            onCustomerLoginSuccess={(email) => {
              setLoggedInCustomer(email);
              setIsSubscribed(true);
              setActiveSubscreen(null);
            }}
          />
        )}
        {activeSubscreen === "monitoring" && (
          <MonitoringScreen
            onClose={() => setActiveSubscreen(null)}
            onSelectBuyer={(buyerId) => {
              setTargetBuyerId(buyerId);
              setActiveSubscreen("debtors");
            }}
          />
        )}
        {activeSubscreen === "collections" && (
          <CollectionsScreen onClose={() => setActiveSubscreen(null)} />
        )}
        {activeSubscreen === "legal" && (
          <LegalAdvisorsScreen onClose={() => setActiveSubscreen(null)} />
        )}
        {activeSubscreen === "reports" && (
          <ReportsScreen onClose={() => setActiveSubscreen(null)} />
        )}
        {activeSubscreen === "debtors" && (
          <DebtorsScreen
            initialBuyerId={targetBuyerId}
            onClose={() => {
              setActiveSubscreen(null);
              setTargetBuyerId(undefined);
            }}
          />
        )}
        {activeSubscreen === "business-check" && (
          <BusinessCheckScreen onClose={() => setActiveSubscreen(null)} />
        )}
        {activeSubscreen === "arbitration" && (
          <ArbitrationScreen onClose={() => setActiveSubscreen(null)} />
        )}
        {activeSubscreen === "trust-hub" && (
          <TrustHubScreen onClose={() => setActiveSubscreen(null)} />
        )}
        {activeSubscreen === "admin-os" && (
          <AdminOSScreen onClose={() => setActiveSubscreen(null)} />
        )}
        {activeSubscreen === "settings" && (
          <SettingsScreen onClose={() => setActiveSubscreen(null)} />
        )}

        {/* Otherwise render main bottom tab screen */}
        {!activeSubscreen && (
          <>
            {currentTab === "home" && (
              <HomeScreen
                onNavigateTab={handleSelectTab}
                onOpenHubSubscreen={handleOpenHubSubscreen}
                onSelectBuyer={handleSelectBuyerFromHome}
              />
            )}
            {currentTab === "verify" && <VerificationScreen />}
            {currentTab === "trace" && (
              <FindSomeoneScreen
                onDialNumber={(phone) => {
                  handleSelectTab("recovery");
                }}
              />
            )}
            {currentTab === "recovery" && <RecoveryScreen />}
            {currentTab === "more" && (
              <HubScreen onSelectSubscreen={handleOpenHubSubscreen} />
            )}
          </>
        )}
      </View>

      <BottomTabBar currentTab={currentTab} onSelectTab={handleSelectTab} />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  body: {
    flex: 1,
  },
});
