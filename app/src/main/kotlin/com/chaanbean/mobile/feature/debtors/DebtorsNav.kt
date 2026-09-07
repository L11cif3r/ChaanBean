package com.chaanbean.mobile.feature.debtors

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.chaanbean.mobile.feature.debtors.ui.DebtorDetailScreen
import com.chaanbean.mobile.feature.debtors.ui.DebtorsScreen

object DebtorsRoutes {
    const val ARG_BUYER_ID = "buyerId"
    const val LIST = "debtors"
    const val DETAIL = "debtors/{buyerId}"

    fun detail(buyerId: String): String = "debtors/$buyerId"
}

fun NavGraphBuilder.debtorsGraph(nav: NavHostController) {
    composable(DebtorsRoutes.LIST) {
        DebtorsScreen(onOpenBuyer = { nav.navigate(DebtorsRoutes.detail(it)) })
    }
    composable(
        route = DebtorsRoutes.DETAIL,
        arguments = listOf(navArgument(DebtorsRoutes.ARG_BUYER_ID) { type = NavType.StringType }),
    ) { entry ->
        val buyerId = entry.arguments?.getString(DebtorsRoutes.ARG_BUYER_ID).orEmpty()
        DebtorDetailScreen(buyerId = buyerId, onBack = { nav.popBackStack() })
    }
}
