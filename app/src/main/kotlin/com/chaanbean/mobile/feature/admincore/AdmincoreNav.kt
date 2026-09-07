package com.chaanbean.mobile.feature.admincore

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.chaanbean.mobile.feature.admincore.ui.AdminCustomersScreen
import com.chaanbean.mobile.feature.admincore.ui.AdminFinancialsScreen
import com.chaanbean.mobile.feature.admincore.ui.AdminOverviewScreen

/** Prefixed with "admin/" so these never collide with the client-facing routes. */
object AdmincoreRoutes {
    const val OVERVIEW = "admin/overview"
    const val CUSTOMERS = "admin/customers"
    const val FINANCIALS = "admin/financials"
}

fun NavGraphBuilder.admincoreGraph(nav: NavHostController) {
    composable(AdmincoreRoutes.OVERVIEW) {
        AdminOverviewScreen(
            onOpenCustomers = { nav.navigate(AdmincoreRoutes.CUSTOMERS) },
            onOpenFinancials = { nav.navigate(AdmincoreRoutes.FINANCIALS) },
        )
    }
    composable(AdmincoreRoutes.CUSTOMERS) { AdminCustomersScreen() }
    composable(AdmincoreRoutes.FINANCIALS) { AdminFinancialsScreen() }
}
