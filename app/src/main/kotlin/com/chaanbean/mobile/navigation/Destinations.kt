package com.chaanbean.mobile.navigation

import com.chaanbean.mobile.core.i18n.Strings
import com.chaanbean.mobile.feature.admincore.AdmincoreRoutes
import com.chaanbean.mobile.feature.admingrowth.AdminGrowthRoutes
import com.chaanbean.mobile.feature.arbitration.ArbitrationRoutes
import com.chaanbean.mobile.feature.auth.AuthRoutes
import com.chaanbean.mobile.feature.backgroundcheck.BackgroundCheckRoutes
import com.chaanbean.mobile.feature.dashboard.DashboardRoutes
import com.chaanbean.mobile.feature.debtors.DebtorsRoutes
import com.chaanbean.mobile.feature.recovery.RecoveryRoutes
import com.chaanbean.mobile.feature.search.SearchRoutes
import com.chaanbean.mobile.feature.settings.SettingsRoutes
import com.chaanbean.mobile.feature.trusthub.TrustHubRoutes
import com.chaanbean.mobile.feature.vendors.VendorsRoutes

/** One entry in the navigation drawer. */
data class Destination(
    val route: String,
    val title: String,
    val subtitle: String? = null,
)

data class DestinationGroup(
    val heading: String,
    val items: List<Destination>,
)

/**
 * The drawer mirrors main's own information architecture: the client-facing
 * product first, then the internal admin console, which main keeps under /admin.
 */
val DRAWER_GROUPS: List<DestinationGroup> = listOf(
    DestinationGroup(
        heading = "Credit & Recovery",
        items = listOf(
            Destination(DashboardRoutes.HOME, "Home", "Portfolio overview"),
            Destination(BusinessCheckEntry.ROUTE, "Business Check", "Verify and rate a business"),
            Destination(DebtorsRoutes.LIST, "Debtors", "Outstanding exposure"),
            Destination(RecoveryRoutes.WORKLIST, "Payment Recovery", "Escalation ladder"),
            Destination(ArbitrationRoutes.CASES, "Arbitration", "MSMED and legal"),
        ),
    ),
    DestinationGroup(
        heading = "Network & Verification",
        items = listOf(
            Destination(TrustHubRoutes.VERIFY, "Trust Hub", "Verify a Trust ID"),
            Destination(TrustHubRoutes.REGISTER, "Get a Trust ID", "Register your business"),
            Destination(TrustHubRoutes.DEFAULTS, "Community Defaults", "Peer-reported defaults"),
            Destination(VendorsRoutes.LIST, "Vendors", "Supplier trust registry"),
            Destination(BackgroundCheckRoutes.RUN, "Background Check", "Verification gateway"),
        ),
    ),
    DestinationGroup(
        heading = "Admin Console",
        items = listOf(
            Destination(AdmincoreRoutes.OVERVIEW, "Admin Overview"),
            Destination(AdmincoreRoutes.CUSTOMERS, "Customers"),
            Destination(AdmincoreRoutes.FINANCIALS, "Financials"),
            Destination(AdminGrowthRoutes.PIPELINE, "Sales Pipeline"),
            Destination(AdminGrowthRoutes.MARKETING, "Marketing"),
        ),
    ),
    DestinationGroup(
        heading = "You",
        items = listOf(
            Destination(SearchRoutes.HOME, "Search"),
            Destination(SettingsRoutes.SETTINGS, "Settings"),
            Destination(SettingsRoutes.DISPLAY, "Language & Appearance"),
            Destination(AuthRoutes.LOGIN, "Account"),
        ),
    ),
)

/** Routes that render without the app chrome (their own full-screen flow). */
val CHROMELESS_ROUTES: Set<String> = setOf(
    AuthRoutes.INTRO,
    AuthRoutes.LOGIN,
)

/**
 * Localized label for a destination, falling back to the English title when main
 * has no translation key for that screen (its table covers the nine sections it
 * shipped, not every route).
 */
fun localizedTitle(destination: Destination, s: Strings): String = when (destination.route) {
    DashboardRoutes.HOME -> s.dashboard
    TrustHubRoutes.VERIFY -> s.trustHub
    VendorsRoutes.LIST -> s.vendors
    BackgroundCheckRoutes.RUN -> s.backgroundCheck
    RecoveryRoutes.WORKLIST -> s.paymentRecovery
    DebtorsRoutes.LIST -> s.debtors
    ArbitrationRoutes.CASES -> s.arbitrationCenter
    SettingsRoutes.SETTINGS -> s.settings
    AdmincoreRoutes.OVERVIEW -> s.adminPortal
    SettingsRoutes.DISPLAY -> s.language
    else -> destination.title
}

fun titleForRoute(route: String?): String {
    if (route == null) return "ChaanBean"
    DRAWER_GROUPS.forEach { group ->
        group.items.firstOrNull { it.route == route }?.let { return it.title }
    }
    // Detail routes carry arguments; fall back to their section name.
    return when {
        route.startsWith("business-check") -> "Business Check"
        route.startsWith("debtors") -> "Debtor"
        route.startsWith("recovery") -> "Payment Recovery"
        route.startsWith("arbitration") -> "Arbitration"
        route.startsWith("trusthub") -> "Trust Hub"
        route.startsWith("background-check") -> "Background Check"
        route.startsWith("settings") -> "Settings"
        route.startsWith("admin") -> "Admin"
        else -> "ChaanBean"
    }
}
