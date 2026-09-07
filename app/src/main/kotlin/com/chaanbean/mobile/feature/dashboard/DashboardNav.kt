package com.chaanbean.mobile.feature.dashboard

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.chaanbean.mobile.feature.dashboard.ui.DashboardScreen

object DashboardRoutes {
    const val HOME = "dashboard"
}

/**
 * The landing destination. It is a leaf on purpose: cross-links into other
 * features would couple this graph to route strings those features own.
 */
fun NavGraphBuilder.dashboardGraph(nav: NavHostController) {
    composable(DashboardRoutes.HOME) { DashboardScreen() }
}
